import { useState, useCallback } from 'react'
import type { Language, Framework, BadgeTemplate, Library, FrameworkCategory } from '../types'

const STORAGE_KEY = 'pm_library'

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

const DEFAULT_LANGUAGES: Language[] = [
  { id: 'js', name: 'JavaScript', color: '#f7df1e' },
  { id: 'ts', name: 'TypeScript', color: '#3178c6' },
  { id: 'py', name: 'Python', color: '#3572a5' },
  { id: 'java', name: 'Java', color: '#b07219' },
  { id: 'kotlin', name: 'Kotlin', color: '#7f52ff' },
  { id: 'swift', name: 'Swift', color: '#fa7343' },
  { id: 'cs', name: 'C#', color: '#178600' },
  { id: 'cpp', name: 'C++', color: '#f34b7d' },
  { id: 'go', name: 'Go', color: '#00add8' },
  { id: 'rust', name: 'Rust', color: '#dea584' },
  { id: 'php', name: 'PHP', color: '#4f5d95' },
  { id: 'ruby', name: 'Ruby', color: '#701516' },
  { id: 'dart', name: 'Dart', color: '#00b4ab' },
  { id: 'html', name: 'HTML', color: '#e34c26' },
  { id: 'css', name: 'CSS', color: '#563d7c' },
  { id: 'sql', name: 'SQL', color: '#f29111' },
  { id: 'r', name: 'R', color: '#198ce7' },
  { id: 'scala', name: 'Scala', color: '#c22d40' },
  { id: 'elixir', name: 'Elixir', color: '#6e4a7e' },
  { id: 'bash', name: 'Bash / Shell', color: '#89e051' },
]

const DEFAULT_FRAMEWORKS: Framework[] = [
  // Frontend
  { id: 'react', name: 'React', languageIds: ['js', 'ts'], color: '#61dafb', category: 'frontend' },
  { id: 'vue', name: 'Vue.js', languageIds: ['js', 'ts'], color: '#42b883', category: 'frontend' },
  { id: 'angular', name: 'Angular', languageIds: ['ts'], color: '#dd0031', category: 'frontend' },
  { id: 'svelte', name: 'Svelte', languageIds: ['js', 'ts'], color: '#ff3e00', category: 'frontend' },
  { id: 'astro', name: 'Astro', languageIds: ['js', 'ts'], color: '#ff5d01', category: 'frontend' },
  // Fullstack / Meta-frameworks
  { id: 'nextjs', name: 'Next.js', languageIds: ['js', 'ts'], color: '#000000', category: 'fullstack' },
  { id: 'nuxtjs', name: 'Nuxt.js', languageIds: ['js', 'ts'], color: '#00dc82', category: 'fullstack' },
  { id: 'remix', name: 'Remix', languageIds: ['js', 'ts'], color: '#3992ff', category: 'fullstack' },
  // Backend JS/TS
  { id: 'express', name: 'Express.js', languageIds: ['js', 'ts'], color: '#404040', category: 'backend' },
  { id: 'nestjs', name: 'NestJS', languageIds: ['ts'], color: '#ea2845', category: 'backend' },
  { id: 'hono', name: 'Hono', languageIds: ['js', 'ts'], color: '#e36002', category: 'backend' },
  // Backend Python
  { id: 'fastapi', name: 'FastAPI', languageIds: ['py'], color: '#009688', category: 'backend' },
  { id: 'django', name: 'Django', languageIds: ['py'], color: '#092e20', category: 'backend' },
  { id: 'flask', name: 'Flask', languageIds: ['py'], color: '#000000', category: 'backend' },
  // Backend Java/Kotlin
  { id: 'springboot', name: 'Spring Boot', languageIds: ['java', 'kotlin'], color: '#6db33f', category: 'backend' },
  { id: 'quarkus', name: 'Quarkus', languageIds: ['java', 'kotlin'], color: '#4695eb', category: 'backend' },
  // Backend PHP/Ruby
  { id: 'laravel', name: 'Laravel', languageIds: ['php'], color: '#ff2d20', category: 'backend' },
  { id: 'rails', name: 'Ruby on Rails', languageIds: ['ruby'], color: '#cc0000', category: 'backend' },
  // Backend C#
  { id: 'dotnet', name: 'ASP.NET Core', languageIds: ['cs'], color: '#512bd4', category: 'backend' },
  // Backend Go
  { id: 'gin', name: 'Gin', languageIds: ['go'], color: '#00add8', category: 'backend' },
  { id: 'fiber', name: 'Fiber', languageIds: ['go'], color: '#00add8', category: 'backend' },
  // Mobile
  { id: 'flutter', name: 'Flutter', languageIds: ['dart'], color: '#02569b', category: 'mobile' },
  { id: 'reactnative', name: 'React Native', languageIds: ['js', 'ts'], color: '#61dafb', category: 'mobile' },
  { id: 'swiftui', name: 'SwiftUI', languageIds: ['swift'], color: '#fa7343', category: 'mobile' },
  { id: 'compose', name: 'Jetpack Compose', languageIds: ['kotlin'], color: '#7f52ff', category: 'mobile' },
  // Style
  { id: 'tailwind', name: 'Tailwind CSS', languageIds: ['css', 'html'], color: '#38bdf8', category: 'style' },
  { id: 'bootstrap', name: 'Bootstrap', languageIds: ['css', 'html'], color: '#7952b3', category: 'style' },
  { id: 'mui', name: 'Material UI', languageIds: ['js', 'ts'], color: '#007fff', category: 'style' },
  // DevOps
  { id: 'docker', name: 'Docker', languageIds: [], color: '#2496ed', category: 'devops' },
  { id: 'kubernetes', name: 'Kubernetes', languageIds: [], color: '#326ce5', category: 'devops' },
  { id: 'terraform', name: 'Terraform', languageIds: [], color: '#7b42bc', category: 'devops' },
  // Testing
  { id: 'jest', name: 'Jest', languageIds: ['js', 'ts'], color: '#c21325', category: 'testing' },
  { id: 'pytest', name: 'Pytest', languageIds: ['py'], color: '#3572a5', category: 'testing' },
  { id: 'cypress', name: 'Cypress', languageIds: ['js', 'ts'], color: '#17202c', category: 'testing' },
  { id: 'playwright', name: 'Playwright', languageIds: ['js', 'ts', 'py'], color: '#2ead33', category: 'testing' },
]

const DEFAULT_BADGES: BadgeTemplate[] = [
  { id: 'client', name: 'Client', color: '#6366f1' },
  { id: 'urgent', name: 'Urgent', color: '#ef4444' },
  { id: 'opensource', name: 'Open Source', color: '#22c55e' },
  { id: 'mvp', name: 'MVP', color: '#f97316' },
  { id: 'production', name: 'Production', color: '#14b8a6' },
  { id: 'internal', name: 'Interne', color: '#64748b' },
  { id: 'poc', name: 'POC', color: '#8b5cf6' },
  { id: 'maintenance', name: 'Maintenance', color: '#eab308' },
  { id: 'r_d', name: 'R&D', color: '#ec4899' },
  { id: 'freelance', name: 'Freelance', color: '#0ea5e9' },
]

function load(): Library {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { languages: DEFAULT_LANGUAGES, frameworks: DEFAULT_FRAMEWORKS, badges: DEFAULT_BADGES }
}

function save(lib: Library): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lib))
}

export function useLibrary() {
  const [library, setLibrary] = useState<Library>(() => load())

  const persistAndSet = useCallback((updated: Library) => {
    save(updated)
    setLibrary(updated)
  }, [])

  // Languages
  const addLanguage = useCallback((data: Omit<Language, 'id'>) => {
    const lang: Language = { ...data, id: generateId() }
    const updated = { ...library, languages: [...library.languages, lang] }
    persistAndSet(updated)
    return lang
  }, [library, persistAndSet])

  const updateLanguage = useCallback((id: string, data: Partial<Omit<Language, 'id'>>) => {
    persistAndSet({
      ...library,
      languages: library.languages.map((l) => l.id === id ? { ...l, ...data } : l),
    })
  }, [library, persistAndSet])

  const deleteLanguage = useCallback((id: string) => {
    persistAndSet({
      ...library,
      languages: library.languages.filter((l) => l.id !== id),
      frameworks: library.frameworks.map((f) => ({
        ...f,
        languageIds: f.languageIds.filter((lid) => lid !== id),
      })),
    })
  }, [library, persistAndSet])

  // Frameworks
  const addFramework = useCallback((data: Omit<Framework, 'id'>) => {
    const fw: Framework = { ...data, id: generateId() }
    const updated = { ...library, frameworks: [...library.frameworks, fw] }
    persistAndSet(updated)
    return fw
  }, [library, persistAndSet])

  const updateFramework = useCallback((id: string, data: Partial<Omit<Framework, 'id'>>) => {
    persistAndSet({
      ...library,
      frameworks: library.frameworks.map((f) => f.id === id ? { ...f, ...data } : f),
    })
  }, [library, persistAndSet])

  const deleteFramework = useCallback((id: string) => {
    persistAndSet({
      ...library,
      frameworks: library.frameworks.filter((f) => f.id !== id),
    })
  }, [library, persistAndSet])

  // Badges
  const addBadge = useCallback((data: Omit<BadgeTemplate, 'id'>) => {
    const badge: BadgeTemplate = { ...data, id: generateId() }
    const updated = { ...library, badges: [...library.badges, badge] }
    persistAndSet(updated)
    return badge
  }, [library, persistAndSet])

  const updateBadge = useCallback((id: string, data: Partial<Omit<BadgeTemplate, 'id'>>) => {
    persistAndSet({
      ...library,
      badges: library.badges.map((b) => b.id === id ? { ...b, ...data } : b),
    })
  }, [library, persistAndSet])

  const deleteBadge = useCallback((id: string) => {
    persistAndSet({
      ...library,
      badges: library.badges.filter((b) => b.id !== id),
    })
  }, [library, persistAndSet])

  return {
    library,
    addLanguage, updateLanguage, deleteLanguage,
    addFramework, updateFramework, deleteFramework,
    addBadge, updateBadge, deleteBadge,
  }
}

export type { FrameworkCategory }
