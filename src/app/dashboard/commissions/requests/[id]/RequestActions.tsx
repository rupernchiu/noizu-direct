'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export function RequestActions({ id }: { id: string }) {
  const router = useRouter()
  const [mode, setMode] = useState<'idle' | 'declining'>('idle')
  const [showDecline, setShowDecline] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function onDecline() {
    setMode('declining'); setError(null)
    const res = await fetch(`/api/commissions/requests/${id}/decline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error ?? 'Failed to decline')
      setMode('idle')
      return
    }
    router.push('/dashboard/commissions')
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Link href={`/dashboard/commissions/quotes/new?requestId=${id}`} className="text-sm px-5 py-2.5 rounded-lg bg-primary text-white hover:bg-primary/90">
          Send quote
        </Link>
        <button onClick={() => setShowDecline(v => !v)} disabled={mode !== 'idle'} className="text-sm px-5 py-2.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-foreground">
          Decline
        </button>
      </div>
      {showDecline && (
        <div className="space-y-2">
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            maxLength={500}
            placeholder="Reason (optional)"
            className="w-full text-sm p-3 rounded-lg bg-card border border-border text-foreground"
            rows={3}
          />
          <button onClick={onDecline} disabled={mode === 'declining'} className="text-sm px-4 py-2 rounded-lg border border-border text-red-400 hover:border-red-400/50 disabled:opacity-50">
            {mode === 'declining' ? 'Declining…' : 'Confirm decline'}
          </button>
        </div>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
