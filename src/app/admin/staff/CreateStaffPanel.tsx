'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const inputClass =
  'w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-primary outline-none transition-colors'

export function CreateStaffPanel() {
  const router = useRouter()
  const empty = { name: '', email: '', department: '', password: '', confirmPassword: '', isActive: true, isSuperAdmin: false }
  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')

  function set(field: keyof typeof form, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          department: form.department || null,
          password: form.password,
          isActive: form.isActive,
          isSuperAdmin: form.isSuperAdmin,
        }),
      })
      const data = await res.json().catch(() => ({})) as { error?: string }
      if (!res.ok) { setError(data.error ?? 'Failed to create user'); return }
      setSuccess(`Staff user "${form.name}" created.`)
      setForm(empty)
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
        <h3 className="text-sm font-semibold text-foreground">New User</h3>
      </div>
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {error && (
          <p className="px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">{error}</p>
        )}
        {success && (
          <p className="px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs">{success}</p>
        )}

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Name <span className="text-destructive">*</span></label>
          <input suppressHydrationWarning value={form.name} onChange={(e) => set('name', e.target.value)} required placeholder="Jane Smith" className={inputClass} />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Email <span className="text-destructive">*</span></label>
          <input suppressHydrationWarning type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required placeholder="jane@noizu.direct" className={inputClass} />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Department</label>
          <input suppressHydrationWarning value={form.department} onChange={(e) => set('department', e.target.value)} placeholder="e.g. Support, Finance" className={inputClass} />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Password <span className="text-destructive">*</span></label>
          <input suppressHydrationWarning type="password" value={form.password} onChange={(e) => set('password', e.target.value)} required minLength={8} placeholder="Min. 8 characters" className={inputClass} />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Confirm Password <span className="text-destructive">*</span></label>
          <input suppressHydrationWarning type="password" value={form.confirmPassword} onChange={(e) => set('confirmPassword', e.target.value)} required placeholder="Repeat password" className={inputClass} />
        </div>

        <div className="space-y-3 pt-1">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input suppressHydrationWarning type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} className="w-4 h-4 rounded border-border accent-primary" />
            <span className="text-sm text-foreground">Active</span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input suppressHydrationWarning type="checkbox" checked={form.isSuperAdmin} onChange={(e) => set('isSuperAdmin', e.target.checked)} className="w-4 h-4 mt-0.5 rounded border-border accent-destructive" />
            <div>
              <span className="text-sm font-medium text-destructive">Super Admin</span>
              <p className="text-[11px] text-destructive/70 mt-0.5">— bypasses every permission check</p>
            </div>
          </label>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={() => { setForm(empty); setError(''); setSuccess('') }}
            className="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-border text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Creating…' : 'Create user'}
          </button>
        </div>
      </form>
    </div>
  )
}
