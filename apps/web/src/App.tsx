import * as React from 'react'
import { useProjects } from './hooks/useProjects'
import { useLibrary } from './hooks/useLibrary'
import { Dashboard } from './components/Dashboard'
import { ProjectDetail } from './components/ProjectDetail'
import { LibraryDashboard } from './components/LibraryDashboard'
import { StatsDashboard } from './components/StatsDashboard'

export type AppView = 'dashboard' | 'project-detail' | 'library' | 'stats'

export function App() {
  const [view, setView] = React.useState<AppView>('dashboard')
  const [selectedProjectId, setSelectedProjectId] = React.useState<string | null>(null)

  const {
    projects,
    createProject,
    updateProject,
    deleteProject,
    duplicateProject,
    importProjects,
    addTodoList,
    deleteTodoList,
    transferTodoList,
    addTodoItem,
    toggleTodoItem,
    updateTodoItem,
    deleteTodoItem,
    moveTodoItems,
    addAttachment,
    deleteAttachment,
  } = useProjects()

  const {
    library,
    addLanguage, updateLanguage, deleteLanguage,
    addFramework, updateFramework, deleteFramework,
    addBadge, updateBadge, deleteBadge,
  } = useLibrary()

  const selectedProject = selectedProjectId ? projects.find((p) => p.id === selectedProjectId) : null

  const goToProject = (id: string) => {
    setSelectedProjectId(id)
    setView('project-detail')
  }

  const goToDashboard = () => {
    setView('dashboard')
    setSelectedProjectId(null)
  }

  const handleDeleteProject = (id: string) => {
    deleteProject(id)
    if (selectedProjectId === id) goToDashboard()
  }

  if (view === 'project-detail' && selectedProject) {
    return (
      <ProjectDetail
        project={selectedProject}
        library={library}
        onBack={goToDashboard}
        onUpdateProject={updateProject}
        onDeleteProject={handleDeleteProject}
        onAddTodoList={addTodoList}
        onDeleteTodoList={deleteTodoList}
        onTransferTodoList={transferTodoList}
        onMoveTodoItems={moveTodoItems}
        onAddTodoItem={addTodoItem}
        onToggleTodoItem={toggleTodoItem}
        onUpdateTodoItem={updateTodoItem}
        onDeleteTodoItem={deleteTodoItem}
        onAddAttachment={addAttachment}
        onDeleteAttachment={deleteAttachment}
      />
    )
  }

  if (view === 'library') {
    return (
      <LibraryDashboard
        library={library}
        projects={projects}
        onAddLanguage={addLanguage}
        onUpdateLanguage={updateLanguage}
        onDeleteLanguage={deleteLanguage}
        onAddFramework={addFramework}
        onUpdateFramework={updateFramework}
        onDeleteFramework={deleteFramework}
        onAddBadge={addBadge}
        onUpdateBadge={updateBadge}
        onDeleteBadge={deleteBadge}
        onNavigate={setView}
      />
    )
  }

  if (view === 'stats') {
    return (
      <StatsDashboard
        projects={projects}
        library={library}
        onNavigate={setView}
      />
    )
  }

  return (
    <Dashboard
      projects={projects}
      library={library}
      onSelectProject={goToProject}
      onCreateProject={createProject}
      onUpdateProject={updateProject}
      onDeleteProject={handleDeleteProject}
      onDuplicateProject={duplicateProject}
      onImportProjects={importProjects}
      onNavigate={setView}
    />
  )
}
