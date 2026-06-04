import * as React from 'react'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { Textarea } from '@workspace/ui/components/textarea'
import { Label } from '@workspace/ui/components/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@workspace/ui/components/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@workspace/ui/components/dialog'
import {
  X, Plus, Check, Globe, Smartphone, Layers, Monitor, Database,
  Settings, Palette, Box, GitMerge, ChevronDown, ChevronUp, Trash2,
} from 'lucide-react'
import type { Project, ProjectStatus, ProjectType, Priority, Library, SubProject } from '../types'
import { cn } from '@workspace/ui/lib/utils'

const PROJECT_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#0ea5e9', '#64748b', '#a855f7', '#84cc16',
]

const TYPE_ICONS: Record<string, React.ReactNode> = {
  web: <Globe className="h-4 w-4" />,
  mobile: <Smartphone className="h-4 w-4" />,
  api: <Layers className="h-4 w-4" />,
  desktop: <Monitor className="h-4 w-4" />,
  data: <Database className="h-4 w-4" />,
  devops: <Settings className="h-4 w-4" />,
  design: <Palette className="h-4 w-4" />,
  other: <Box className="h-4 w-4" />,
}
const TYPE_LABELS: Record<string, string> = {
  web: 'Web', mobile: 'Mobile', api: 'API', desktop: 'Desktop',
  data: 'Data', devops: 'DevOps', design: 'Design', other: 'Autre',
}
const PRIORITY_COLORS: Record<string, string> = {
  low: '#22c55e', medium: '#eab308', high: '#f97316', critical: '#ef4444',
}
const PRIORITY_LABELS: Record<string, string> = {
  low: 'Basse', medium: 'Moyenne', high: 'Haute', critical: 'Critique',
}

type ProjectFormData = Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'todoLists'>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: ProjectFormData) => void
  initialData?: Partial<ProjectFormData>
  mode?: 'create' | 'edit'
  library?: Library
}

function generateId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

// ─── Tag input libre ──────────────────────────────────────────────────────────

function TagInput({ value, onChange, placeholder }: {
  value: string[]
  onChange: (v: string[]) => void
  placeholder: string
}) {
  const [input, setInput] = React.useState('')
  const add = () => {
    const t = input.trim()
    if (t && !value.includes(t)) onChange([...value, t])
    setInput('')
  }
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-1.5">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder={placeholder}
          className="h-8 text-xs"
        />
        <Button type="button" size="sm" variant="outline" onClick={add} className="h-8 px-2.5 text-xs shrink-0">
          Ajouter
        </Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map((tag) => (
            <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">
              {tag}
              <button type="button" onClick={() => onChange(value.filter((v) => v !== tag))} className="text-muted-foreground hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Chips de sélection bibliothèque ─────────────────────────────────────────

function LibraryChips({ label, items, selected, onToggle, getColor }: {
  label: string
  items: { id: string; name: string }[]
  selected: string[]
  onToggle: (name: string) => void
  getColor: (name: string) => string | undefined
}) {
  if (items.length === 0) return null
  return (
    <div>
      <p className="text-[11px] text-muted-foreground mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => {
          const sel = selected.includes(item.name)
          const color = getColor(item.name)
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onToggle(item.name)}
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border transition-all',
                sel ? 'text-white' : 'bg-transparent border-border text-muted-foreground hover:border-foreground hover:text-foreground'
              )}
              style={sel && color ? { backgroundColor: color, borderColor: color } : sel ? { backgroundColor: '#6366f1', borderColor: '#6366f1' } : {}}
            >
              {sel && <Check className="h-2.5 w-2.5" />}
              {item.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Formulaire d'un sous-projet ─────────────────────────────────────────────

function SubProjectForm({ sp, index, library, onChange, onRemove }: {
  sp: SubProject
  index: number
  library?: Library
  onChange: (u: SubProject) => void
  onRemove: () => void
}) {
  const [expanded, setExpanded] = React.useState(true)
  const set = <K extends keyof SubProject>(k: K, v: SubProject[K]) => onChange({ ...sp, [k]: v })

  const toggleLang = (name: string) =>
    set('languages', sp.languages.includes(name) ? sp.languages.filter((l) => l !== name) : [...sp.languages, name])
  const toggleFw = (name: string) =>
    set('frameworks', sp.frameworks.includes(name) ? sp.frameworks.filter((f) => f !== name) : [...sp.frameworks, name])

  const selectedLangIds = sp.languages
    .map((n) => library?.languages.find((l) => l.name === n)?.id)
    .filter(Boolean) as string[]

  const relevantFws = library?.frameworks.filter((fw) =>
    selectedLangIds.length === 0 || fw.languageIds.length === 0 ||
    fw.languageIds.some((lid) => selectedLangIds.includes(lid))
  ) ?? []

  return (
    <div className="rounded-xl border bg-background overflow-hidden">
      {/* En-tête composant */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-muted/40 border-b">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Composant {index + 1}</span>
          {sp.name && <span className="text-sm font-semibold">— {sp.name}</span>}
          {sp.role && <span className="text-xs text-muted-foreground">({sp.role})</span>}
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setExpanded(!expanded)} className="p-1 rounded hover:bg-muted text-muted-foreground">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <button type="button" onClick={onRemove} className="p-1 rounded hover:bg-destructive/10 text-destructive">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="p-4 flex flex-col gap-4">
          {/* Nom + Rôle */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Nom du composant</Label>
              <Input value={sp.name} onChange={(e) => set('name', e.target.value)} placeholder="Ex : Frontend" className="h-9" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Rôle</Label>
              <Input value={sp.role} onChange={(e) => set('role', e.target.value)} placeholder="Ex : Interface utilisateur" className="h-9" />
            </div>
          </div>

          {/* Type (boutons visuels) */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Type</Label>
            <div className="grid grid-cols-8 gap-1.5">
              {(['web', 'mobile', 'api', 'desktop', 'data', 'devops', 'design', 'other'] as ProjectType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set('type', t)}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1 rounded-lg py-2 px-1 border text-[11px] font-medium transition-all',
                    sp.type === t
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                  )}
                >
                  {TYPE_ICONS[t]}
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {/* Langages + Frameworks sur 2 colonnes */}
          {library && (
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label className="text-xs">Langages</Label>
                <LibraryChips
                  label="Bibliothèque"
                  items={library.languages}
                  selected={sp.languages}
                  onToggle={toggleLang}
                  getColor={(n) => library.languages.find((l) => l.name === n)?.color}
                />
                <TagInput value={sp.languages} onChange={(v) => set('languages', v)} placeholder="Langage personnalisé..." />
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-xs">Frameworks & librairies</Label>
                {relevantFws.length > 0 && (
                  <LibraryChips
                    label={selectedLangIds.length > 0 ? 'Compatibles' : 'Bibliothèque'}
                    items={relevantFws}
                    selected={sp.frameworks}
                    onToggle={toggleFw}
                    getColor={(n) => library.frameworks.find((f) => f.name === n)?.color}
                  />
                )}
                <TagInput value={sp.frameworks} onChange={(v) => set('frameworks', v)} placeholder="Framework personnalisé..." />
              </div>
            </div>
          )}

          {/* Outils + Description */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Outils</Label>
              <TagInput value={sp.tools} onChange={(v) => set('tools', v)} placeholder="Ex : Docker, GitHub…" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Description (optionnel)</Label>
              <Input value={sp.description ?? ''} onChange={(e) => set('description', e.target.value)} placeholder="Description courte du composant…" className="h-9" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Valeur par défaut du formulaire ─────────────────────────────────────────

const defaultForm = (): ProjectFormData => ({
  name: '',
  description: '',
  status: 'active',
  priority: 'medium',
  type: 'web',
  color: PROJECT_COLORS[0],
  languages: [],
  frameworks: [],
  tools: [],
  tags: [],
  startDate: new Date().toISOString().split('T')[0],
  dueDate: '',
  isComposite: false,
  subProjects: [],
})

// ─── Modal principale ─────────────────────────────────────────────────────────

export function CreateProjectModal({ open, onOpenChange, onSubmit, initialData, mode = 'create', library }: Props) {
  const [form, setForm] = React.useState<ProjectFormData>(() => ({ ...defaultForm(), ...initialData }))

  React.useEffect(() => {
    if (open) setForm({ ...defaultForm(), ...initialData })
  }, [open, initialData])

  const set = <K extends keyof ProjectFormData>(key: K, value: ProjectFormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const toggleLang = (name: string) =>
    set('languages', form.languages.includes(name) ? form.languages.filter((l) => l !== name) : [...form.languages, name])

  const selectedLangIds = form.languages
    .map((name) => library?.languages.find((l) => l.name === name)?.id)
    .filter(Boolean) as string[]

  const relevantFrameworks = library?.frameworks.filter((fw) =>
    selectedLangIds.length === 0 || fw.languageIds.length === 0 ||
    fw.languageIds.some((lid) => selectedLangIds.includes(lid))
  ) ?? []

  const toggleFw = (name: string) =>
    set('frameworks', form.frameworks.includes(name) ? form.frameworks.filter((f) => f !== name) : [...form.frameworks, name])

  const toggleTag = (name: string) =>
    set('tags', form.tags.includes(name) ? form.tags.filter((t) => t !== name) : [...form.tags, name])

  const addSubProject = () => {
    const sp: SubProject = { id: generateId(), name: '', role: '', type: 'web', languages: [], frameworks: [], tools: [] }
    set('subProjects', [...(form.subProjects ?? []), sp])
  }
  const updateSubProject = (id: string, updated: SubProject) =>
    set('subProjects', (form.subProjects ?? []).map((sp) => sp.id === id ? updated : sp))
  const removeSubProject = (id: string) =>
    set('subProjects', (form.subProjects ?? []).filter((sp) => sp.id !== id))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    onSubmit({ ...form, dueDate: form.dueDate || undefined })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Largeur max 1500px, plein écran sur petits écrans */}
      <DialogContent className="w-[95vw] max-w-[1500px] max-h-[92vh] overflow-y-auto p-0">
        <DialogHeader className="px-8 pt-7 pb-2">
          <DialogTitle className="text-2xl">
            {mode === 'create' ? 'Nouveau projet' : 'Modifier le projet'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-8 pb-8 flex flex-col gap-0">

          {/* ══════════════════════════════════════════════
              SECTION 1 : IDENTITÉ
          ══════════════════════════════════════════════ */}
          <div className="py-6 flex flex-col gap-5">

            {/* Couleur + aperçu */}
            <div className="flex items-center gap-6">
              <div className="flex flex-col gap-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Couleur</Label>
                <div className="flex flex-wrap gap-2 max-w-52">
                  {PROJECT_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => set('color', color)}
                      className="h-7 w-7 rounded-full border-2 transition-all"
                      style={{
                        backgroundColor: color,
                        borderColor: form.color === color ? '#000' : 'transparent',
                        boxShadow: form.color === color ? `0 0 0 2px ${color}40` : 'none',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Aperçu dynamique */}
              <div className="flex items-center gap-3 pl-4 border-l">
                <div
                  className="h-12 w-12 rounded-xl shrink-0 flex items-center justify-center text-white shadow-sm"
                  style={{ backgroundColor: form.color }}
                >
                  {form.isComposite ? <GitMerge className="h-6 w-6" /> : TYPE_ICONS[form.type]}
                </div>
                <div>
                  <p className="font-semibold text-sm leading-tight">
                    {form.name || <span className="text-muted-foreground italic">Nom du projet</span>}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {form.isComposite ? 'Projet composite' : TYPE_LABELS[form.type]}
                  </p>
                </div>
              </div>
            </div>

            {/* Nom du projet — pleine largeur */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="proj-name" className="text-sm font-semibold">
                Nom du projet <span className="text-destructive">*</span>
              </Label>
              <Input
                id="proj-name"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Ex : Application Tontine"
                className="h-11 text-base"
                required
              />
            </div>

            {/* Description — pleine largeur */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="proj-desc" className="text-sm font-semibold">Description</Label>
              <Textarea
                id="proj-desc"
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Décrivez l'objectif, le contexte et les enjeux du projet…"
                rows={3}
                className="resize-none"
              />
            </div>

            {/* Type (boutons visuels) — pleine largeur, masqué si composite */}
            {!form.isComposite && (
              <div className="flex flex-col gap-1.5">
                <Label className="text-sm font-semibold">Type de projet</Label>
                <div className="grid grid-cols-8 gap-2">
                  {(['web', 'mobile', 'api', 'desktop', 'data', 'devops', 'design', 'other'] as ProjectType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => set('type', t)}
                      className={cn(
                        'flex flex-col items-center justify-center gap-1.5 rounded-xl py-3 border text-xs font-medium transition-all',
                        form.type === t
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                          : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-muted/30'
                      )}
                    >
                      {TYPE_ICONS[t]}
                      {TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Statut + Priorité + Dates sur une ligne */}
            <div className="grid grid-cols-4 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label className="text-sm font-semibold">Statut</Label>
                <Select value={form.status} onValueChange={(v) => set('status', v as ProjectStatus)}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Actif</SelectItem>
                    <SelectItem value="paused">En pause</SelectItem>
                    <SelectItem value="completed">Terminé</SelectItem>
                    <SelectItem value="archived">Archivé</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-sm font-semibold">Priorité</Label>
                <div className="flex gap-1.5 h-10">
                  {(['low', 'medium', 'high', 'critical'] as Priority[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => set('priority', p)}
                      className={cn(
                        'flex-1 rounded-lg text-xs font-semibold border transition-all',
                        form.priority === p ? 'text-white border-transparent' : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'
                      )}
                      style={form.priority === p ? { backgroundColor: PRIORITY_COLORS[p] } : {}}
                    >
                      {PRIORITY_LABELS[p]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="proj-start" className="text-sm font-semibold">Date de début</Label>
                <Input id="proj-start" type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} className="h-10" />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="proj-due" className="text-sm font-semibold">Date d'échéance</Label>
                <Input id="proj-due" type="date" value={form.dueDate ?? ''} onChange={(e) => set('dueDate', e.target.value)} className="h-10" />
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════
              SECTION 2 : PROJET COMPOSITE
          ══════════════════════════════════════════════ */}
          <div className="border-t pt-5 pb-5 flex flex-col gap-4">
            {/* Toggle composite — pleine largeur */}
            <button
              type="button"
              onClick={() => set('isComposite', !form.isComposite)}
              className={cn(
                'w-full flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-all',
                form.isComposite
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border hover:border-primary/30 hover:bg-muted/20'
              )}
            >
              {/* Switch */}
              <div className={cn(
                'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
                form.isComposite ? 'bg-primary' : 'bg-muted-foreground/30'
              )}>
                <span className={cn(
                  'inline-block h-5 w-5 rounded-full bg-white shadow transition-transform',
                  form.isComposite ? 'translate-x-5' : 'translate-x-0.5'
                )} />
              </div>

              <div
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors',
                  form.isComposite ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                )}
              >
                <GitMerge className="h-5 w-5" />
              </div>

              <div className="flex-1">
                <p className="font-semibold">Projet composite</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Regroupe plusieurs composants dans un seul projet — ex : Frontend React + Backend FastAPI, App Flutter + API NestJS…
                </p>
              </div>

              {form.isComposite && (
                <span className="shrink-0 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  Activé
                </span>
              )}
            </button>

            {/* Sous-projets */}
            {form.isComposite && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-muted-foreground">
                    Composants
                    <span className="ml-1.5 font-normal">
                      ({(form.subProjects ?? []).length})
                    </span>
                  </p>
                  <Button type="button" size="sm" variant="outline" onClick={addSubProject} className="gap-1.5">
                    <Plus className="h-3.5 w-3.5" /> Ajouter un composant
                  </Button>
                </div>

                {(form.subProjects ?? []).length === 0 ? (
                  <div className="rounded-xl border-2 border-dashed py-10 text-center">
                    <GitMerge className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm font-medium mb-1">Aucun composant défini</p>
                    <p className="text-xs text-muted-foreground mb-4">Commencez par ajouter le premier composant de votre projet</p>
                    <Button type="button" size="sm" variant="secondary" onClick={addSubProject} className="gap-1.5">
                      <Plus className="h-3.5 w-3.5" /> Ajouter le premier composant
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {(form.subProjects ?? []).map((sp, i) => (
                      <SubProjectForm
                        key={sp.id}
                        sp={sp}
                        index={i}
                        library={library}
                        onChange={(u) => updateSubProject(sp.id, u)}
                        onRemove={() => removeSubProject(sp.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ══════════════════════════════════════════════
              SECTION 3 : STACK TECHNOLOGIQUE
          ══════════════════════════════════════════════ */}
          <div className="border-t pt-5 pb-2 flex flex-col gap-5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {form.isComposite ? 'Stack globale du projet' : 'Stack technologique'}
            </p>

            {/* Langages + Frameworks côte à côte */}
            <div className="grid grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <Label className="text-sm font-semibold">Langages</Label>
                {library && (
                  <LibraryChips
                    label="Sélectionner depuis la bibliothèque"
                    items={library.languages}
                    selected={form.languages}
                    onToggle={toggleLang}
                    getColor={(n) => library.languages.find((l) => l.name === n)?.color}
                  />
                )}
                <TagInput value={form.languages} onChange={(v) => set('languages', v)} placeholder="Langage personnalisé…" />
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-sm font-semibold">Frameworks & librairies</Label>
                {library && relevantFrameworks.length > 0 && (
                  <LibraryChips
                    label={selectedLangIds.length > 0 ? 'Compatibles avec les langages sélectionnés' : 'Sélectionner depuis la bibliothèque'}
                    items={relevantFrameworks}
                    selected={form.frameworks}
                    onToggle={toggleFw}
                    getColor={(n) => library.frameworks.find((f) => f.name === n)?.color}
                  />
                )}
                <TagInput value={form.frameworks} onChange={(v) => set('frameworks', v)} placeholder="Framework personnalisé…" />
              </div>
            </div>

            {/* Outils + Tags côte à côte */}
            <div className="grid grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <Label className="text-sm font-semibold">Outils</Label>
                <TagInput value={form.tools} onChange={(v) => set('tools', v)} placeholder="Ex : Docker, GitHub, Figma…" />
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-sm font-semibold">Tags</Label>
                {library && library.badges.length > 0 && (
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-1.5">Tags prédéfinis</p>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {library.badges.map((badge) => {
                        const sel = form.tags.includes(badge.name)
                        return (
                          <button
                            key={badge.id}
                            type="button"
                            onClick={() => toggleTag(badge.name)}
                            className={cn(
                              'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border transition-all',
                              sel ? 'text-white' : 'bg-transparent border-border text-muted-foreground hover:border-foreground hover:text-foreground'
                            )}
                            style={sel ? { backgroundColor: badge.color, borderColor: badge.color } : {}}
                          >
                            {sel && <Check className="h-2.5 w-2.5" />}
                            {badge.name}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
                <TagInput value={form.tags} onChange={(v) => set('tags', v)} placeholder="Tag personnalisé…" />
              </div>
            </div>
          </div>

          {/* ── Footer ── */}
          <DialogFooter className="pt-6 border-t mt-2">
            <Button type="button" variant="outline" size="lg" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" size="lg">
              {mode === 'create' ? 'Créer le projet' : 'Enregistrer les modifications'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
