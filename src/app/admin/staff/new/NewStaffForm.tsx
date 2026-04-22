'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function NewStaffForm() {
  const router = useRouter()
  const [form, setForm] = useState({
    name: '', email: '', department: '', password: '', confirmPassword: '', isSuperAdmin: false,
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function set(field: keyof typeof form, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
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
          isSuperAdmin: form.isSuperAdmin,
        }),
      })
      const data = await res.json().catch(() => ({})) as { error?: string }
      if (!res.ok) { setError(data.error ?? 'Failed to create staff user'); return }
      router.push('/admin/staff')
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'w-full px-3 py-2 rounded-lg bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-primary outline-none transition-colors'

  return (
    <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-xl p-6 space-y-4">
      {error && (
        <p id="new-staff-error" role="alert" className="px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">{error}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Full Name *</label>
          <input suppressHydrationWarning aria-invalid={!!error || undefined} aria-describedby={error ? 'new-staff-error' : undefined} value={form.name} onChange={(e) => set('name', e.target.value)} required placeholder="Jane Smith" className={inputClass} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Email *</label>
          <input suppressHydrationWarning aria-invalid={!!error || undefined} aria-describedby={error ? 'new-staff-error' : undefined} type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required placeholder="jane@company.com" className={inputClass} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Department</label>
          <input suppressHydrationWarning aria-invalid={!!error || undefined} aria-describedby={error ? 'new-staff-error' : undefined} value={form.department} onChange={(e) => set('department', e.target.value)} placeholder="Support, Trust & Safety…" className={inputClass} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Password *</label>
          <input suppressHydrationWarning aria-invalid={!!error || undefined} aria-describedby={error ? 'new-staff-error' : undefined} type="password" value={form.password} onChange={(e) => set('password', e.target.value)} required minLength={8} placeholder="Min. 8 characters" className={inputClass} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Confirm Password *</label>
          <input suppressHydrationWarning aria-invalid={!!error || undefined} aria-describedby={error ? 'new-staff-error' : undefined} type="password" value={form.confirmPassword} onChange={(e) => set('confirmPassword', e.target.value)} required placeholder="Repeat password" className={inputClass} />
        </div>
      </div>

      <label className="flex items-center gap-3 cursor-pointer">
        <input
          suppressHydrationWarning
          type="checkbox"
          checked={form.isSuperAdmin}
          onChange={(e) => set('isSuperAdmin', e.target.checked)}
          className="w-4 h-4 rounded border-border accent-primary"
        />
        <div>
          <span className="text-sm font-medium text-foreground">Super Admin</span>
          <p className="text-xs text-muted-foreground">Bypasses all permission checks. Grant sparingly.</p>
        </div>
      </label>

      <div className="flex items-center justify-end gap-3 pt-2">
        <button type="button" onClick={() => router.push('/admin/staff')} className="px-4 py-2 rounded-lg text-sm font-medium bg-border text-muted-foreground hover:text-foreground transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          {saving ? 'Creating…' : 'Create Staff User'}
        </button>
      </div>
    </form>
  )
}
