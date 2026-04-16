'use client'

import { useState, useEffect } from 'react'
import { DndContext, closestCenter, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Pencil, Trash2, Plus, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NavItemEditor } from './NavItemEditor'

interface NavItemData {
  id: string
  label: string
  url: string
  navType: string
  position: string
  order: number
  dropdownType: string
  dropdownContent: string
  openInNewTab: boolean
  isActive: boolean
}

const DROPDOWN_LABELS: Record<string, string> = {
  NONE: '—',
  SIMPLE_LIST: 'List',
  MEGA_MENU: 'Mega',
  FEATURE_CARD: 'Feature',
}

export function NavBuilder({ navType }: { navType: 'PRIMARY' | 'SECONDARY' }) {
  const [items, setItems] = useState<NavItemData[]>([])
  const [loading, setLoading] = useState(true)
  const [editItem, setEditItem] = useState<NavItemData | null | undefined>(undefined) // undefined = closed, null = new
  const [saving, setSaving] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/nav')
      const data = await res.json() as NavItemData[]
      setItems(data.filter(i => i.navType === navType).sort((a, b) => a.order - b.order))
    } catch { /* ignore */ } finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [navType])  // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = items.findIndex(i => i.id === active.id)
    const newIdx = items.findIndex(i => i.id === over.id)
    const reordered = arrayMove(items, oldIdx, newIdx).map((item, idx) => ({ ...item, order: idx }))
    setItems(reordered)
    setSaving(true)
    try {
      await fetch('/api/admin/nav', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reordered.map(i => ({ id: i.id, order: i.order, position: i.position }))),
      })
    } catch { /* ignore */ } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this nav item?')) return
    await fetch(`/api/admin/nav/${id}`, { method: 'DELETE' })
    void load()
  }

  async function handleToggle(item: NavItemData) {
    await fetch(`/api/admin/nav/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !item.isActive }),
    })
    void load()
  }

  if (loading) return <div className="text-sm text-muted-foreground py-6 text-center">Loading…</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">{items.length} item{items.length !== 1 ? 's' : ''}{saving && ' · saving…'}</p>
        <Button size="sm" onClick={() => setEditItem(null)}>
          <Plus className="size-4 mr-1" /> Add Item
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          No nav items yet. Add your first one.
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => void handleDragEnd(e)}>
          <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {items.map(item => (
                <SortableNavItem
                  key={item.id}
                  item={item}
                  onEdit={() => setEditItem(item)}
                  onDelete={() => void handleDelete(item.id)}
                  onToggle={() => void handleToggle(item)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {editItem !== undefined && (
        <NavItemEditor
          item={editItem}
          onSave={() => { setEditItem(undefined); void load() }}
          onClose={() => setEditItem(undefined)}
        />
      )}
    </div>
  )
}

function SortableNavItem({
  item, onEdit, onDelete, onToggle,
}: {
  item: NavItemData
  onEdit: () => void
  onDelete: () => void
  onToggle: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 p-3 rounded-xl border border-border bg-card transition-shadow ${isDragging ? 'shadow-xl opacity-70' : ''}`}
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground">
        <GripVertical className="size-4" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${item.isActive ? 'text-foreground' : 'text-muted-foreground line-through'}`}>
            {item.label}
          </span>
          {item.dropdownType !== 'NONE' && (
            <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
              {DROPDOWN_LABELS[item.dropdownType]}
            </span>
          )}
          <span className="text-[10px] text-muted-foreground bg-surface px-1.5 py-0.5 rounded">
            {item.position}
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{item.url}</p>
      </div>

      <div className="flex items-center gap-1">
        <button suppressHydrationWarning type="button" onClick={onToggle} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors" title={item.isActive ? 'Deactivate' : 'Activate'}>
          {item.isActive ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
        </button>
        <button suppressHydrationWarning type="button" onClick={onEdit} className="p-1.5 text-muted-foreground hover:text-primary transition-colors" title="Edit">
          <Pencil className="size-4" />
        </button>
        <button suppressHydrationWarning type="button" onClick={onDelete} className="p-1.5 text-muted-foreground hover:text-red-400 transition-colors" title="Delete">
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  )
}
