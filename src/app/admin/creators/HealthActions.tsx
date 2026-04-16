'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  creatorId: string
  displayName: string
  storeStatus: string
}

export function HealthActions({ creatorId, displayName, storeStatus }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [suspendOpen, setSuspendOpen] = useState(false)
  const [reason, setReason] = useState('')

  async function patch(data: Record<string, unknown>) {
    setLoading(true)
    try {
      await fetch(`/api/admin/creators/${creatorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  async function reinstate() {
    await patch({ storeStatus: 'ACTIVE', storeStatusReason: null })
  }

  async function suspend() {
    if (!reason.trim()) return
    await patch({ storeStatus: 'FLAGGED', isSuspended: true, storeStatusReason: reason.trim() })
    setSuspendOpen(false)
    setReason('')
  }

  if (suspendOpen) {
    return (
      <div className="flex items-start gap-2">
        <input
          suppressHydrationWarning
          autoFocus
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for suspension…"
          className="px-2 py-1 rounded-lg bg-background border border-destructive/50 text-xs text-foreground placeholder:text-muted-foreground outline-none focus-visible:border-destructive w-44"
        />
        <button
          onClick={suspend}
          disabled={loading || !reason.trim()}
          className="px-2 py-1 rounded text-xs font-medium bg-destructive/20 text-destructive hover:bg-destructive/30 transition-colors disabled:opacity-50"
        >
          Confirm
        </button>
        <button
          onClick={() => { setSuspendOpen(false); setReason('') }}
          className="px-2 py-1 rounded text-xs font-medium bg-border text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {storeStatus !== 'ACTIVE' && (
        <button
          onClick={reinstate}
          disabled={loading}
          className="px-2 py-0.5 rounded text-xs font-medium bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-colors disabled:opacity-50"
        >
          Reinstate
        </button>
      )}
      <button
        onClick={() => setSuspendOpen(true)}
        disabled={loading}
        className="px-2 py-0.5 rounded text-xs font-medium bg-destructive/15 text-destructive hover:bg-destructive/25 transition-colors disabled:opacity-50"
        title={`Suspend ${displayName}`}
      >
        Suspend
      </button>
    </div>
  )
}
