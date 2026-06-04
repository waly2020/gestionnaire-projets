import * as React from 'react'
import { Button } from '@workspace/ui/components/button'
import { Badge } from '@workspace/ui/components/badge'
import { Progress } from '@workspace/ui/components/progress'
import {
  ArrowLeft, Edit2, Trash2, Globe, Smartphone, Layers, Monitor, Database,
  Settings, Palette, Box, Plus, Calendar, Tag, Code2, Wrench, Cpu,
  GitMerge,
} from 'lucide-react'
import type { Project, ItemPriority, Library, SubProject } from '../types'
import { TodoListView } from './TodoListView'
import { AddTodoListModal } from './AddTodoListModal'
import { CreateProjectModal } from './CreateProjectModal'
import { cn } from '@workspace/ui/lib/utils'

const TYPE_ICONS: Record<string, React.ReactNode> = {
  web: <Globe className="h-5 w-5" />,
  mobile: <Smartphone className="h-5 w-5" />,
  api: <Layers className="h-5 w-5" />,
  desktop: <Monitor className="h-5 w-5" />,
  data: <Database className="h-5 w-5" />,
  devops: <Settings className="h-5 w-5" />,
  design: <Palette className="h-5 w-5" />,
  other: <Box className="h-5 w-5" />,
}
const TYPE_ICONS_SM: Record<string, React.ReactNode> = {
  web: <Globe className="h-3.5 w-3.5" />,
  mobile: <Smartphone className="h-3.5 w-3.5" />,
  api: <Layers className="h-3.5 w-3.5" />,
  desktop: <Monitor className="h-3.5 w-3.5" />,
  data: <Database className="h-3.5 w-3.5" />,
  devops: <Settings className="h-3.5 w-3.5" />,
  design: <Palette className="h-3.5 w-3.5" />,
  other: <Box className="h-3.5 w-3.5" />,
}
const TYPE_LABELS: Record<string, string> = {
  web: 'Web', mobile: 'Mobile', api: 'API / Backend', desktop: 'Desktop',
  data: 'Data / BI', devops: 'DevOps', design: 'Design', other: 'Autre',
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
const PRIORITY_VARIANTS: Record<string, 'info' | 'warning' | 'destructive' | 'secondary'> = {
  low: 'info', medium: 'warning', high: 'destructive', critical: 'destructive',
}

interface Props {
  project: Project
  library: Library
  onBack: () => void
  onUpdateProject: (id: string, data: Partial<Project>) => void
  onDeleteProject: (id: string) => void
  onAddTodoList: (projectId: string, data: { title: string; items: string[] }) => void
  onDeleteTodoList: (projectId: string, listId: string) => void
  onAddTodoItem: (projectId: string, listId: string, text: string, priority: ItemPriority) => void
  onToggleTodoItem: (projectId: string, listId: string, itemId: string) => void
  onDeleteTodoItem: (projectId: string, listId: string, itemId: string) => void
}

export function ProjectDetail({
  project,
  library,
  onBack,
  onUpdateProject,
  onDeleteProject,
  onAddTodoList,
  onDeleteTodoList,
  onAddTodoItem,
  onToggleTodoItem,
  onDeleteTodoItem,
}: Props) {
  const [addListOpen, setAddListOpen] = React.useState(false)
  const [editOpen, setEditOpen] = React.useState(false)
  const [confirmDelete, setConfirmDelete] = React.useState(false)

  const allItems = project.todoLists.flatMap((l) => l.items)
  const totalItems = allItems.length
  const doneItems = allItems.filter((i) => i.completed).length
  const progress = totalItems === 0 ? 0 : Math.round((doneItems / totalItems) * 100)

  const isOverdue = project.dueDate && new Date(project.dueDate) < new Date() && project.status !== 'completed'

  const handleDelete = () => {
    if (!confirmDelete) { setConfirmDelete(true); return }
    onDeleteProject(project.id)
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-background/95 backdrop-blur px-6 py-3">
        <Button variant="ghost" size="icon-sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
          <h1 className="font-semibold truncate">{project.name}</h1>
          <Badge variant={STATUS_VARIANTS[project.status]}>{STATUS_LABELS[project.status]}</Badge>
          {project.isComposite && (
            <Badge variant="secondary" className="gap-1">
              <GitMerge className="h-3 w-3" /> Composite
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
            <Edit2 className="h-4 w-4" /> Modifier
          </Button>
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <Button size="sm" variant="destructive" onClick={handleDelete}>Supprimer</Button>
              <Button size="sm" variant="outline" onClick={() => setConfirmDelete(false)}>Annuler</Button>
            </div>
          ) : (
            <Button size="icon-sm" variant="ghost" onClick={handleDelete} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </header>

      <div className="flex-1 p-6 max-w-4xl mx-auto w-full">
        {/* Project info card */}
        <div className="rounded-xl border bg-card p-6 mb-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl shrink-0 text-white" style={{ backgroundColor: project.color }}>
              {project.isComposite ? <GitMerge className="h-5 w-5" /> : TYPE_ICONS[project.type]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="text-xl font-bold">{project.name}</h2>
                <Badge variant={PRIORITY_VARIANTS[project.priority]}>
                  Priorité {PRIORITY_LABELS[project.priority]}
                </Badge>
              </div>
              {project.description && (
                <p className="text-sm text-muted-foreground">{project.description}</p>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="flex flex-wrap gap-4 text-sm mb-4">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Démarré le {new Date(project.startDate).toLocaleDateString('fr-FR')}</span>
            </div>
            {project.dueDate && (
              <div className={cn('flex items-center gap-1.5', isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground')}>
                <Calendar className="h-4 w-4" />
                <span>Échéance : {new Date(project.dueDate).toLocaleDateString('fr-FR')}{isOverdue ? ' — En retard !' : ''}</span>
              </div>
            )}
          </div>

          {/* Global progress */}
          <div className="flex items-center gap-3 mb-4">
            <Progress value={progress} className="flex-1 h-2.5" />
            <span className="text-sm font-semibold shrink-0">{progress}%</span>
            <span className="text-xs text-muted-foreground shrink-0">{doneItems}/{totalItems} tâches</span>
          </div>

          {/* Tags */}
          {project.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-muted-foreground" />
              {project.tags.map((tag) => {
                const badge = library.badges.find((b) => b.name === tag)
                return badge ? (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                    style={{ backgroundColor: badge.color }}
                  >
                    {tag}
                  </span>
                ) : (
                  <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                )
              })}
            </div>
          )}
        </div>

        {/* ─── Composants (projet composite) ─── */}
        {project.isComposite && (project.subProjects ?? []).length > 0 && (
          <div className="rounded-xl border bg-card p-5 mb-6">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <GitMerge className="h-4 w-4 text-muted-foreground" />
              Composants du projet
              <span className="ml-1 text-muted-foreground font-normal">({(project.subProjects ?? []).length})</span>
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(project.subProjects ?? []).map((sp) => (
                <SubProjectCard key={sp.id} sp={sp} library={library} />
              ))}
            </div>
          </div>
        )}

        {/* Tech stack globale */}
        {(project.languages.length > 0 || project.frameworks.length > 0 || project.tools.length > 0) && (
          <div className="rounded-xl border bg-card p-4 mb-6">
            <h3 className="text-sm font-semibold mb-3">
              {project.isComposite ? 'Stack globale' : 'Stack technologique'}
            </h3>
            <div className="flex flex-col gap-2.5">
              {project.languages.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Code2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground w-20 shrink-0">Langages</span>
                  <div className="flex flex-wrap gap-1">
                    {project.languages.map((l) => {
                      const lang = library.languages.find((lib) => lib.name === l)
                      return (
                        <Badge
                          key={l}
                          variant="secondary"
                          className="text-xs"
                          style={lang ? { backgroundColor: lang.color + '20', color: lang.color } : undefined}
                        >
                          {l}
                        </Badge>
                      )
                    })}
                  </div>
                </div>
              )}
              {project.frameworks.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Cpu className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground w-20 shrink-0">Frameworks</span>
                  <div className="flex flex-wrap gap-1">
                    {project.frameworks.map((f) => {
                      const fw = library.frameworks.find((lib) => lib.name === f)
                      return (
                        <Badge
                          key={f}
                          variant="secondary"
                          className="text-xs"
                          style={fw ? { backgroundColor: fw.color + '20', color: fw.color } : undefined}
                        >
                          {f}
                        </Badge>
                      )
                    })}
                  </div>
                </div>
              )}
              {project.tools.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Wrench className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground w-20 shrink-0">Outils</span>
                  <div className="flex flex-wrap gap-1">
                    {project.tools.map((t) => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Todo Lists */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              Listes de tâches
              <span className="ml-2 text-muted-foreground font-normal">({project.todoLists.length})</span>
            </h3>
            <Button size="sm" onClick={() => setAddListOpen(true)}>
              <Plus className="h-4 w-4" /> Ajouter une liste
            </Button>
          </div>

          {project.todoLists.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12 text-center">
              <Plus className="h-8 w-8 text-muted-foreground mb-3" />
              <p className="text-sm font-medium">Aucune liste de tâches</p>
              <p className="text-xs text-muted-foreground mt-1">Ajoutez votre première liste pour commencer à suivre les tâches</p>
              <Button size="sm" className="mt-4" onClick={() => setAddListOpen(true)}>Créer une liste</Button>
            </div>
          )}

          {project.todoLists.map((list) => (
            <TodoListView
              key={list.id}
              list={list}
              projectId={project.id}
              onToggleItem={(listId, itemId) => onToggleTodoItem(project.id, listId, itemId)}
              onAddItem={(listId, text, priority) => onAddTodoItem(project.id, listId, text, priority)}
              onDeleteItem={(listId, itemId) => onDeleteTodoItem(project.id, listId, itemId)}
              onDeleteList={(listId) => onDeleteTodoList(project.id, listId)}
            />
          ))}
        </div>
      </div>

      <AddTodoListModal
        open={addListOpen}
        onOpenChange={setAddListOpen}
        onSubmit={(data) => onAddTodoList(project.id, data)}
      />

      <CreateProjectModal
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        initialData={project}
        library={library}
        onSubmit={(data) => onUpdateProject(project.id, data)}
      />
    </div>
  )
}

// ─── Carte sous-projet ────────────────────────────────────────────────────────

function SubProjectCard({ sp, library }: { sp: SubProject; library: Library }) {
  return (
    <div className="rounded-lg border p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
            {TYPE_ICONS_SM[sp.type]}
          </div>
          <div>
            <p className="text-sm font-semibold">{sp.name}</p>
            <p className="text-[11px] text-muted-foreground">{sp.role} · {TYPE_LABELS[sp.type]}</p>
          </div>
        </div>
      </div>

      {sp.description && (
        <p className="text-xs text-muted-foreground">{sp.description}</p>
      )}

      <div className="flex flex-col gap-1.5">
        {sp.languages.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {sp.languages.map((l) => {
              const lang = library.languages.find((lib) => lib.name === l)
              return (
                <span
                  key={l}
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
                  style={lang
                    ? { backgroundColor: lang.color + '20', color: lang.color }
                    : { backgroundColor: '#f1f5f9', color: '#64748b' }
                  }
                >
                  {l}
                </span>
              )
            })}
          </div>
        )}
        {sp.frameworks.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {sp.frameworks.map((f) => {
              const fw = library.frameworks.find((lib) => lib.name === f)
              return (
                <span
                  key={f}
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border"
                  style={fw
                    ? { borderColor: fw.color + '60', color: fw.color }
                    : { borderColor: '#e2e8f0', color: '#64748b' }
                  }
                >
                  {f}
                </span>
              )
            })}
          </div>
        )}
        {sp.tools.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {sp.tools.map((t) => (
              <span key={t} className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
