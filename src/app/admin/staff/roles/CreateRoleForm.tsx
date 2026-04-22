'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const inputClass = 'w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-primary outline-none transition-colors'

export function CreateRoleForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!name.trim()) { setError('Name is required'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/staff/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: desc.trim() || null }),
      })
      const data = await res.json().catch(() => ({})) as { error?: string }
      if (!res.ok) { setError(data.error ?? 'Failed to create role'); return }
      setSuccess(`Role "${name.trim()}" created.`)
      setName('')
      setDesc('')
      router.refresh()
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden sticky top-4">
      <div className="px-5 py-4 border-b border-border bg-background/40">
        <h3 className="text-sm font-semibold text-foreground">New Role</h3>
      </div>
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <div className="px-3 py-2.5 rounded-lg bg-primary/5 border border-primary/20 text-xs text-muted-foreground leading-relaxed">
          Roles are optional presets for documentation purposes only. They are <strong className="text-foreground">not</strong> enforced at runtime — permissions are granted directly to each user.
        </div>

        {error && (
          <p id="role-error" role="alert" className="px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">{error}</p>
        )}
        {success && (
          <p className="px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs">{success}</p>
        )}

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Role name <span className="text-destructive">*</span></label>
          <input suppressHydrationWarning aria-invalid={!!error || undefined} aria-describedby={error ? 'role-error' : undefined} value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. content_moderator" className={inputClass} />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Description</label>
          <textarea suppressHydrationWarning aria-invalid={!!error || undefined} aria-describedby={error ? 'role-error' : undefined} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What does this role do?" rows={3} className={inputClass + ' resize-none'} />
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => { setName(''); setDesc(''); setError(''); setSuccess('') }}
            className="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-border text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Creating…' : 'Create role'}
          </button>
        </div>
      </form>
    </div>
  )
}
