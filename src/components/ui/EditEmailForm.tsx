'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function EditEmailForm({ currentEmail }: { currentEmail: string }) {
  const [email, setEmail] = useState(currentEmail)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (res.ok) {
        setIsError(false)
        setMessage('Email updated successfully.')
      } else {
        setIsError(true)
        setMessage(data.error ?? 'Failed to update email.')
      }
    } catch {
      setIsError(true)
      setMessage('An error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Email Address</label>
        <input
          suppressHydrationWarning
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded-lg bg-card border border-border px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      {message && (
        <p className={`text-sm ${isError ? 'text-destructive' : 'text-secondary'}`}>{message}</p>
      )}
      <Button type="submit" disabled={loading} className="bg-primary hover:bg-primary/90 text-white">
        {loading ? 'Saving…' : 'Save Email'}
      </Button>
    </form>
  )
}
