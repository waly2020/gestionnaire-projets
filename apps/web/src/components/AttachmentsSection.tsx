import * as React from 'react'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { Textarea } from '@workspace/ui/components/textarea'
import { Label } from '@workspace/ui/components/label'
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@workspace/ui/components/dialog'
import {
  Upload, Download, Trash2, FileText, FileImage, File,
  FileCode, X, Paperclip, Eye,
} from 'lucide-react'
import type { Attachment } from '../types'
import { saveBlob, getBlob, deleteBlob } from '../hooks/useFiles'
import { cn } from '@workspace/ui/lib/utils'

interface Props {
  attachments: Attachment[]
  onAdd: (attachment: Attachment) => void
  onDelete: (attachmentId: string) => void
}

interface PendingFile {
  file: File
  title: string
  description: string
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

function stripExtension(filename: string): string {
  return filename.replace(/\.[^/.]+$/, '')
}

function getFileIcon(mimeType: string, size: 'sm' | 'lg' = 'sm') {
  const cls = size === 'lg' ? 'h-16 w-16' : 'h-8 w-8'
  if (mimeType.startsWith('image/')) return <FileImage className={cn(cls, 'text-blue-500')} />
  if (mimeType === 'application/pdf') return <FileText className={cn(cls, 'text-red-500')} />
  if (mimeType.startsWith('text/') || mimeType.includes('json') || mimeType.includes('xml'))
    return <FileCode className={cn(cls, 'text-green-600')} />
  return <File className={cn(cls, 'text-muted-foreground')} />
}

export function AttachmentsSection({ attachments, onAdd, onDelete }: Props) {
  const [blobUrls, setBlobUrls] = React.useState<Record<string, string>>({})
  const [dragging, setDragging] = React.useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null)
  const [previewId, setPreviewId] = React.useState<string | null>(null)
  const [uploading, setUploading] = React.useState(false)
  const [pendingFiles, setPendingFiles] = React.useState<PendingFile[]>([])
  const [pendingOpen, setPendingOpen] = React.useState(false)
  const loadedIds = React.useRef<Set<string>>(new Set())
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Charge les aperçus image depuis IndexedDB
  React.useEffect(() => {
    const toLoad = attachments.filter(
      (a) => a.mimeType.startsWith('image/') && !loadedIds.current.has(a.id)
    )
    if (toLoad.length === 0) return
    let cancelled = false
    Promise.all(
      toLoad.map(async (a) => {
        const blob = await getBlob(a.id)
        return blob ? { id: a.id, url: URL.createObjectURL(blob) } : null
      })
    ).then((results) => {
      if (cancelled) { results.forEach((r) => r && URL.revokeObjectURL(r.url)); return }
      const newUrls: Record<string, string> = {}
      results.forEach((r) => { if (r) { newUrls[r.id] = r.url; loadedIds.current.add(r.id) } })
      if (Object.keys(newUrls).length > 0) setBlobUrls((prev) => ({ ...prev, ...newUrls }))
    })
    return () => { cancelled = true }
  }, [attachments])

  const queueFiles = (files: FileList | File[]) => {
    const pending: PendingFile[] = Array.from(files).map((file) => ({
      file,
      title: stripExtension(file.name),
      description: '',
    }))
    setPendingFiles(pending)
    setPendingOpen(true)
  }

  const confirmUpload = async () => {
    if (pendingFiles.length === 0) return
    setPendingOpen(false)
    setUploading(true)
    try {
      for (const { file, title, description } of pendingFiles) {
        const id = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
        await saveBlob(id, file)
        onAdd({
          id,
          name: file.name,
          title: title.trim() || stripExtension(file.name),
          description: description.trim() || undefined,
          size: file.size,
          mimeType: file.type || 'application/octet-stream',
          createdAt: new Date().toISOString(),
        })
      }
    } finally {
      setUploading(false)
      setPendingFiles([])
    }
  }

  const downloadFile = async (attachment: Attachment) => {
    const blob = await getBlob(attachment.id)
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = attachment.name
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDelete = async (id: string) => {
    if (confirmDeleteId !== id) { setConfirmDeleteId(id); return }
    await deleteBlob(id)
    onDelete(id)
    setConfirmDeleteId(null)
    if (previewId === id) setPreviewId(null)
    setBlobUrls((prev) => {
      const next = { ...prev }
      if (next[id]) URL.revokeObjectURL(next[id])
      delete next[id]
      return next
    })
    loadedIds.current.delete(id)
  }

  const previewAttachment = previewId ? attachments.find((a) => a.id === previewId) : null

  return (
    <div className="rounded-xl border bg-card p-5 mb-6">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Paperclip className="h-4 w-4 text-muted-foreground" />
          Pièces jointes
          <span className="text-muted-foreground font-normal">({attachments.length})</span>
        </h3>
        <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={uploading}>
          <Upload className="h-4 w-4" />
          {uploading ? 'Envoi…' : 'Ajouter'}
        </Button>
        <input ref={inputRef} type="file" multiple className="hidden"
          onChange={(e) => e.target.files && queueFiles(e.target.files)} />
      </div>

      {/* Zone drag-and-drop */}
      <div
        className={cn(
          'flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-5 transition-colors cursor-pointer mb-5',
          dragging ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/40 text-muted-foreground'
        )}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files.length) queueFiles(e.dataTransfer.files) }}
      >
        <Upload className="h-5 w-5 mb-1.5" />
        <p className="text-sm">Glisser-déposer ou cliquer pour choisir</p>
        <p className="text-xs mt-0.5 opacity-70">Images, PDF, fichiers texte, et autres</p>
      </div>

      {/* Grille de cartes */}
      {attachments.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {attachments.map((attachment) => {
            const isImage = attachment.mimeType.startsWith('image/')
            const previewUrl = blobUrls[attachment.id]
            const isDeleting = confirmDeleteId === attachment.id

            return (
              <div
                key={attachment.id}
                className="group flex flex-col rounded-xl border bg-card overflow-hidden hover:shadow-md transition-all duration-200"
              >
                {/* Thumbnail */}
                <div
                  className="relative aspect-video bg-muted overflow-hidden cursor-pointer shrink-0"
                  onClick={() => setPreviewId(attachment.id)}
                >
                  {isImage && previewUrl ? (
                    <>
                      <img
                        src={previewUrl}
                        alt={attachment.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center">
                        <Eye className="h-7 w-7 text-white drop-shadow opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                      </div>
                    </>
                  ) : (
                    <div className="h-full flex items-center justify-center gap-2 group-hover:scale-105 transition-transform duration-200">
                      {getFileIcon(attachment.mimeType)}
                    </div>
                  )}
                </div>

                {/* Contenu */}
                <div className="flex flex-col flex-1 p-3 gap-1.5 min-h-0">
                  <p className="text-sm font-semibold truncate" title={attachment.title}>
                    {attachment.title}
                  </p>
                  {attachment.description ? (
                    <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                      {attachment.description}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground/50 italic">Aucune description</p>
                  )}
                  <p className="text-[11px] text-muted-foreground mt-auto pt-1">
                    {formatSize(attachment.size)} · {new Date(attachment.createdAt).toLocaleDateString('fr-FR')}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 px-3 pb-3 pt-1 border-t">
                  <Button
                    size="xs"
                    variant="ghost"
                    className="gap-1.5 text-xs h-7"
                    onClick={() => setPreviewId(attachment.id)}
                  >
                    <Eye className="h-3.5 w-3.5" /> Voir
                  </Button>
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    className="h-7 w-7 ml-auto"
                    onClick={() => downloadFile(attachment)}
                    title="Télécharger"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  {isDeleting ? (
                    <div className="flex items-center gap-1">
                      <button
                        className="rounded bg-destructive/10 text-destructive text-[10px] px-1.5 py-1 hover:bg-destructive/20 transition-colors"
                        onClick={() => handleDelete(attachment.id)}
                      >Oui</button>
                      <button
                        className="rounded bg-muted text-[10px] px-1.5 py-1 hover:bg-muted/80 transition-colors"
                        onClick={() => setConfirmDeleteId(null)}
                      >Non</button>
                    </div>
                  ) : (
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(attachment.id)}
                      title="Supprimer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Modale de préview (image + infos) ────────────────────────────── */}
      <Dialog open={!!previewAttachment} onOpenChange={(open) => { if (!open) setPreviewId(null) }}>
        <DialogContent
          showClose={false}
          className="p-0 gap-0 max-w-5xl w-[95vw] overflow-hidden rounded-xl"
        >
          {previewAttachment && (
            <div className="flex flex-col md:flex-row max-h-[90vh]">
              {/* Panneau image (gauche) */}
              <div className="relative flex-1 bg-zinc-950 flex items-center justify-center min-h-55 md:min-h-0">
                {previewAttachment.mimeType.startsWith('image/') && blobUrls[previewAttachment.id] ? (
                  <img
                    src={blobUrls[previewAttachment.id]}
                    alt={previewAttachment.title}
                    className="max-w-full max-h-[50vh] md:max-h-[90vh] object-contain p-4"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3 py-12 px-8 text-center">
                    {getFileIcon(previewAttachment.mimeType, 'lg')}
                    <p className="text-zinc-400 text-sm">{previewAttachment.name}</p>
                  </div>
                )}
              </div>

              {/* Panneau info (droite) */}
              <div className="w-full md:w-80 flex flex-col bg-card border-t md:border-t-0 md:border-l">
                {/* Header panneau */}
                <div className="flex items-start justify-between gap-2 p-5 border-b">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">
                      {previewAttachment.mimeType.startsWith('image/') ? 'Image' : 'Fichier'}
                    </p>
                    <h2 className="font-semibold text-base leading-snug">{previewAttachment.title}</h2>
                  </div>
                  <DialogClose className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                    <X className="h-4 w-4" />
                  </DialogClose>
                </div>

                {/* Description + métadonnées (scrollable) */}
                <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
                  {previewAttachment.description ? (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        Description
                      </p>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {previewAttachment.description}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Aucune description</p>
                  )}

                  <div className="border-t pt-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Informations
                    </p>
                    <dl className="flex flex-col gap-1.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <dt className="text-xs text-muted-foreground">Fichier</dt>
                        <dd className="text-xs font-medium truncate max-w-40" title={previewAttachment.name}>
                          {previewAttachment.name}
                        </dd>
                      </div>
                      <div className="flex items-baseline justify-between gap-2">
                        <dt className="text-xs text-muted-foreground">Taille</dt>
                        <dd className="text-xs font-medium">{formatSize(previewAttachment.size)}</dd>
                      </div>
                      <div className="flex items-baseline justify-between gap-2">
                        <dt className="text-xs text-muted-foreground">Ajouté le</dt>
                        <dd className="text-xs font-medium">
                          {new Date(previewAttachment.createdAt).toLocaleDateString('fr-FR', {
                            day: '2-digit', month: 'long', year: 'numeric',
                          })}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>

                {/* Footer panneau */}
                <div className="p-4 border-t flex flex-col gap-2">
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => downloadFile(previewAttachment)}
                  >
                    <Download className="h-4 w-4" /> Télécharger
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      setPreviewId(null)
                      setTimeout(() => handleDelete(previewAttachment.id), 150)
                    }}
                  >
                    <Trash2 className="h-4 w-4" /> Supprimer
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Modale titre + description (à l'ajout) ───────────────────────── */}
      <Dialog open={pendingOpen} onOpenChange={(open) => { if (!open) { setPendingOpen(false); setPendingFiles([]) } }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {pendingFiles.length === 1 ? 'Informations du fichier' : `Informations des ${pendingFiles.length} fichiers`}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-5">
            {pendingFiles.map((pending, idx) => (
              <div key={idx} className="flex flex-col gap-3 rounded-lg border p-4">
                <div className="flex items-center gap-2.5">
                  {getFileIcon(pending.file.type || 'application/octet-stream')}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{pending.file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatSize(pending.file.size)}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`title-${idx}`}>
                    Titre <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id={`title-${idx}`}
                    value={pending.title}
                    onChange={(e) =>
                      setPendingFiles((prev) => prev.map((p, i) => i === idx ? { ...p, title: e.target.value } : p))
                    }
                    placeholder="Titre du fichier"
                    autoFocus={idx === 0}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`desc-${idx}`}>
                    Description
                    <span className="ml-1 text-muted-foreground font-normal text-xs">(optionnel)</span>
                  </Label>
                  <Textarea
                    id={`desc-${idx}`}
                    value={pending.description}
                    onChange={(e) =>
                      setPendingFiles((prev) => prev.map((p, i) => i === idx ? { ...p, description: e.target.value } : p))
                    }
                    placeholder="Description, contexte, notes…"
                    rows={3}
                    className="text-sm"
                  />
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setPendingOpen(false); setPendingFiles([]) }}>
              Annuler
            </Button>
            <Button onClick={confirmUpload} disabled={pendingFiles.some((p) => !p.title.trim())}>
              {pendingFiles.length === 1 ? 'Ajouter le fichier' : `Ajouter ${pendingFiles.length} fichiers`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
