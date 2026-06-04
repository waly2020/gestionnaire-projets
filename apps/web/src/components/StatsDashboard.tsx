import * as React from 'react'
import { Progress } from '@workspace/ui/components/progress'
import {
  FolderOpen, TrendingUp, CheckSquare, Clock, AlertTriangle,
  Globe, Smartphone, Layers, Monitor, Database, Settings, Palette, Box,
  GitMerge, BarChart2, Code2,
} from 'lucide-react'
import type { Project, Library } from '../types'
import { NavHeader } from './NavHeader'
import { cn } from '@workspace/ui/lib/utils'
import type { AppView } from '../App'

interface Props {
  projects: Project[]
  library: Library
  onNavigate: (view: AppView) => void
}

const TYPE_LABELS: Record<string, string> = {
  web: 'Web', mobile: 'Mobile', api: 'API', desktop: 'Desktop',
  data: 'Data', devops: 'DevOps', design: 'Design', other: 'Autre',
}
const TYPE_ICONS: Record<string, React.ReactNode> = {
  web: <Globe className="h-3.5 w-3.5" />,
  mobile: <Smartphone className="h-3.5 w-3.5" />,
  api: <Layers className="h-3.5 w-3.5" />,
  desktop: <Monitor className="h-3.5 w-3.5" />,
  data: <Database className="h-3.5 w-3.5" />,
  devops: <Settings className="h-3.5 w-3.5" />,
  design: <Palette className="h-3.5 w-3.5" />,
  other: <Box className="h-3.5 w-3.5" />,
}
const TYPE_COLORS: Record<string, string> = {
  web: '#0ea5e9', mobile: '#8b5cf6', api: '#22c55e', desktop: '#f97316',
  data: '#eab308', devops: '#64748b', design: '#ec4899', other: '#94a3b8',
}
const STATUS_COLORS: Record<string, string> = {
  active: '#22c55e', paused: '#eab308', completed: '#3b82f6', archived: '#94a3b8',
}
const STATUS_LABELS: Record<string, string> = {
  active: 'Actif', paused: 'En pause', completed: 'Terminé', archived: 'Archivé',
}
const PRIORITY_COLORS: Record<string, string> = {
  low: '#22c55e', medium: '#eab308', high: '#f97316', critical: '#ef4444',
}
const PRIORITY_LABELS: Record<string, string> = {
  low: 'Basse', medium: 'Moyenne', high: 'Haute', critical: 'Critique',
}

// ─── Composants graphiques CSS ────────────────────────────────────────────────

function BarRow({
  label,
  count,
  max,
  color,
  icon,
  percentage,
}: {
  label: string
  count: number
  max: number
  color: string
  icon?: React.ReactNode
  percentage?: boolean
}) {
  const pct = max === 0 ? 0 : Math.round((count / max) * 100)
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5 w-28 shrink-0">
        {icon && <span style={{ color }}>{icon}</span>}
        <span className="text-xs text-muted-foreground truncate">{label}</span>
      </div>
      <div className="flex-1 h-5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color, minWidth: count > 0 ? '4px' : '0' }}
        />
      </div>
      <span className="text-xs font-semibold w-10 shrink-0 text-right">
        {percentage ? `${count}%` : count}
      </span>
    </div>
  )
}

function SectionCard({ title, icon, children }: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-muted-foreground">{icon}</span>
        <h2 className="font-semibold text-sm">{title}</h2>
      </div>
      {children}
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export function StatsDashboard({ projects, library, onNavigate }: Props) {
  const allItems = projects.flatMap((p) => p.todoLists.flatMap((l) => l.items))
  const doneItems = allItems.filter((i) => i.completed)
  const globalProgress = allItems.length === 0 ? 0 : Math.round((doneItems.length / allItems.length) * 100)

  const overdueProjects = projects.filter(
    (p) => p.dueDate && new Date(p.dueDate) < new Date() && p.status !== 'completed'
  )

  const recentProjects = [...projects]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5)

  // Répartition par type
  const byType = (['web', 'mobile', 'api', 'desktop', 'data', 'devops', 'design', 'other'] as const).map((t) => ({
    type: t,
    count: projects.filter((p) => p.type === t).length,
  })).filter((x) => x.count > 0).sort((a, b) => b.count - a.count)

  // Répartition par statut
  const byStatus = (['active', 'paused', 'completed', 'archived'] as const).map((s) => ({
    status: s,
    count: projects.filter((p) => p.status === s).length,
  })).filter((x) => x.count > 0)

  // Répartition par priorité
  const byPriority = (['critical', 'high', 'medium', 'low'] as const).map((pr) => ({
    priority: pr,
    count: projects.filter((p) => p.priority === pr).length,
  })).filter((x) => x.count > 0)

  // Top langages
  const langUsage = new Map<string, number>()
  projects.forEach((p) => {
    p.languages.forEach((l) => langUsage.set(l, (langUsage.get(l) ?? 0) + 1))
    ;(p.subProjects ?? []).forEach((sp) => {
      sp.languages.forEach((l) => langUsage.set(l, (langUsage.get(l) ?? 0) + 1))
    })
  })
  const topLangs = [...langUsage.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({
      name,
      count,
      color: library.languages.find((l) => l.name === name)?.color ?? '#6366f1',
    }))

  // Top frameworks
  const fwUsage = new Map<string, number>()
  projects.forEach((p) => {
    p.frameworks.forEach((f) => fwUsage.set(f, (fwUsage.get(f) ?? 0) + 1))
    ;(p.subProjects ?? []).forEach((sp) => {
      sp.frameworks.forEach((f) => fwUsage.set(f, (fwUsage.get(f) ?? 0) + 1))
    })
  })
  const topFws = [...fwUsage.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({
      name,
      count,
      color: library.frameworks.find((f) => f.name === name)?.color ?? '#8b5cf6',
    }))

  // Taux de complétion par projet
  const projectCompletion = projects
    .map((p) => {
      const items = p.todoLists.flatMap((l) => l.items)
      const pct = items.length === 0 ? 0 : Math.round((items.filter((i) => i.completed).length / items.length) * 100)
      return { name: p.name, pct, color: p.color }
    })
    .filter((p) => {
      const proj = projects.find((pr) => pr.name === p.name)
      return proj && proj.todoLists.flatMap((l) => l.items).length > 0
    })
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 8)

  const maxByType = Math.max(...byType.map((x) => x.count), 1)
  const maxByStatus = Math.max(...byStatus.map((x) => x.count), 1)
  const maxByPriority = Math.max(...byPriority.map((x) => x.count), 1)
  const maxLang = topLangs[0]?.count ?? 1
  const maxFw = topFws[0]?.count ?? 1

  return (
    <div className="flex flex-col min-h-screen">
      <NavHeader currentView="stats" onNavigate={onNavigate} />

      <div className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1">Statistiques</h1>
          <p className="text-sm text-muted-foreground">Vue d'ensemble de tous vos projets</p>
        </div>

        {/* Overview cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
          <MetricCard
            icon={<FolderOpen className="h-5 w-5" />}
            label="Total projets"
            value={projects.length}
            color="text-primary"
            bgColor="bg-primary/10"
          />
          <MetricCard
            icon={<TrendingUp className="h-5 w-5" />}
            label="Actifs"
            value={projects.filter((p) => p.status === 'active').length}
            color="text-green-600 dark:text-green-400"
            bgColor="bg-green-500/10"
            sub={`${projects.filter((p) => p.status === 'completed').length} terminé(s)`}
          />
          <MetricCard
            icon={<CheckSquare className="h-5 w-5" />}
            label="Tâches"
            value={`${doneItems.length}/${allItems.length}`}
            color="text-blue-600 dark:text-blue-400"
            bgColor="bg-blue-500/10"
            sub={`${globalProgress}% complétées`}
          />
          <MetricCard
            icon={<GitMerge className="h-5 w-5" />}
            label="Composites"
            value={projects.filter((p) => p.isComposite).length}
            color="text-purple-600 dark:text-purple-400"
            bgColor="bg-purple-500/10"
            sub={`${projects.filter((p) => !p.isComposite).length} simples`}
          />
        </div>

        {/* Progression globale */}
        <div className="rounded-xl border bg-card p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
              Progression globale
            </h2>
            <span className="text-2xl font-bold">{globalProgress}%</span>
          </div>
          <Progress value={globalProgress} className="h-3" />
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span>{doneItems.length} tâches complétées</span>
            <span>{allItems.length - doneItems.length} restantes</span>
          </div>
        </div>

        {/* Grid principal */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-6">
          {/* Par type */}
          {byType.length > 0 && (
            <SectionCard title="Projets par type" icon={<Box className="h-4 w-4" />}>
              <div className="flex flex-col gap-2.5">
                {byType.map(({ type, count }) => (
                  <BarRow
                    key={type}
                    label={TYPE_LABELS[type]}
                    count={count}
                    max={maxByType}
                    color={TYPE_COLORS[type]}
                    icon={TYPE_ICONS[type]}
                  />
                ))}
              </div>
            </SectionCard>
          )}

          {/* Par statut */}
          {byStatus.length > 0 && (
            <SectionCard title="Projets par statut" icon={<Clock className="h-4 w-4" />}>
              <div className="flex flex-col gap-2.5">
                {byStatus.map(({ status, count }) => (
                  <BarRow
                    key={status}
                    label={STATUS_LABELS[status]}
                    count={count}
                    max={maxByStatus}
                    color={STATUS_COLORS[status]}
                  />
                ))}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {byStatus.map(({ status, count }) => (
                  <div key={status} className="flex items-center gap-2 rounded-lg p-2.5" style={{ backgroundColor: STATUS_COLORS[status] + '15' }}>
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[status] }} />
                    <div>
                      <p className="text-xs font-medium">{STATUS_LABELS[status]}</p>
                      <p className="text-lg font-bold">{count}</p>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Par priorité */}
          {byPriority.length > 0 && (
            <SectionCard title="Projets par priorité" icon={<TrendingUp className="h-4 w-4" />}>
              <div className="flex flex-col gap-2.5">
                {byPriority.map(({ priority, count }) => (
                  <BarRow
                    key={priority}
                    label={PRIORITY_LABELS[priority]}
                    count={count}
                    max={maxByPriority}
                    color={PRIORITY_COLORS[priority]}
                  />
                ))}
              </div>
            </SectionCard>
          )}

          {/* Taux de complétion par projet */}
          {projectCompletion.length > 0 && (
            <SectionCard title="Complétion par projet" icon={<BarChart2 className="h-4 w-4" />}>
              <div className="flex flex-col gap-2.5">
                {projectCompletion.map(({ name, pct, color }) => (
                  <BarRow
                    key={name}
                    label={name}
                    count={pct}
                    max={100}
                    color={color}
                    percentage
                  />
                ))}
              </div>
            </SectionCard>
          )}
        </div>

        {/* Top langages & frameworks */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-6">
          {topLangs.length > 0 && (
            <SectionCard title="Top langages utilisés" icon={<Code2 className="h-4 w-4" />}>
              <div className="flex flex-col gap-2.5">
                {topLangs.map(({ name, count, color }) => (
                  <BarRow key={name} label={name} count={count} max={maxLang} color={color} />
                ))}
              </div>
            </SectionCard>
          )}

          {topFws.length > 0 && (
            <SectionCard title="Top frameworks utilisés" icon={<Layers className="h-4 w-4" />}>
              <div className="flex flex-col gap-2.5">
                {topFws.map(({ name, count, color }) => (
                  <BarRow key={name} label={name} count={count} max={maxFw} color={color} />
                ))}
              </div>
            </SectionCard>
          )}
        </div>

        {/* Projets en retard */}
        {overdueProjects.length > 0 && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-5 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <h2 className="font-semibold text-sm text-destructive">
                Projets en retard ({overdueProjects.length})
              </h2>
            </div>
            <div className="flex flex-col gap-2">
              {overdueProjects.map((p) => {
                const daysLate = Math.floor(
                  (new Date().getTime() - new Date(p.dueDate!).getTime()) / (1000 * 60 * 60 * 24)
                )
                return (
                  <div key={p.id} className="flex items-center justify-between rounded-lg bg-background p-3 border">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: p.color }} />
                      <span className="text-sm font-medium">{p.name}</span>
                    </div>
                    <span className="text-xs text-destructive font-medium">
                      {daysLate}j de retard
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Activité récente */}
        {recentProjects.length > 0 && (
          <SectionCard title="Dernière activité" icon={<Clock className="h-4 w-4" />}>
            <div className="flex flex-col gap-0">
              {recentProjects.map((p, i) => {
                const items = p.todoLists.flatMap((l) => l.items)
                const pct = items.length === 0 ? 0 : Math.round((items.filter((i) => i.completed).length / items.length) * 100)
                return (
                  <div
                    key={p.id}
                    className={cn(
                      'flex items-center justify-between py-3',
                      i < recentProjects.length - 1 && 'border-b'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-7 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: p.color }}>
                        {p.isComposite ? <GitMerge className="h-3.5 w-3.5" /> : TYPE_ICONS[p.type]}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{p.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          Modifié le {new Date(p.updatedAt).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-20 hidden sm:block">
                        <Progress value={pct} className="h-1.5" />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground w-10 text-right">{pct}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </SectionCard>
        )}

        {/* Empty state */}
        {projects.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <BarChart2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-1">Aucune donnée</h2>
            <p className="text-sm text-muted-foreground">
              Créez des projets pour voir apparaître vos statistiques ici.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function MetricCard({
  icon,
  label,
  value,
  color,
  bgColor,
  sub,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
  color: string
  bgColor: string
  sub?: string
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', bgColor)}>
          <span className={color}>{icon}</span>
        </div>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  )
}
