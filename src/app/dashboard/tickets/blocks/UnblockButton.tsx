'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function UnblockButton({ blockId }: { blockId: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function unblock() {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/tickets/blocks/${blockId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        setError(data.error ?? 'Failed to unblock')
        return
      }
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={unblock}
        disabled={busy}
        className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors disabled:opacity-50"
      >
        {busy ? 'Unblocking…' : 'Unblock'}
      </button>
      {error && <span className="text-[10px] text-red-400">{error}</span>}
    </div>
  )
}
