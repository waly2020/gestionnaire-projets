export type Priority = 'low' | 'medium' | 'high' | 'critical'
export type ProjectStatus = 'active' | 'paused' | 'completed' | 'archived'
export type ProjectType = 'web' | 'mobile' | 'api' | 'desktop' | 'data' | 'devops' | 'design' | 'other'
export type ItemPriority = 'low' | 'medium' | 'high'
export type FrameworkCategory = 'frontend' | 'backend' | 'fullstack' | 'mobile' | 'devops' | 'testing' | 'style' | 'other'

export interface TodoItem {
  id: string
  text: string
  completed: boolean
  priority: ItemPriority
  createdAt: string
  completedAt?: string
}

export interface TodoList {
  id: string
  title: string
  createdAt: string
  items: TodoItem[]
  subProjectId?: string  // undefined = liste globale au projet
}

// ─── Pièces jointes ──────────────────────────────────────────────────────────

export interface Attachment {
  id: string
  name: string
  title: string
  description?: string
  size: number
  mimeType: string
  createdAt: string
}

// ─── Référentiel centralisé ───────────────────────────────────────────────────

export interface Language {
  id: string
  name: string
  color: string
}

export interface Framework {
  id: string
  name: string
  languageIds: string[]
  color: string
  category: FrameworkCategory
}

export interface BadgeTemplate {
  id: string
  name: string
  color: string
}

export interface Library {
  languages: Language[]
  frameworks: Framework[]
  badges: BadgeTemplate[]
}

// ─── Projets composites ───────────────────────────────────────────────────────

export interface SubProject {
  id: string
  name: string
  role: string
  type: ProjectType
  languages: string[]
  frameworks: string[]
  tools: string[]
  description?: string
  color?: string
}

// ─── Projet ──────────────────────────────────────────────────────────────────

export interface Project {
  id: string
  name: string
  description: string
  status: ProjectStatus
  priority: Priority
  type: ProjectType
  color: string
  languages: string[]
  frameworks: string[]
  tools: string[]
  tags: string[]
  startDate: string
  dueDate?: string
  createdAt: string
  updatedAt: string
  todoLists: TodoList[]
  isComposite?: boolean
  subProjects?: SubProject[]
  attachments?: Attachment[]
}
