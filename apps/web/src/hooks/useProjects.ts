import { useState, useCallback } from 'react'
import type { Project, TodoList, TodoItem, ItemPriority } from '../types'

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
    (projectId: string, data: { title: string; items: string[] }) => {
      const list: TodoList = {
        id: generateId(),
        title: data.title,
        createdAt: new Date().toISOString(),
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

  return {
    projects,
    createProject,
    updateProject,
    deleteProject,
    addTodoList,
    deleteTodoList,
    addTodoItem,
    toggleTodoItem,
    updateTodoItem,
    deleteTodoItem,
  }
}
