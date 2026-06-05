import * as React from 'react'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { Textarea } from '@workspace/ui/components/textarea'
import { Label } from '@workspace/ui/components/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@workspace/ui/components/dialog'
import { Upload, TextCursorInput, List, Plus, Trash2, Globe, Layers } from 'lucide-react'
import { parseTodoText, parseCsvText } from '../hooks/useProjects'
import { cn } from '@workspace/ui/lib/utils'
import type { SubProject } from '../types'

type Tab = 'paste' | 'file' | 'manual'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  subProjects?: SubProject[]
  defaultSubProjectId?: string
  onSubmit: (data: { title: string; items: string[]; subProjectId?: string }) => void
}

export function AddTodoListModal({ open, onOpenChange, subProjects, defaultSubProjectId, onSubmit }: Props) {
  const [tab, setTab] = React.useState<Tab>('paste')
  const [scopeId, setScopeId] = React.useState<string>(defaultSubProjectId ?? '')
  const [pasteText, setPasteText] = React.useState('')
  const [preview, setPreview] = React.useState<{ title: string; items: string[] } | null>(null)
  const [manualTitle, setManualTitle] = React.useState('')
  const [manualItems, setManualItems] = React.useState<string[]>([''])
  const [fileError, setFileError] = React.useState('')
  const fileRef = React.useRef<HTMLInputElement>(null)

  const isComposite = subProjects && subProjects.length > 0

  React.useEffect(() => {
    if (open) {
      setScopeId(defaultSubProjectId ?? '')
    } else {
      setPasteText('')
      setPreview(null)
      setManualTitle('')
      setManualItems([''])
      setFileError('')
      setTab('paste')
      setScopeId('')
    }
  }, [open, defaultSubProjectId])

  const parsePaste = () => {
    const result = parseTodoText(pasteText)
    setPreview(result)
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileError('')
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const result = file.name.endsWith('.csv') ? parseCsvText(text) : parseTodoText(text)
      setPreview(result)
    }
    reader.onerror = () => setFileError('Erreur de lecture du fichier')
    reader.readAsText(file)
  }

  const addManualItem = () => setManualItems((prev) => [...prev, ''])
  const updateManualItem = (i: number, val: string) =>
    setManualItems((prev) => prev.map((item, idx) => (idx === i ? val : item)))
  const removeManualItem = (i: number) =>
    setManualItems((prev) => prev.filter((_, idx) => idx !== i))

  const handleSubmit = () => {
    const subProjectId = scopeId === '' ? undefined : scopeId
    if (tab === 'manual') {
      const items = manualItems.filter((i) => i.trim())
      if (!manualTitle.trim() || items.length === 0) return
      onSubmit({ title: manualTitle.trim(), items, subProjectId })
    } else if (preview) {
      if (!preview.title || preview.items.length === 0) return
      onSubmit({ ...preview, subProjectId })
    }
    onOpenChange(false)
  }

  const canSubmit =
    tab === 'manual'
      ? manualTitle.trim() && manualItems.some((i) => i.trim())
      : preview && preview.title && preview.items.length > 0

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'paste', label: 'Coller du texte', icon: <TextCursorInput className="h-4 w-4" /> },
    { id: 'file', label: 'Importer un fichier', icon: <Upload className="h-4 w-4" /> },
    { id: 'manual', label: 'Saisie manuelle', icon: <List className="h-4 w-4" /> },
  ]

  const selectedSubProject = subProjects?.find((sp) => sp.id === scopeId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajouter une liste de tâches</DialogTitle>
        </DialogHeader>

        {/* Sélecteur de portée — projets composites uniquement */}
        {isComposite && (
          <div className="flex flex-col gap-1.5 rounded-lg border bg-muted/40 p-3">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Affecter à
            </Label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setScopeId('')}
                className={cn(
                  'flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors',
                  scopeId === ''
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-input bg-background hover:bg-muted'
                )}
              >
                <Globe className="h-3.5 w-3.5" />
                Global (projet entier)
              </button>
              {subProjects!.map((sp) => (
                <button
                  key={sp.id}
                  type="button"
                  onClick={() => setScopeId(sp.id)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors',
                    scopeId === sp.id
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-input bg-background hover:bg-muted'
                  )}
                >
                  <Layers className="h-3.5 w-3.5" />
                  {sp.name}
                  <span className={cn('text-xs', scopeId === sp.id ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                    · {sp.role}
                  </span>
                </button>
              ))}
            </div>
            {selectedSubProject && (
              <p className="text-xs text-muted-foreground">
                Cette liste sera rattachée au composant <strong>{selectedSubProject.name}</strong> ({selectedSubProject.role}).
              </p>
            )}
            {!selectedSubProject && (
              <p className="text-xs text-muted-foreground">
                Cette liste sera globale — visible dans la vue d'ensemble du projet.
              </p>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setPreview(null) }}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
                tab === t.id ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t.icon}
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Tab: Paste */}
        {tab === 'paste' && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Coller votre texte</Label>
              <p className="text-xs text-muted-foreground">
                La première ligne devient le titre de la liste. Les lignes suivantes (numérotées ou non) deviennent les tâches.
              </p>
              <Textarea
                value={pasteText}
                onChange={(e) => { setPasteText(e.target.value); setPreview(null) }}
                placeholder={`Liste des points remontés Test : 03/06/2026\n1. Premier point\n2. Deuxième point\n3. Troisième point`}
                rows={10}
                className="font-mono text-xs"
              />
            </div>
            <Button type="button" variant="outline" onClick={parsePaste} disabled={!pasteText.trim()}>
              Analyser le texte
            </Button>
            {preview && <PreviewSection preview={preview} />}
          </div>
        )}

        {/* Tab: File */}
        {tab === 'file' && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Importer un fichier .txt ou .csv</Label>
              <p className="text-xs text-muted-foreground">
                Fichier .txt : même format que le collage texte. Fichier .csv : première ligne = titre, reste = tâches.
              </p>
              <div
                className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-8 cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  const file = e.dataTransfer.files[0]
                  if (file) {
                    const fakeEvent = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>
                    handleFile(fakeEvent)
                  }
                }}
              >
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Glisser-déposer ou cliquer pour choisir</p>
                <p className="text-xs text-muted-foreground mt-1">.txt, .csv acceptés</p>
              </div>
              <input ref={fileRef} type="file" accept=".txt,.csv" className="hidden" onChange={handleFile} />
              {fileError && <p className="text-xs text-destructive">{fileError}</p>}
            </div>
            {preview && <PreviewSection preview={preview} />}
          </div>
        )}

        {/* Tab: Manual */}
        {tab === 'manual' && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="manual-title">Titre de la liste <span className="text-destructive">*</span></Label>
              <Input
                id="manual-title"
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
                placeholder="Ex : Bug report v1.2 - 04/06/2026"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Tâches</Label>
              {manualItems.map((item, i) => (
                <div key={i} className="flex gap-2">
                  <span className="flex h-9 w-6 items-center justify-center text-xs text-muted-foreground shrink-0">{i + 1}.</span>
                  <Input
                    value={item}
                    onChange={(e) => updateManualItem(i, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); addManualItem() }
                    }}
                    placeholder={`Tâche ${i + 1}`}
                  />
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => removeManualItem(i)}
                    disabled={manualItems.length === 1}
                    className="shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addManualItem} className="gap-1.5 self-start">
                <Plus className="h-4 w-4" /> Ajouter une tâche
              </Button>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            Créer la liste
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PreviewSection({ preview }: { preview: { title: string; items: string[] } }) {
  return (
    <div className="rounded-lg border bg-muted/40 p-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Aperçu</p>
      <p className="font-semibold text-sm mb-2">{preview.title}</p>
      {preview.items.length === 0 ? (
        <p className="text-xs text-muted-foreground">Aucune tâche détectée</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {preview.items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className="text-muted-foreground text-xs mt-0.5 w-4 shrink-0">{i + 1}.</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground mt-2">{preview.items.length} tâche(s) détectée(s)</p>
    </div>
  )
}
