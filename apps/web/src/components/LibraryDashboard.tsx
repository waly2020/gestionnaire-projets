import * as React from 'react'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@workspace/ui/components/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@workspace/ui/components/dialog'
import {
  Plus, Edit2, Trash2, Code2, Layers, Tag, Check, X, FolderOpen,
} from 'lucide-react'
import type { Language, Framework, BadgeTemplate, Library, Project, FrameworkCategory } from '../types'
import { NavHeader } from './NavHeader'
import { cn } from '@workspace/ui/lib/utils'
import type { AppView } from '../App'

const CATEGORY_LABELS: Record<FrameworkCategory, string> = {
  frontend: 'Frontend',
  backend: 'Backend',
  fullstack: 'Fullstack',
  mobile: 'Mobile',
  devops: 'DevOps',
  testing: 'Tests',
  style: 'Style / CSS',
  other: 'Autre',
}

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#eab308',
  '#22c55e', '#14b8a6', '#0ea5e9', '#64748b', '#a855f7', '#84cc16',
  '#f7df1e', '#3178c6', '#3572a5', '#b07219', '#7f52ff', '#fa7343',
  '#178600', '#00add8', '#dea584', '#4f5d95', '#00b4ab', '#e34c26',
]

interface Props {
  library: Library
  projects: Project[]
  onAddLanguage: (data: Omit<Language, 'id'>) => void
  onUpdateLanguage: (id: string, data: Partial<Omit<Language, 'id'>>) => void
  onDeleteLanguage: (id: string) => void
  onAddFramework: (data: Omit<Framework, 'id'>) => void
  onUpdateFramework: (id: string, data: Partial<Omit<Framework, 'id'>>) => void
  onDeleteFramework: (id: string) => void
  onAddBadge: (data: Omit<BadgeTemplate, 'id'>) => void
  onUpdateBadge: (id: string, data: Partial<Omit<BadgeTemplate, 'id'>>) => void
  onDeleteBadge: (id: string) => void
  onNavigate: (view: AppView) => void
}

// ─── Comptage de l'utilisation dans les projets ───────────────────────────────

function countLanguageUsage(projects: Project[], name: string) {
  return projects.filter((p) =>
    p.languages.includes(name) ||
    (p.subProjects ?? []).some((sp) => sp.languages.includes(name))
  ).length
}

function countFrameworkUsage(projects: Project[], name: string) {
  return projects.filter((p) =>
    p.frameworks.includes(name) ||
    (p.subProjects ?? []).some((sp) => sp.frameworks.includes(name))
  ).length
}

function countBadgeUsage(projects: Project[], name: string) {
  return projects.filter((p) => p.tags.includes(name)).length
}

// ─── Sélecteur de couleur ─────────────────────────────────────────────────────

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className="h-6 w-6 rounded-full border-2 transition-all"
            style={{
              backgroundColor: color,
              borderColor: value === color ? '#000' : 'transparent',
              boxShadow: value === color ? `0 0 0 2px ${color}40` : 'none',
            }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-12 cursor-pointer rounded border border-input p-0.5"
        />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-8 font-mono text-xs" />
      </div>
    </div>
  )
}

// ─── Dialog Langage ───────────────────────────────────────────────────────────

function LanguageDialog({
  open,
  onOpenChange,
  initial,
  onSave,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial?: Language
  onSave: (data: Omit<Language, 'id'>) => void
}) {
  const [name, setName] = React.useState('')
  const [color, setColor] = React.useState('#6366f1')

  React.useEffect(() => {
    if (open) {
      setName(initial?.name ?? '')
      setColor(initial?.color ?? '#6366f1')
    }
  }, [open, initial])

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onSave({ name: name.trim(), color })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{initial ? 'Modifier le langage' : 'Nouveau langage'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Nom</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : TypeScript" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Couleur</Label>
            <ColorPicker value={color} onChange={setColor} />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-sm font-medium">{name || 'Aperçu'}</span>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit">{initial ? 'Enregistrer' : 'Créer'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Dialog Framework ─────────────────────────────────────────────────────────

function FrameworkDialog({
  open,
  onOpenChange,
  initial,
  languages,
  onSave,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial?: Framework
  languages: Language[]
  onSave: (data: Omit<Framework, 'id'>) => void
}) {
  const [name, setName] = React.useState('')
  const [color, setColor] = React.useState('#6366f1')
  const [category, setCategory] = React.useState<FrameworkCategory>('frontend')
  const [selectedLangIds, setSelectedLangIds] = React.useState<string[]>([])

  React.useEffect(() => {
    if (open) {
      setName(initial?.name ?? '')
      setColor(initial?.color ?? '#6366f1')
      setCategory(initial?.category ?? 'frontend')
      setSelectedLangIds(initial?.languageIds ?? [])
    }
  }, [open, initial])

  const toggleLang = (id: string) => {
    setSelectedLangIds((prev) => prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id])
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onSave({ name: name.trim(), color, category, languageIds: selectedLangIds })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? 'Modifier le framework' : 'Nouveau framework'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Nom</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : React" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Catégorie</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as FrameworkCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(CATEGORY_LABELS) as FrameworkCategory[]).map((cat) => (
                    <SelectItem key={cat} value={cat}>{CATEGORY_LABELS[cat]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Couleur</Label>
            <ColorPicker value={color} onChange={setColor} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Langages associés</Label>
            <div className="flex flex-wrap gap-1.5">
              {languages.map((lang) => {
                const selected = selectedLangIds.includes(lang.id)
                return (
                  <button
                    key={lang.id}
                    type="button"
                    onClick={() => toggleLang(lang.id)}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border transition-all',
                      selected ? 'text-white' : 'border-border text-muted-foreground hover:border-foreground'
                    )}
                    style={selected ? { backgroundColor: lang.color, borderColor: lang.color } : {}}
                  >
                    {selected && <Check className="h-2.5 w-2.5" />}
                    {lang.name}
                  </button>
                )
              })}
            </div>
            <p className="text-[11px] text-muted-foreground">Laissez vide pour un outil universel (Docker, Kubernetes…)</p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit">{initial ? 'Enregistrer' : 'Créer'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Dialog Badge ─────────────────────────────────────────────────────────────

function BadgeDialog({
  open,
  onOpenChange,
  initial,
  onSave,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial?: BadgeTemplate
  onSave: (data: Omit<BadgeTemplate, 'id'>) => void
}) {
  const [name, setName] = React.useState('')
  const [color, setColor] = React.useState('#6366f1')

  React.useEffect(() => {
    if (open) {
      setName(initial?.name ?? '')
      setColor(initial?.color ?? '#6366f1')
    }
  }, [open, initial])

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onSave({ name: name.trim(), color })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{initial ? 'Modifier le badge' : 'Nouveau badge'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Nom</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : Production" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Couleur</Label>
            <ColorPicker value={color} onChange={setColor} />
          </div>
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
              style={{ backgroundColor: color }}
            >
              {name || 'Aperçu'}
            </span>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit">{initial ? 'Enregistrer' : 'Créer'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

type Tab = 'languages' | 'frameworks' | 'badges'

export function LibraryDashboard({
  library,
  projects,
  onAddLanguage,
  onUpdateLanguage,
  onDeleteLanguage,
  onAddFramework,
  onUpdateFramework,
  onDeleteFramework,
  onAddBadge,
  onUpdateBadge,
  onDeleteBadge,
  onNavigate,
}: Props) {
  const [tab, setTab] = React.useState<Tab>('languages')
  const [langDialog, setLangDialog] = React.useState<{ open: boolean; item?: Language }>({ open: false })
  const [fwDialog, setFwDialog] = React.useState<{ open: boolean; item?: Framework }>({ open: false })
  const [badgeDialog, setBadgeDialog] = React.useState<{ open: boolean; item?: BadgeTemplate }>({ open: false })
  const [confirmDelete, setConfirmDelete] = React.useState<{ type: Tab; id: string } | null>(null)
  const [fwCategoryFilter, setFwCategoryFilter] = React.useState<FrameworkCategory | 'all'>('all')
  const [search, setSearch] = React.useState('')

  const handleDelete = (type: Tab, id: string) => {
    if (confirmDelete?.id === id) {
      if (type === 'languages') onDeleteLanguage(id)
      else if (type === 'frameworks') onDeleteFramework(id)
      else onDeleteBadge(id)
      setConfirmDelete(null)
    } else {
      setConfirmDelete({ type, id })
    }
  }

  React.useEffect(() => {
    setSearch('')
    setConfirmDelete(null)
  }, [tab])

  const filteredLanguages = library.languages.filter((l) =>
    !search || l.name.toLowerCase().includes(search.toLowerCase())
  )

  const filteredFrameworks = library.frameworks.filter((fw) => {
    if (fwCategoryFilter !== 'all' && fw.category !== fwCategoryFilter) return false
    if (search && !fw.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const filteredBadges = library.badges.filter((b) =>
    !search || b.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col min-h-screen">
      <NavHeader
        currentView="library"
        onNavigate={onNavigate}
      />

      <div className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1">Bibliothèque</h1>
          <p className="text-muted-foreground text-sm">
            Gérez vos langages, frameworks et badges pour les utiliser lors de la création de projets.
          </p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="rounded-xl border bg-card p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
              <Code2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{library.languages.length}</p>
              <p className="text-xs text-muted-foreground">Langages</p>
            </div>
          </div>
          <div className="rounded-xl border bg-card p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{library.frameworks.length}</p>
              <p className="text-xs text-muted-foreground">Frameworks</p>
            </div>
          </div>
          <div className="rounded-xl border bg-card p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500">
              <Tag className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{library.badges.length}</p>
              <p className="text-xs text-muted-foreground">Badges</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b mb-4">
          {([['languages', <Code2 key="l" className="h-3.5 w-3.5" />, 'Langages'],
            ['frameworks', <Layers key="f" className="h-3.5 w-3.5" />, 'Frameworks'],
            ['badges', <Tag key="b" className="h-3.5 w-3.5" />, 'Badges']] as [Tab, React.ReactNode, string][]).map(([id, icon, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
                tab === id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {icon} {label}
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-xs">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="h-8 text-sm pl-8"
            />
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
              <FolderOpen className="h-3.5 w-3.5" />
            </span>
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {tab === 'frameworks' && (
            <select
              value={fwCategoryFilter}
              onChange={(e) => setFwCategoryFilter(e.target.value as FrameworkCategory | 'all')}
              className="h-8 rounded-md border border-input bg-background text-sm px-2 pr-6"
            >
              <option value="all">Toutes catégories</option>
              {(Object.keys(CATEGORY_LABELS) as FrameworkCategory[]).map((cat) => (
                <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
              ))}
            </select>
          )}

          <Button
            size="sm"
            onClick={() => {
              if (tab === 'languages') setLangDialog({ open: true })
              else if (tab === 'frameworks') setFwDialog({ open: true })
              else setBadgeDialog({ open: true })
            }}
            className="ml-auto"
          >
            <Plus className="h-3.5 w-3.5" />
            {tab === 'languages' ? 'Nouveau langage' : tab === 'frameworks' ? 'Nouveau framework' : 'Nouveau badge'}
          </Button>
        </div>

        {/* ─── Langages ─── */}
        {tab === 'languages' && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {filteredLanguages.map((lang) => {
              const usage = countLanguageUsage(projects, lang.name)
              const isConfirm = confirmDelete?.id === lang.id
              return (
                <div key={lang.id} className="group rounded-xl border bg-card p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full" style={{ backgroundColor: lang.color }} />
                      <span className="font-semibold text-sm">{lang.name}</span>
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setLangDialog({ open: true, item: lang })}
                        className="p-1 rounded hover:bg-muted"
                      >
                        <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => handleDelete('languages', lang.id)}
                        className={cn('p-1 rounded', isConfirm ? 'bg-destructive/10' : 'hover:bg-destructive/10')}
                      >
                        {isConfirm
                          ? <Check className="h-3.5 w-3.5 text-destructive" />
                          : <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                        }
                      </button>
                      {isConfirm && (
                        <button onClick={() => setConfirmDelete(null)} className="p-1 rounded hover:bg-muted">
                          <X className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
                      style={{ backgroundColor: lang.color }}
                    >
                      {lang.name}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {usage} projet{usage !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {isConfirm && (
                    <p className="text-[11px] text-destructive">Cliquez sur ✓ pour confirmer la suppression</p>
                  )}
                </div>
              )
            })}
            {filteredLanguages.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground text-sm">
                Aucun langage trouvé
              </div>
            )}
          </div>
        )}

        {/* ─── Frameworks ─── */}
        {tab === 'frameworks' && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredFrameworks.map((fw) => {
              const usage = countFrameworkUsage(projects, fw.name)
              const linkedLangs = fw.languageIds
                .map((id) => library.languages.find((l) => l.id === id))
                .filter(Boolean) as Language[]
              const isConfirm = confirmDelete?.id === fw.id
              return (
                <div key={fw.id} className="group rounded-xl border bg-card p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg" style={{ backgroundColor: fw.color + '20', border: `1px solid ${fw.color}40` }}>
                        <div className="h-full w-full flex items-center justify-center">
                          <span className="text-xs font-bold" style={{ color: fw.color }}>
                            {fw.name.charAt(0)}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{fw.name}</p>
                        <p className="text-[11px] text-muted-foreground">{CATEGORY_LABELS[fw.category]}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setFwDialog({ open: true, item: fw })}
                        className="p-1 rounded hover:bg-muted"
                      >
                        <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => handleDelete('frameworks', fw.id)}
                        className={cn('p-1 rounded', isConfirm ? 'bg-destructive/10' : 'hover:bg-destructive/10')}
                      >
                        {isConfirm
                          ? <Check className="h-3.5 w-3.5 text-destructive" />
                          : <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                        }
                      </button>
                      {isConfirm && (
                        <button onClick={() => setConfirmDelete(null)} className="p-1 rounded hover:bg-muted">
                          <X className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {linkedLangs.length === 0 ? (
                      <span className="text-[11px] text-muted-foreground">Universel</span>
                    ) : (
                      linkedLangs.slice(0, 5).map((l) => (
                        <span
                          key={l.id}
                          className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                          style={{ backgroundColor: l.color + '20', color: l.color }}
                        >
                          {l.name}
                        </span>
                      ))
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                      style={{ backgroundColor: fw.color }}
                    >
                      {fw.name}
                    </span>
                    <span>{usage} projet{usage !== 1 ? 's' : ''}</span>
                  </div>

                  {isConfirm && (
                    <p className="text-[11px] text-destructive">Cliquez sur ✓ pour confirmer la suppression</p>
                  )}
                </div>
              )
            })}
            {filteredFrameworks.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground text-sm">
                Aucun framework trouvé
              </div>
            )}
          </div>
        )}

        {/* ─── Badges ─── */}
        {tab === 'badges' && (
          <div className="flex flex-wrap gap-3">
            {filteredBadges.map((badge) => {
              const usage = countBadgeUsage(projects, badge.name)
              const isConfirm = confirmDelete?.id === badge.id
              return (
                <div
                  key={badge.id}
                  className="group relative rounded-xl border bg-card px-4 py-3 flex items-center gap-3"
                >
                  <span
                    className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium text-white"
                    style={{ backgroundColor: badge.color }}
                  >
                    {badge.name}
                  </span>
                  <span className="text-xs text-muted-foreground">{usage} projet{usage !== 1 ? 's' : ''}</span>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setBadgeDialog({ open: true, item: badge })}
                      className="p-1 rounded hover:bg-muted"
                    >
                      <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => handleDelete('badges', badge.id)}
                      className={cn('p-1 rounded', isConfirm ? 'bg-destructive/10' : 'hover:bg-destructive/10')}
                    >
                      {isConfirm
                        ? <Check className="h-3.5 w-3.5 text-destructive" />
                        : <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                      }
                    </button>
                    {isConfirm && (
                      <button onClick={() => setConfirmDelete(null)} className="p-1 rounded hover:bg-muted">
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
            {filteredBadges.length === 0 && (
              <div className="w-full text-center py-12 text-muted-foreground text-sm">
                Aucun badge trouvé
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <LanguageDialog
        open={langDialog.open}
        onOpenChange={(v) => setLangDialog({ open: v })}
        initial={langDialog.item}
        onSave={(data) => {
          if (langDialog.item) onUpdateLanguage(langDialog.item.id, data)
          else onAddLanguage(data)
        }}
      />

      <FrameworkDialog
        open={fwDialog.open}
        onOpenChange={(v) => setFwDialog({ open: v })}
        initial={fwDialog.item}
        languages={library.languages}
        onSave={(data) => {
          if (fwDialog.item) onUpdateFramework(fwDialog.item.id, data)
          else onAddFramework(data)
        }}
      />

      <BadgeDialog
        open={badgeDialog.open}
        onOpenChange={(v) => setBadgeDialog({ open: v })}
        initial={badgeDialog.item}
        onSave={(data) => {
          if (badgeDialog.item) onUpdateBadge(badgeDialog.item.id, data)
          else onAddBadge(data)
        }}
      />
    </div>
  )
}
