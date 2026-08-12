import { useState, useCallback } from 'react'
import type { Project, TodoList, TodoItem, ItemPriority, Attachment, SubProject } from '../types'

const STORAGE_KEY = 'pm_projects'

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function load(): Project[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function save(projects: Project[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
}

export interface ImportProjectsResult {
  imported: number
  skipped: number
}

// Normalise un projet importé depuis un JSON externe : régénère tous les
// identifiants internes (projet, composants, listes, tâches) pour éviter
// toute collision avec les données déjà présentes, et remappe les
// références subProjectId en conséquence. Les identifiants de pièces
// jointes sont conservés (ils pointent vers des blobs IndexedDB qui ne
// sont pas inclus dans l'export JSON).
function normalizeImportedProject(raw: unknown): Project | null {
  if (!raw || typeof raw !== 'object') return null
  const p = raw as Partial<Project>
  if (typeof p.name !== 'string' || !p.name.trim() || !Array.isArray(p.todoLists)) return null

  const now = new Date().toISOString()
  const subProjectIdMap = new Map<string, string>()
  const subProjects: SubProject[] | undefined = Array.isArray(p.subProjects)
    ? p.subProjects.map((sp) => {
        const newId = generateId()
        if (sp?.id) subProjectIdMap.set(sp.id, newId)
        return { ...sp, id: newId }
      })
    : undefined

  const todoLists: TodoList[] = p.todoLists.map((list) => ({
    ...list,
    id: generateId(),
    subProjectId: list.subProjectId ? subProjectIdMap.get(list.subProjectId) : undefined,
    items: Array.isArray(list.items) ? list.items.map((item) => ({ ...item, id: generateId() })) : [],
  }))

  return {
    ...p,
    id: generateId(),
    name: p.name,
    description: p.description ?? '',
    status: p.status ?? 'active',
    priority: p.priority ?? 'medium',
    type: p.type ?? 'other',
    color: p.color ?? '#6366f1',
    languages: Array.isArray(p.languages) ? p.languages : [],
    frameworks: Array.isArray(p.frameworks) ? p.frameworks : [],
    tools: Array.isArray(p.tools) ? p.tools : [],
    tags: Array.isArray(p.tags) ? p.tags : [],
    startDate: p.startDate ?? now,
    createdAt: p.createdAt ?? now,
    updatedAt: now,
    todoLists,
    subProjects,
  }
}

export function parseTodoText(text: string): { title: string; items: string[] } {
  const lines = text.trim().split('\n').filter((l) => l.trim())
  if (lines.length === 0) return { title: '', items: [] }

  const title = lines[0].trim()
  const items: string[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    // Remove leading number + dot/period pattern like "1.", "10.", "1 ."
    const cleaned = line.replace(/^\d+\s*[.)]\s*/, '').trim()
    if (cleaned) items.push(cleaned)
  }

  return { title, items }
}

export function parseCsvText(text: string): { title: string; items: string[] } {
  const lines = text.trim().split('\n').filter((l) => l.trim())
  if (lines.length === 0) return { title: '', items: [] }

  // If CSV has header row, use it as title; remaining rows as items
  const title = lines[0].replace(/["']/g, '').trim()
  const items = lines.slice(1).map((l) => l.replace(/["']/g, '').trim()).filter(Boolean)
  return { title, items }
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>(() => load())

  const persistAndSet = useCallback((updated: Project[]) => {
    save(updated)
    setProjects(updated)
  }, [])

  // --- Projects ---
  const createProject = useCallback(
    (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'todoLists'>) => {
      const project: Project = {
        ...data,
        id: generateId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        todoLists: [],
      }
      const updated = [...projects, project]
      persistAndSet(updated)
      return project
    },
    [projects, persistAndSet]
  )

  const updateProject = useCallback(
    (id: string, data: Partial<Omit<Project, 'id' | 'createdAt' | 'todoLists'>>) => {
      const updated = projects.map((p) =>
        p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p
      )
      persistAndSet(updated)
    },
    [projects, persistAndSet]
  )

  const deleteProject = useCallback(
    (id: string) => {
      persistAndSet(projects.filter((p) => p.id !== id))
    },
    [projects, persistAndSet]
  )

  // --- Todo Lists ---
  const addTodoList = useCallback(
    (projectId: string, data: { title: string; items: string[]; subProjectId?: string }) => {
      const list: TodoList = {
        id: generateId(),
        title: data.title,
        createdAt: new Date().toISOString(),
        subProjectId: data.subProjectId,
        items: data.items.map((text) => ({
          id: generateId(),
          text,
          completed: false,
          priority: 'medium' as ItemPriority,
          createdAt: new Date().toISOString(),
        })),
      }
      const updated = projects.map((p) =>
        p.id === projectId
          ? { ...p, todoLists: [...p.todoLists, list], updatedAt: new Date().toISOString() }
          : p
      )
      persistAndSet(updated)
      return list
    },
    [projects, persistAndSet]
  )

  const deleteTodoList = useCallback(
    (projectId: string, listId: string) => {
      const updated = projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              todoLists: p.todoLists.filter((l) => l.id !== listId),
              updatedAt: new Date().toISOString(),
            }
          : p
      )
      persistAndSet(updated)
    },
    [projects, persistAndSet]
  )

  const transferTodoList = useCallback(
    (projectId: string, listId: string, newSubProjectId: string | undefined) => {
      const updated = projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              updatedAt: new Date().toISOString(),
              todoLists: p.todoLists.map((l) =>
                l.id === listId ? { ...l, subProjectId: newSubProjectId } : l
              ),
            }
          : p
      )
      persistAndSet(updated)
    },
    [projects, persistAndSet]
  )

  // --- Todo Items ---
  const addTodoItem = useCallback(
    (projectId: string, listId: string, text: string, priority: ItemPriority = 'medium') => {
      const item: TodoItem = {
        id: generateId(),
        text,
        completed: false,
        priority,
        createdAt: new Date().toISOString(),
      }
      const updated = projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              updatedAt: new Date().toISOString(),
              todoLists: p.todoLists.map((l) =>
                l.id === listId ? { ...l, items: [...l.items, item] } : l
              ),
            }
          : p
      )
      persistAndSet(updated)
    },
    [projects, persistAndSet]
  )

  const toggleTodoItem = useCallback(
    (projectId: string, listId: string, itemId: string) => {
      const updated = projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              updatedAt: new Date().toISOString(),
              todoLists: p.todoLists.map((l) =>
                l.id === listId
                  ? {
                      ...l,
                      items: l.items.map((item) =>
                        item.id === itemId
                          ? {
                              ...item,
                              completed: !item.completed,
                              completedAt: !item.completed ? new Date().toISOString() : undefined,
                            }
                          : item
                      ),
                    }
                  : l
              ),
            }
          : p
      )
      persistAndSet(updated)
    },
    [projects, persistAndSet]
  )

  const updateTodoItem = useCallback(
    (projectId: string, listId: string, itemId: string, data: Partial<Pick<TodoItem, 'text' | 'priority'>>) => {
      const updated = projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              updatedAt: new Date().toISOString(),
              todoLists: p.todoLists.map((l) =>
                l.id === listId
                  ? {
                      ...l,
                      items: l.items.map((item) =>
                        item.id === itemId ? { ...item, ...data } : item
                      ),
                    }
                  : l
              ),
            }
          : p
      )
      persistAndSet(updated)
    },
    [projects, persistAndSet]
  )

  const deleteTodoItem = useCallback(
    (projectId: string, listId: string, itemId: string) => {
      const updated = projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              updatedAt: new Date().toISOString(),
              todoLists: p.todoLists.map((l) =>
                l.id === listId
                  ? { ...l, items: l.items.filter((item) => item.id !== itemId) }
                  : l
              ),
            }
          : p
      )
      persistAndSet(updated)
    },
    [projects, persistAndSet]
  )

  const moveTodoItems = useCallback(
    (projectId: string, sourceListId: string, itemIds: string[], targetListId: string) => {
      const updated = projects.map((p) => {
        if (p.id !== projectId) return p
        const itemsToMove = p.todoLists.find((l) => l.id === sourceListId)?.items.filter((i) => itemIds.includes(i.id)) ?? []
        return {
          ...p,
          updatedAt: new Date().toISOString(),
          todoLists: p.todoLists.map((l) => {
            if (l.id === sourceListId) return { ...l, items: l.items.filter((i) => !itemIds.includes(i.id)) }
            if (l.id === targetListId) return { ...l, items: [...l.items, ...itemsToMove] }
            return l
          }),
        }
      })
      persistAndSet(updated)
    },
    [projects, persistAndSet]
  )

  const addAttachment = useCallback(
    (projectId: string, attachment: Attachment) => {
      const updated = projects.map((p) =>
        p.id === projectId
          ? { ...p, attachments: [...(p.attachments ?? []), attachment], updatedAt: new Date().toISOString() }
          : p
      )
      persistAndSet(updated)
    },
    [projects, persistAndSet]
  )

  const deleteAttachment = useCallback(
    (projectId: string, attachmentId: string) => {
      const updated = projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              attachments: (p.attachments ?? []).filter((a) => a.id !== attachmentId),
              updatedAt: new Date().toISOString(),
            }
          : p
      )
      persistAndSet(updated)
    },
    [projects, persistAndSet]
  )

  const duplicateProject = useCallback(
    (id: string) => {
      const source = projects.find((p) => p.id === id)
      if (!source) return
      const now = new Date().toISOString()
      const copy: Project = {
        ...source,
        id: generateId(),
        name: `${source.name} (copie)`,
        createdAt: now,
        updatedAt: now,
        todoLists: source.todoLists.map((l) => ({
          ...l,
          id: generateId(),
          createdAt: now,
          items: l.items.map((item) => ({
            ...item,
            id: generateId(),
            completed: false,
            completedAt: undefined,
            createdAt: now,
          })),
        })),
      }
      persistAndSet([...projects, copy])
    },
    [projects, persistAndSet]
  )

  const importProjects = useCallback(
    (rawProjects: unknown[]): ImportProjectsResult => {
      const normalized = rawProjects.map(normalizeImportedProject).filter((p): p is Project => p !== null)
      if (normalized.length > 0) persistAndSet([...projects, ...normalized])
      return { imported: normalized.length, skipped: rawProjects.length - normalized.length }
    },
    [projects, persistAndSet]
  )

  return {
    projects,
    createProject,
    updateProject,
    deleteProject,
    duplicateProject,
    importProjects,
    addAttachment,
    deleteAttachment,
    addTodoList,
    deleteTodoList,
    transferTodoList,
    addTodoItem,
    toggleTodoItem,
    updateTodoItem,
    deleteTodoItem,
    moveTodoItems,
  }
}
