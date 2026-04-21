'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function WithdrawRequestButton({ id }: { id: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onClick() {
    if (!confirm('Withdraw this commission request?')) return
    setBusy(true); setError(null)
    const res = await fetch(`/api/commissions/requests/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error ?? 'Failed to withdraw')
      setBusy(false)
      return
    }
    router.push('/account/commissions')
    router.refresh()
  }

  return (
    <div>
      <button onClick={onClick} disabled={busy} className="text-sm px-4 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-foreground disabled:opacity-50">
        {busy ? 'Withdrawing…' : 'Withdraw request'}
      </button>
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
    </div>
  )
}
