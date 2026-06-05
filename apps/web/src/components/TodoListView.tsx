import * as React from 'react'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { Checkbox } from '@workspace/ui/components/checkbox'
import { Progress } from '@workspace/ui/components/progress'
import { Badge } from '@workspace/ui/components/badge'
import { Trash2, Plus, ChevronDown, ChevronUp, Download, Check, X, ArrowRightLeft, ListChecks } from 'lucide-react'
import type { TodoList, TodoItem, ItemPriority } from '../types'
import { cn } from '@workspace/ui/lib/utils'

interface MoveTarget {
  id: string | undefined
  label: string
}

interface Props {
  list: TodoList
  projectId: string
  searchQuery?: string
  filterCompletion?: 'all' | 'active' | 'done'
  /** Targets pour déplacer la liste entière vers un autre composant */
  moveTargets?: MoveTarget[]
  /** Listes disponibles comme destination pour les tâches sélectionnées */
  availableLists?: { id: string; title: string; sectionLabel?: string }[]
  onToggleItem: (listId: string, itemId: string) => void
  onAddItem: (listId: string, text: string, priority: ItemPriority) => void
  onUpdateItem: (listId: string, itemId: string, data: { text?: string; priority?: ItemPriority }) => void
  onDeleteItem: (listId: string, itemId: string) => void
  onDeleteList: (listId: string) => void
  onMove?: (listId: string, newSubProjectId: string | undefined) => void
  onMoveItems?: (itemIds: string[], targetListId: string) => void
}

const PRIORITY_LABELS: Record<ItemPriority, string> = { low: 'Basse', medium: 'Moyenne', high: 'Haute' }
const PRIORITY_VARIANTS: Record<ItemPriority, 'info' | 'warning' | 'destructive'> = {
  low: 'info',
  medium: 'warning',
  high: 'destructive',
}

function exportList(list: TodoList) {
  const lines = [
    list.title,
    '',
    ...list.items.map((item, i) => `${i + 1}. [${item.completed ? 'x' : ' '}] ${item.text}`),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${list.title.slice(0, 40).replace(/[^a-z0-9]/gi, '_')}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

export function TodoListView({
  list,
  searchQuery = '',
  filterCompletion = 'all',
  moveTargets,
  availableLists,
  onToggleItem,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onDeleteList,
  onMove,
  onMoveItems,
}: Props) {
  const [collapsed, setCollapsed] = React.useState(false)
  const [newText, setNewText] = React.useState('')
  const [newPriority, setNewPriority] = React.useState<ItemPriority>('medium')
  const [confirmDelete, setConfirmDelete] = React.useState(false)
  const [selectionMode, setSelectionMode] = React.useState(false)
  const [selectedItems, setSelectedItems] = React.useState<Set<string>>(new Set())
  const [targetListId, setTargetListId] = React.useState('')

  const total = list.items.length
  const done = list.items.filter((i) => i.completed).length
  const progress = total === 0 ? 0 : Math.round((done / total) * 100)

  const isFiltered = searchQuery.trim() !== '' || filterCompletion !== 'all'
  const visibleItems = list.items.filter((item) => {
    if (filterCompletion === 'active' && item.completed) return false
    if (filterCompletion === 'done' && !item.completed) return false
    if (searchQuery.trim() && !item.text.toLowerCase().includes(searchQuery.trim().toLowerCase())) return false
    return true
  })

  const canSelectItems = !!availableLists && availableLists.length > 0 && !!onMoveItems

  const toggleSelection = (itemId: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }

  const exitSelectionMode = () => {
    setSelectionMode(false)
    setSelectedItems(new Set())
    setTargetListId('')
  }

  const handleMoveItems = () => {
    if (!targetListId || selectedItems.size === 0 || !onMoveItems) return
    onMoveItems(Array.from(selectedItems), targetListId)
    exitSelectionMode()
  }

  const addItem = () => {
    const text = newText.trim()
    if (!text) return
    onAddItem(list.id, text, newPriority)
    setNewText('')
  }

  const handleDeleteList = () => {
    if (!confirmDelete) { setConfirmDelete(true); return }
    onDeleteList(list.id)
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="text-muted-foreground hover:text-foreground"
        >
          {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{list.title}</p>
          <div className="flex items-center gap-2 mt-1">
            <Progress value={progress} className="h-1.5 flex-1" />
            <span className="text-xs text-muted-foreground shrink-0">{done}/{total}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {/* Bouton sélection de tâches */}
          {canSelectItems && (
            <Button
              size="icon-xs"
              variant={selectionMode ? 'secondary' : 'ghost'}
              onClick={() => {
                if (selectionMode) exitSelectionMode()
                else setSelectionMode(true)
              }}
              title="Sélectionner des tâches à transférer"
            >
              <ListChecks className="h-3.5 w-3.5" />
            </Button>
          )}
          {/* Déplacer la liste entière vers un composant */}
          {moveTargets && moveTargets.length > 1 && onMove && (
            <div className="flex items-center gap-0.5" title="Déplacer la liste vers...">
              <ArrowRightLeft className="h-3 w-3 text-muted-foreground shrink-0" />
              <select
                value={list.subProjectId ?? ''}
                onChange={(e) => onMove(list.id, e.target.value || undefined)}
                className="h-6 rounded border border-input bg-background px-1 text-[11px] text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {moveTargets.map((t) => (
                  <option key={t.id ?? '__global__'} value={t.id ?? ''}>{t.label}</option>
                ))}
              </select>
            </div>
          )}
          <Button size="icon-xs" variant="ghost" onClick={() => exportList(list)} title="Exporter">
            <Download className="h-3.5 w-3.5" />
          </Button>
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <Button size="xs" variant="destructive" onClick={handleDeleteList}>Confirmer</Button>
              <Button size="xs" variant="outline" onClick={() => setConfirmDelete(false)}>Annuler</Button>
            </div>
          ) : (
            <Button size="icon-xs" variant="ghost" onClick={handleDeleteList} title="Supprimer la liste" className="text-muted-foreground hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {!collapsed && (
        <>
          {/* Items */}
          <div className="divide-y">
            {total === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">Aucune tâche — ajoutez-en une ci-dessous</p>
            )}
            {total > 0 && visibleItems.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                {isFiltered ? 'Aucune tâche ne correspond aux filtres' : 'Aucune tâche'}
              </p>
            )}
            {visibleItems.map((item) => (
              <TodoItemRow
                key={item.id}
                item={item}
                selectionMode={selectionMode}
                selected={selectedItems.has(item.id)}
                onSelect={() => toggleSelection(item.id)}
                onToggle={() => onToggleItem(list.id, item.id)}
                onDelete={() => onDeleteItem(list.id, item.id)}
                onUpdate={(data) => onUpdateItem(list.id, item.id, data)}
              />
            ))}
          </div>

          {/* Barre de transfert de tâches (mode sélection) */}
          {selectionMode && (
            <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 border-t bg-primary/5">
              <span className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{selectedItems.size}</span> tâche(s) sélectionnée(s)
              </span>
              {selectedItems.size > 0 && availableLists && (
                <>
                  <select
                    value={targetListId}
                    onChange={(e) => setTargetListId(e.target.value)}
                    className="h-7 flex-1 min-w-32 rounded border border-input bg-background px-2 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">Choisir une liste destination...</option>
                    {availableLists.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.sectionLabel ? `${l.sectionLabel} › ${l.title}` : l.title}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="xs"
                    disabled={!targetListId}
                    onClick={handleMoveItems}
                  >
                    Transférer
                  </Button>
                </>
              )}
              <Button size="xs" variant="ghost" onClick={exitSelectionMode}>
                Annuler
              </Button>
            </div>
          )}

          {/* Add item */}
          {!selectionMode && (
            <div className="flex items-center gap-2 p-3 border-t bg-muted/30">
              <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem() } }}
                placeholder="Nouvelle tâche... (Entrée pour ajouter)"
                className="h-8 text-sm border-0 bg-transparent shadow-none focus-visible:ring-0 px-0"
              />
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as ItemPriority)}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="low">Basse</option>
                <option value="medium">Moyenne</option>
                <option value="high">Haute</option>
              </select>
              <Button size="xs" onClick={addItem} disabled={!newText.trim()}>Ajouter</Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function TodoItemRow({
  item,
  onToggle,
  onDelete,
  onUpdate,
  selectionMode = false,
  selected = false,
  onSelect,
}: {
  item: TodoItem
  onToggle: () => void
  onDelete: () => void
  onUpdate: (data: { text?: string; priority?: ItemPriority }) => void
  selectionMode?: boolean
  selected?: boolean
  onSelect?: () => void
}) {
  const [editing, setEditing] = React.useState(false)
  const [editText, setEditText] = React.useState(item.text)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  const startEditing = () => {
    if (selectionMode) return
    setEditText(item.text)
    setEditing(true)
  }

  const commitEdit = () => {
    const text = editText.trim()
    if (text && text !== item.text) onUpdate({ text })
    setEditing(false)
  }

  const cancelEdit = () => {
    setEditText(item.text)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-3 px-4 py-2 bg-muted/50">
        <Checkbox
          checked={item.completed}
          onCheckedChange={onToggle}
          className="shrink-0"
          id={`edit-${item.id}`}
        />
        <input
          ref={inputRef}
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); commitEdit() }
            if (e.key === 'Escape') cancelEdit()
          }}
          onBlur={commitEdit}
          className="flex-1 text-sm bg-transparent outline-none border-b-2 border-primary py-0.5"
        />
        <div className="flex items-center gap-1 shrink-0">
          <button onMouseDown={(e) => { e.preventDefault(); commitEdit() }} className="text-primary hover:text-primary/80">
            <Check className="h-3.5 w-3.5" />
          </button>
          <button onMouseDown={(e) => { e.preventDefault(); cancelEdit() }} className="text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex items-start gap-3 px-4 py-2.5 group transition-colors',
        selectionMode ? 'cursor-pointer' : 'hover:bg-muted/30',
        selectionMode && selected ? 'bg-primary/8 hover:bg-primary/12' : selectionMode ? 'hover:bg-muted/20' : '',
        item.completed && !selectionMode && 'opacity-60',
      )}
      onClick={selectionMode ? onSelect : undefined}
    >
      {/* Case de sélection (mode sélection) */}
      {selectionMode && (
        <Checkbox
          checked={selected}
          onCheckedChange={onSelect}
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5 shrink-0 border-primary data-[state=checked]:bg-primary"
          id={`sel-${item.id}`}
        />
      )}
      {/* Case de complétion (mode normal) */}
      {!selectionMode && (
        <Checkbox
          checked={item.completed}
          onCheckedChange={onToggle}
          className="mt-0.5 shrink-0"
          id={`item-${item.id}`}
        />
      )}
      <label
        htmlFor={selectionMode ? `sel-${item.id}` : `item-${item.id}`}
        onDoubleClick={startEditing}
        title={selectionMode ? undefined : 'Double-cliquer pour modifier'}
        className={cn(
          'flex-1 text-sm leading-snug select-none',
          selectionMode ? 'cursor-pointer' : 'cursor-pointer',
          !selectionMode && item.completed && 'line-through text-muted-foreground',
          selectionMode && item.completed && 'text-muted-foreground',
        )}
      >
        {item.text}
      </label>
      <div className="flex items-center gap-1.5 shrink-0">
        <Badge variant={PRIORITY_VARIANTS[item.priority]} className="text-[10px] px-1.5 py-0 h-4">
          {PRIORITY_LABELS[item.priority]}
        </Badge>
        {!selectionMode && (
          <>
            {item.completedAt && (
              <span className="text-[10px] text-muted-foreground hidden group-hover:inline">
                {new Date(item.completedAt).toLocaleDateString('fr-FR')}
              </span>
            )}
            <Button
              size="icon-xs"
              variant="ghost"
              onClick={onDelete}
              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
