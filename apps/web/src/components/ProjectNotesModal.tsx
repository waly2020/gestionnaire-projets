import * as React from 'react'
import { Button } from '@workspace/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'
import { StickyNote } from 'lucide-react'
import editorSrc from '@celsowm/markdown-wysiwyg/dist/editor.js?raw'
import '@celsowm/markdown-wysiwyg/dist/editor.css'
import { parse as markedParse } from 'marked'

// Le package n'a aucun export ES — on extrait la classe depuis le source brut.
// On lui injecte marked pour activer la conversion Markdown→HTML complète (tableaux, GFM).
interface WYSIWYGOptions {
  initialValue?: string
  showToolbar?: boolean
  initialMode?: 'wysiwyg' | 'markdown'
}
interface WYSIWYGEditor {
  getValue(): string
  setValue(markdown: string, isInitialSetup?: boolean): void
  destroy(): void
}
type WYSIWYGConstructor = new (elementId: string, options?: WYSIWYGOptions) => WYSIWYGEditor

// L'éditeur vérifie `typeof marked` et appelle `marked.parse(src, opts)` si disponible
const markedCompat = { parse: (src: string) => markedParse(src, { gfm: true, breaks: false }) as string }
const MarkdownWYSIWYG = new Function('marked', `${editorSrc}; return MarkdownWYSIWYG`)(markedCompat) as WYSIWYGConstructor

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectName: string
  notes: string
  onSave: (notes: string) => void
}

export function ProjectNotesModal({ open, onOpenChange, projectName, notes, onSave }: Props) {
  const editorRef = React.useRef<WYSIWYGEditor | null>(null)
  const uid = React.useId().replace(/:/g, '')
  const initialNotesRef = React.useRef(notes)

  // Ref callback : s'exécute synchroniquement quand le div est attaché/détaché du DOM
  const setContainerRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) {
        editorRef.current?.destroy()
        editorRef.current = null
        return
      }
      const id = `md-wysiwyg-${uid}`
      node.id = id
      const editor = new MarkdownWYSIWYG(id, {
        initialValue: initialNotesRef.current,
        showToolbar: true,
        initialMode: 'wysiwyg',
      })
      editorRef.current = editor
    },
    [uid],
  )

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen && editorRef.current) {
      onSave(editorRef.current.getValue())
    }
    onOpenChange(isOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showClose={false}
        aria-describedby={undefined}
        className="w-[95vw] max-w-3xl max-h-[85vh] overflow-hidden p-0 flex flex-col gap-0"
      >
        <DialogHeader className="px-6 pt-5 pb-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg truncate">
            <StickyNote className="h-4 w-4 shrink-0 text-muted-foreground" />
            Notes — {projectName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto min-h-0 p-3">
          <div ref={setContainerRef} />
        </div>

        <div className="shrink-0 border-t bg-background px-6 py-3 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Sauvegarde automatique à la fermeture</p>
          <Button onClick={() => handleOpenChange(false)}>Fermer</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
