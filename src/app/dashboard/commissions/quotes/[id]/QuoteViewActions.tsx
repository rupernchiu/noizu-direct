'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export function QuoteViewActions({ id, status, orderId }: { id: string; status: string; orderId: string | null }) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function send() {
    setBusy('send'); setError(null)
    const res = await fetch(`/api/commissions/quotes/${id}/send`, { method: 'POST' })
    if (!res.ok) { setError((await res.json().catch(() => ({}))).error ?? 'Failed'); setBusy(null); return }
    router.refresh()
  }
  async function withdraw() {
    const msg = status === 'DRAFT' ? 'Delete this draft?' : 'Withdraw this quote?'
    if (!confirm(msg)) return
    setBusy('withdraw'); setError(null)
    const res = await fetch(`/api/commissions/quotes/${id}`, { method: 'DELETE' })
    if (!res.ok) { setError((await res.json().catch(() => ({}))).error ?? 'Failed'); setBusy(null); return }
    router.push('/dashboard/commissions')
    router.refresh()
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status === 'DRAFT' && (
        <>
          <Link href={`/dashboard/commissions/quotes/${id}/edit`} className="text-sm px-5 py-2.5 rounded-lg border border-border text-foreground hover:border-foreground">Edit</Link>
          <button onClick={send} disabled={!!busy} className="text-sm px-5 py-2.5 rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50">
            {busy === 'send' ? 'Sending…' : 'Send to buyer'}
          </button>
          <button onClick={withdraw} disabled={!!busy} className="text-sm px-5 py-2.5 rounded-lg border border-border text-red-400 hover:border-red-400/50 disabled:opacity-50">
            Discard
          </button>
        </>
      )}
      {status === 'SENT' && (
        <button onClick={withdraw} disabled={!!busy} className="text-sm px-5 py-2.5 rounded-lg border border-border text-red-400 hover:border-red-400/50 disabled:opacity-50">
          {busy === 'withdraw' ? 'Withdrawing…' : 'Withdraw quote'}
        </button>
      )}
      {status === 'ACCEPTED' && orderId && (
        <Link href={`/dashboard/orders/${orderId}`} className="text-sm px-5 py-2.5 rounded-lg bg-primary text-white hover:bg-primary/90">
          View order
        </Link>
      )}
      {error && <p className="text-xs text-red-400 w-full">{error}</p>}
    </div>
  )
}
