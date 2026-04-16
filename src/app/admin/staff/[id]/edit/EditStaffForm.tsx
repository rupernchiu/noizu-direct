'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface StaffUser {
  id: string; name: string; email: string; department: string | null
  isActive: boolean; isSuperAdmin: boolean
}

export function EditStaffForm({ user }: { user: StaffUser }) {
  const router = useRouter()
  const [form, setForm] = useState({
    name: user.name, email: user.email,
    department: user.department ?? '',
    isActive: user.isActive, isSuperAdmin: user.isSuperAdmin,
    newPassword: '', confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function set(field: keyof typeof form, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (form.newPassword && form.newPassword.length < 8) {
      setError('New password must be at least 8 characters'); return
    }
    if (form.newPassword && form.newPassword !== form.confirmPassword) {
      setError('Passwords do not match'); return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/staff/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name, email: form.email,
          department: form.department || null,
          isActive: form.isActive,
          isSuperAdmin: form.isSuperAdmin,
          newPassword: form.newPassword || null,
        }),
      })
      const data = await res.json().catch(() => ({})) as { error?: string }
      if (!res.ok) { setError(data.error ?? 'Failed to update'); return }
      router.push('/admin/staff')
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'w-full px-3 py-2 rounded-lg bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-primary outline-none transition-colors'

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <p className="px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">{error}</p>
      )}

      <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Account Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Full Name *</label>
            <input suppressHydrationWarning value={form.name} onChange={(e) => set('name', e.target.value)} required className={inputClass} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Email *</label>
            <input suppressHydrationWarning type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required className={inputClass} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Department</label>
            <input suppressHydrationWarning value={form.department} onChange={(e) => set('department', e.target.value)} placeholder="Support, Trust & Safety…" className={inputClass} />
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-1">
          <label className="flex items-center gap-3 cursor-pointer">
            <input suppressHydrationWarning type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} className="w-4 h-4 rounded border-border accent-primary" />
            <span className="text-sm font-medium text-foreground">Active account</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input suppressHydrationWarning type="checkbox" checked={form.isSuperAdmin} onChange={(e) => set('isSuperAdmin', e.target.checked)} className="w-4 h-4 rounded border-border accent-primary" />
            <div>
              <span className="text-sm font-medium text-foreground">Super Admin</span>
              <p className="text-xs text-muted-foreground">Bypasses all permission checks.</p>
            </div>
          </label>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Reset Password</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Leave blank to keep current password.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">New Password</label>
            <input suppressHydrationWarning type="password" value={form.newPassword} onChange={(e) => set('newPassword', e.target.value)} minLength={8} placeholder="Min. 8 characters" className={inputClass} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Confirm New Password</label>
            <input suppressHydrationWarning type="password" value={form.confirmPassword} onChange={(e) => set('confirmPassword', e.target.value)} placeholder="Repeat new password" className={inputClass} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <button type="button" onClick={() => router.push('/admin/staff')} className="px-4 py-2 rounded-lg text-sm font-medium bg-border text-muted-foreground hover:text-foreground transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}
