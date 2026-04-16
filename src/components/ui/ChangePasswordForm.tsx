'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function ChangePasswordForm() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/account/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, newPassword: next, confirmPassword: confirm }),
      })
      const data = await res.json()
      if (res.ok) {
        setIsError(false)
        setMessage('Password updated successfully.')
        setCurrent('')
        setNext('')
        setConfirm('')
      } else {
        setIsError(true)
        setMessage(data.error ?? 'Failed to update password.')
      }
    } catch {
      setIsError(true)
      setMessage('An error occurred.')
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'w-full rounded-lg bg-card border border-border px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Current Password</label>
        <input
          suppressHydrationWarning
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          required
          autoComplete="current-password"
          className={inputClass}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">New Password</label>
        <input
          suppressHydrationWarning
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          required
          autoComplete="new-password"
          className={inputClass}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Confirm New Password</label>
        <input
          suppressHydrationWarning
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          autoComplete="new-password"
          className={inputClass}
        />
      </div>
      {message && (
        <p className={`text-sm ${isError ? 'text-destructive' : 'text-secondary'}`}>{message}</p>
      )}
      <Button type="submit" disabled={loading} className="bg-primary hover:bg-primary/90 text-white">
        {loading ? 'Updating…' : 'Update Password'}
      </Button>
    </form>
  )
}
