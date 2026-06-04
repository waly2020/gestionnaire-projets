import * as React from 'react'
import { FolderOpen, Sun, Moon, BookOpen, BarChart2 } from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import { useTheme } from './theme-provider'
import { cn } from '@workspace/ui/lib/utils'
import type { AppView } from '../App'

interface NavHeaderProps {
  currentView: AppView
  onNavigate: (view: AppView) => void
  actions?: React.ReactNode
}

export function NavHeader({ currentView, onNavigate, actions }: NavHeaderProps) {
  const { theme, setTheme } = useTheme()

  return (
    <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur px-6 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <FolderOpen className="h-4 w-4" />
            </div>
            <span className="text-base font-bold hidden sm:block">Project Manager</span>
          </div>
          <nav className="flex items-center gap-0.5">
            <NavTab
              active={currentView === 'dashboard'}
              onClick={() => onNavigate('dashboard')}
            >
              <FolderOpen className="h-3.5 w-3.5" />
              Projets
            </NavTab>
            <NavTab
              active={currentView === 'library'}
              onClick={() => onNavigate('library')}
            >
              <BookOpen className="h-3.5 w-3.5" />
              Bibliothèque
            </NavTab>
            <NavTab
              active={currentView === 'stats'}
              onClick={() => onNavigate('stats')}
            >
              <BarChart2 className="h-3.5 w-3.5" />
              Statistiques
            </NavTab>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          {actions}
        </div>
      </div>
    </header>
  )
}

function NavTab({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
        active
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
      )}
    >
      {children}
    </button>
  )
}
