import * as React from 'react'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { Badge } from '@workspace/ui/components/badge'
import { Progress } from '@workspace/ui/components/progress'
import {
  Globe, Smartphone, Layers, Monitor, Database, Settings, Palette, Box,
  Plus, Search, CheckSquare, FolderOpen, Clock, TrendingUp, Filter,
  Calendar, MoreVertical, Edit2, Trash2, GitMerge, Copy, Download, Upload,
} from 'lucide-react'
import type { Project, ProjectStatus, ProjectType, Priority, Library } from '../types'
import type { ImportProjectsResult } from '../hooks/useProjects'
import { CreateProjectModal } from './CreateProjectModal'
import { NavHeader } from './NavHeader'
import { cn } from '@workspace/ui/lib/utils'
import type { AppView } from '../App'

function exportProjectsToJson(projects: Project[]) {
  const payload = { version: 1, exportedAt: new Date().toISOString(), projects }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `projets_export_${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

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
const STATUS_LABELS: Record<string, string> = {
  active: 'Actif', paused: 'En pause', completed: 'Terminé', archived: 'Archivé',
}
const STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'secondary' | 'outline'> = {
  active: 'success', paused: 'warning', completed: 'secondary', archived: 'outline',
}
const PRIORITY_LABELS: Record<string, string> = {
  low: 'Basse', medium: 'Moyenne', high: 'Haute', critical: 'Critique',
}

interface Props {
  projects: Project[]
  library: Library
  onSelectProject: (id: string) => void
  onCreateProject: (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'todoLists'>) => void
  onUpdateProject: (id: string, data: Partial<Project>) => void
  onDeleteProject: (id: string) => void
  onDuplicateProject: (id: string) => void
  onImportProjects: (rawProjects: unknown[]) => ImportProjectsResult
  onNavigate: (view: AppView) => void
}

export function Dashboard({
  projects,
  library,
  onSelectProject,
  onCreateProject,
  onUpdateProject,
  onDeleteProject,
  onDuplicateProject,
  onImportProjects,
  onNavigate,
}: Props) {
  const [createOpen, setCreateOpen] = React.useState(false)
  const [createKey, setCreateKey] = React.useState(0)
  const [editProject, setEditProject] = React.useState<Project | null>(null)
  const [editKey, setEditKey] = React.useState(0)
  const [search, setSearch] = React.useState('')
  const importFileRef = React.useRef<HTMLInputElement>(null)
  const [importFeedback, setImportFeedback] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [filterStatus, setFilterStatus] = React.useState<ProjectStatus | 'all'>('all')
  const [filterType, setFilterType] = React.useState<ProjectType | 'all'>('all')
  const [filterPriority, setFilterPriority] = React.useState<Priority | 'all'>('all')
  const [sortBy, setSortBy] = React.useState<'updatedAt' | 'name' | 'priority' | 'progress'>('updatedAt')
  const [menuOpenId, setMenuOpenId] = React.useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null)

  const allItems = projects.flatMap((p) => p.todoLists.flatMap((l) => l.items))
  const stats = {
    total: projects.length,
    active: projects.filter((p) => p.status === 'active').length,
    completed: projects.filter((p) => p.status === 'completed').length,
    composite: projects.filter((p) => p.isComposite).length,
    totalTasks: allItems.length,
    doneTasks: allItems.filter((i) => i.completed).length,
  }
  const globalProgress = stats.totalTasks === 0 ? 0 : Math.round((stats.doneTasks / stats.totalTasks) * 100)

  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }

  const filtered = projects
    .filter((p) => {
      if (filterStatus !== 'all' && p.status !== filterStatus) return false
      if (filterType !== 'all' && p.type !== filterType) return false
      if (filterPriority !== 'all' && p.priority !== filterPriority) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q)) ||
          p.languages.some((l) => l.toLowerCase().includes(q)) ||
          (p.subProjects ?? []).some((sp) =>
            sp.name.toLowerCase().includes(q) || sp.role.toLowerCase().includes(q)
          )
        )
      }
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      if (sortBy === 'priority') return priorityOrder[a.priority] - priorityOrder[b.priority]
      if (sortBy === 'progress') {
        const progressOf = (p: Project) => {
          const items = p.todoLists.flatMap((l) => l.items)
          return items.length === 0 ? 0 : items.filter((i) => i.completed).length / items.length
        }
        return progressOf(b) - progressOf(a)
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })

  const handleDeleteProject = (id: string) => {
    if (confirmDeleteId !== id) { setConfirmDeleteId(id); return }
    onDeleteProject(id)
    setConfirmDeleteId(null)
    setMenuOpenId(null)
  }

  const showImportFeedback = (feedback: { type: 'success' | 'error'; text: string }) => {
    setImportFeedback(feedback)
    setTimeout(() => setImportFeedback(null), 5000)
  }

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string)
        const rawProjects = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.projects) ? parsed.projects : null
        if (!rawProjects) throw new Error('format invalide')
        const result = onImportProjects(rawProjects)
        if (result.imported === 0) {
          showImportFeedback({ type: 'error', text: 'Aucun projet valide trouvé dans ce fichier.' })
        } else {
          showImportFeedback({
            type: 'success',
            text: `${result.imported} projet${result.imported > 1 ? 's' : ''} importé${result.imported > 1 ? 's' : ''}${result.skipped > 0 ? `, ${result.skipped} ignoré(s)` : ''}.`,
          })
        }
      } catch {
        showImportFeedback({ type: 'error', text: "Ce fichier n'est pas un export JSON valide." })
      }
    }
    reader.onerror = () => showImportFeedback({ type: 'error', text: 'Erreur de lecture du fichier.' })
    reader.readAsText(file)
  }

  React.useEffect(() => {
    const close = () => { setMenuOpenId(null); setConfirmDeleteId(null) }
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [])

  return (
    <div className="flex flex-col min-h-screen">
      <NavHeader
        currentView="dashboard"
        onNavigate={onNavigate}
        actions={
          <>
            <input ref={importFileRef} type="file" accept=".json,application/json" className="hidden" onChange={handleImportFile} />
            <Button variant="outline" onClick={() => importFileRef.current?.click()}>
              <Upload className="h-4 w-4" /> Importer (JSON)
            </Button>
            <Button variant="outline" onClick={() => exportProjectsToJson(projects)} disabled={projects.length === 0}>
              <Download className="h-4 w-4" /> Exporter (JSON)
            </Button>
            <Button onClick={() => { setCreateKey(k => k + 1); setCreateOpen(true) }}>
              <Plus className="h-4 w-4" /> Nouveau projet
            </Button>
          </>
        }
      />

      <div className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {importFeedback && (
          <div
            className={cn(
              'mb-4 rounded-lg border px-3 py-2 text-sm',
              importFeedback.type === 'success'
                ? 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400'
                : 'border-destructive/30 bg-destructive/10 text-destructive'
            )}
          >
            {importFeedback.text}
          </div>
        )}
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
          <StatCard icon={<FolderOpen className="h-5 w-5" />} label="Total projets" value={stats.total} color="text-primary" />
          <StatCard icon={<TrendingUp className="h-5 w-5" />} label="Actifs" value={stats.active} color="text-green-600 dark:text-green-400" />
          <StatCard icon={<CheckSquare className="h-5 w-5" />} label="Terminés" value={stats.completed} color="text-blue-600 dark:text-blue-400" />
          <StatCard icon={<Clock className="h-5 w-5" />} label="Tâches complétées" value={`${stats.doneTasks}/${stats.totalTasks}`} color="text-orange-600 dark:text-orange-400">
            <Progress value={globalProgress} className="mt-1.5 h-1.5" />
          </StatCard>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          <div className="relative flex-1 min-w-50">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un projet..."
              className="pl-9"
            />
          </div>
          <FilterSelect value={filterStatus} onChange={(v) => setFilterStatus(v as ProjectStatus | 'all')} options={[
            { value: 'all', label: 'Tous les statuts' },
            { value: 'active', label: 'Actif' },
            { value: 'paused', label: 'En pause' },
            { value: 'completed', label: 'Terminé' },
            { value: 'archived', label: 'Archivé' },
          ]} icon={<Filter className="h-4 w-4" />} />
          <FilterSelect value={filterType} onChange={(v) => setFilterType(v as ProjectType | 'all')} options={[
            { value: 'all', label: 'Tous les types' },
            { value: 'web', label: 'Web' },
            { value: 'mobile', label: 'Mobile' },
            { value: 'api', label: 'API' },
            { value: 'desktop', label: 'Desktop' },
            { value: 'data', label: 'Data' },
            { value: 'devops', label: 'DevOps' },
            { value: 'design', label: 'Design' },
            { value: 'other', label: 'Autre' },
          ]} icon={<Box className="h-4 w-4" />} />
          <FilterSelect value={filterPriority} onChange={(v) => setFilterPriority(v as Priority | 'all')} options={[
            { value: 'all', label: 'Toutes priorités' },
            { value: 'critical', label: 'Critique' },
            { value: 'high', label: 'Haute' },
            { value: 'medium', label: 'Moyenne' },
            { value: 'low', label: 'Basse' },
          ]} icon={<TrendingUp className="h-4 w-4" />} />
          <FilterSelect value={sortBy} onChange={(v) => setSortBy(v as typeof sortBy)} options={[
            { value: 'updatedAt', label: 'Récemment modifié' },
            { value: 'name', label: 'Nom A→Z' },
            { value: 'priority', label: 'Priorité' },
            { value: 'progress', label: 'Progression' },
          ]} icon={<TrendingUp className="h-4 w-4" />} />
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-1">
              {projects.length === 0 ? 'Aucun projet' : 'Aucun résultat'}
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              {projects.length === 0
                ? 'Créez votre premier projet pour commencer'
                : 'Essayez de modifier vos filtres de recherche'}
            </p>
            {projects.length === 0 && (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" /> Créer un projet
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((project) => {
              const items = project.todoLists.flatMap((l) => l.items)
              const done = items.filter((i) => i.completed).length
              const total = items.length
              const progress = total === 0 ? 0 : Math.round((done / total) * 100)
              const isOverdue = project.dueDate && new Date(project.dueDate) < new Date() && project.status !== 'completed'
              const isMenuOpen = menuOpenId === project.id

              return (
                <div
                  key={project.id}
                  className="group relative rounded-xl border bg-card overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => onSelectProject(project.id)}
                >
                  {/* Color bar */}
                  <div className="h-1.5 w-full" style={{ backgroundColor: project.color }} />
                  <div className="p-4">
                    {/* Header */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0 text-white" style={{ backgroundColor: project.color }}>
                        {project.isComposite
                          ? <GitMerge className="h-4 w-4" />
                          : TYPE_ICONS[project.type]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <p className="font-semibold text-sm leading-tight truncate">{project.name}</p>
                          <div className="flex items-center gap-1 shrink-0 ml-1">
                            <Badge variant={STATUS_VARIANTS[project.status]} className="text-[10px]">
                              {STATUS_LABELS[project.status]}
                            </Badge>
                            <button
                              onClick={(e) => { e.stopPropagation(); setMenuOpenId(isMenuOpen ? null : project.id) }}
                              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-muted transition-opacity"
                            >
                              <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <p className="text-[11px] text-muted-foreground">
                            {project.isComposite ? 'Composite' : TYPE_LABELS[project.type]}
                          </p>
                          {project.isComposite && (
                            <Badge variant="info" className="text-[9px] px-1 py-0 h-3.5">
                              {(project.subProjects ?? []).length} composants
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Context menu dropdown */}
                    {isMenuOpen && (
                      <div
                        className="absolute right-3 top-12 z-20 rounded-lg border bg-popover shadow-lg p-1 min-w-37.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm hover:bg-muted"
                          onClick={(e) => { e.stopPropagation(); setEditProject(project); setEditKey(k => k + 1); setMenuOpenId(null) }}
                        >
                          <Edit2 className="h-3.5 w-3.5" /> Modifier
                        </button>
                        <button
                          className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm hover:bg-muted"
                          onClick={(e) => { e.stopPropagation(); onDuplicateProject(project.id); setMenuOpenId(null) }}
                        >
                          <Copy className="h-3.5 w-3.5" /> Dupliquer
                        </button>
                        <div className="my-1 h-px bg-border" />
                        {confirmDeleteId === project.id ? (
                          <div className="px-2 py-1">
                            <p className="text-xs text-muted-foreground mb-1">Confirmer la suppression ?</p>
                            <div className="flex gap-1">
                              <button
                                className="flex-1 rounded bg-destructive/10 text-destructive text-xs py-1 hover:bg-destructive/20"
                                onClick={(e) => { e.stopPropagation(); handleDeleteProject(project.id) }}
                              >Oui</button>
                              <button
                                className="flex-1 rounded bg-muted text-xs py-1 hover:bg-muted/80"
                                onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null) }}
                              >Non</button>
                            </div>
                          </div>
                        ) : (
                          <button
                            className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10"
                            onClick={(e) => { e.stopPropagation(); handleDeleteProject(project.id) }}
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Supprimer
                          </button>
                        )}
                      </div>
                    )}

                    {/* Description */}
                    {project.description && (
                      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{project.description}</p>
                    )}

                    {/* Sub-projects for composite */}
                    {project.isComposite && (project.subProjects ?? []).length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {(project.subProjects ?? []).slice(0, 4).map((sp) => (
                          <span
                            key={sp.id}
                            className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground"
                          >
                            {TYPE_ICONS[sp.type] && (
                              <span className="scale-75">{TYPE_ICONS[sp.type]}</span>
                            )}
                            {sp.name}
                          </span>
                        ))}
                        {(project.subProjects ?? []).length > 4 && (
                          <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            +{(project.subProjects ?? []).length - 4}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Progress */}
                    <div className="flex items-center gap-2 mb-3">
                      <Progress value={progress} className="flex-1 h-1.5" />
                      <span className="text-xs font-medium shrink-0">{progress}%</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-3">
                      <span>{done}/{total} tâches</span>
                      <span>{project.todoLists.length} liste{project.todoLists.length !== 1 ? 's' : ''}</span>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <div className="flex flex-wrap gap-1">
                        {project.languages.slice(0, 3).map((l) => {
                          const lang = library.languages.find((lib) => lib.name === l)
                          return (
                            <Badge
                              key={l}
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0 h-4"
                              style={lang ? { backgroundColor: lang.color + '20', color: lang.color, borderColor: lang.color + '40' } : undefined}
                            >
                              {l}
                            </Badge>
                          )
                        })}
                        {project.languages.length > 3 && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">+{project.languages.length - 3}</Badge>
                        )}
                      </div>
                      {project.dueDate && (
                        <div className={cn('flex items-center gap-1 text-[11px]', isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground')}>
                          <Calendar className="h-3 w-3" />
                          {new Date(project.dueDate).toLocaleDateString('fr-FR')}
                        </div>
                      )}
                    </div>

                    {/* Priority indicator */}
                    {(project.priority === 'high' || project.priority === 'critical') && (
                      <div className="mt-2 pt-2 border-t flex items-center gap-1">
                        <div className={cn('h-1.5 w-1.5 rounded-full', project.priority === 'critical' ? 'bg-red-500' : 'bg-orange-500')} />
                        <span className="text-[11px] text-muted-foreground">
                          Priorité {PRIORITY_LABELS[project.priority]}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <CreateProjectModal
        key={`create-${createKey}`}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={onCreateProject}
        library={library}
      />

      <CreateProjectModal
        key={`edit-${editKey}`}
        open={!!editProject}
        onOpenChange={(open) => !open && setEditProject(null)}
        mode="edit"
        initialData={editProject ?? undefined}
        onSubmit={(data) => { if (editProject) onUpdateProject(editProject.id, data); setEditProject(null) }}
        library={library}
      />
    </div>
  )
}

function StatCard({ icon, label, value, color, children }: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
  color: string
  children?: React.ReactNode
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2 mb-1">
        <span className={color}>{icon}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {children}
    </div>
  )
}

function FilterSelect({ value, onChange, options, icon }: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  icon?: React.ReactNode
}) {
  return (
    <div className="relative flex items-center">
      {icon && <span className="absolute left-3 text-muted-foreground pointer-events-none">{icon}</span>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'h-9 rounded-md border border-input bg-background text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring pr-3',
          icon ? 'pl-9' : 'pl-3'
        )}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  )
}
