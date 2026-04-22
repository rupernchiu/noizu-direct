'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2, Check, X } from 'lucide-react'

interface Role {
  id: string
  name: string
  description: string | null
}

const inputClass = 'w-full px-3 py-1.5 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-primary outline-none transition-colors'

export function RoleCard({ role }: { role: Role }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(role.name)
  const [desc, setDesc] = useState(role.description ?? '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    if (!name.trim()) { setError('Name is required'); return }
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/staff/roles/${role.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: desc.trim() || null }),
      })
      const data = await res.json().catch(() => ({})) as { error?: string }
      if (!res.ok) { setError(data.error ?? 'Failed to save'); return }
      setEditing(false)
      router.refresh()
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!confirm(`Delete role "${role.name}"? This cannot be undone.`)) return
    setDeleting(true)
    try {
      await fetch(`/api/admin/staff/roles/${role.id}`, { method: 'DELETE' })
      router.refresh()
    } finally {
      setDeleting(false)
    }
  }

  function cancel() {
    setName(role.name)
    setDesc(role.description ?? '')
    setEditing(false)
    setError('')
  }

  if (editing) {
    return (
      <div className="flex items-start gap-3 px-4 py-3 bg-primary/5 border border-primary/20 rounded-xl">
        <div className="flex-1 space-y-2">
          {error && <p id={`role-${role.id}-error`} role="alert" className="text-xs text-destructive">{error}</p>}
          <input suppressHydrationWarning aria-invalid={!!error || undefined} aria-describedby={error ? `role-${role.id}-error` : undefined} value={name} onChange={(e) => setName(e.target.value)} placeholder="Role name" className={inputClass} />
          <input suppressHydrationWarning aria-invalid={!!error || undefined} aria-describedby={error ? `role-${role.id}-error` : undefined} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description (optional)" className={inputClass} />
        </div>
        <div className="flex gap-1 mt-1">
          <button onClick={save} disabled={saving} title="Save" className="p-1.5 rounded-lg text-green-400 hover:bg-green-500/10 transition-colors disabled:opacity-50">
            <Check size={14} />
          </button>
          <button onClick={cancel} title="Cancel" className="p-1.5 rounded-lg text-muted-foreground hover:bg-border transition-colors">
            <X size={14} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{role.name}</p>
        {role.description && (
          <p className="text-xs text-muted-foreground mt-0.5">{role.description}</p>
        )}
      </div>
      <div className="flex gap-1 shrink-0">
        <button onClick={() => setEditing(true)} title="Edit" className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
          <Pencil size={13} />
        </button>
        <button onClick={remove} disabled={deleting} title="Delete" className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}
