'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

type AirwallexSDK = {
  init: (opts: { env: 'demo' | 'prod'; origin: string }) => Promise<void>
  createElement: (type: string, opts: { intent_id: string; client_secret: string; currency: string }) => Promise<{
    mount: (el: HTMLElement) => void
    on: (event: string, cb: (data?: unknown) => void) => void
  }>
}

export function QuoteAcceptActions({ quoteId }: { quoteId: string }) {
  const router = useRouter()
  const dropinRef = useRef<HTMLDivElement>(null)
  const [mode, setMode] = useState<'idle' | 'accepting' | 'paying' | 'rejecting'>('idle')
  const [rejectReason, setRejectReason] = useState('')
  const [showReject, setShowReject] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onAccept() {
    setMode('accepting'); setError(null)
    const res = await fetch(`/api/commissions/quotes/${quoteId}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currency: 'USD' }),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error ?? 'Failed to accept quote')
      setMode('idle')
      return
    }
    const data = await res.json() as { intentId: string; clientSecret: string; currency: string; orderId: string }
    setMode('paying')

    const mod = await import('@airwallex/components-sdk') as unknown as AirwallexSDK
    await mod.init({
      env: (process.env.NEXT_PUBLIC_AIRWALLEX_ENV ?? 'demo') as 'demo' | 'prod',
      origin: window.location.origin,
    })
    const dropIn = await mod.createElement('dropIn', {
      intent_id: data.intentId,
      client_secret: data.clientSecret,
      currency: data.currency,
    })
    dropIn.mount(dropinRef.current!)
    dropIn.on('success', () => router.push(`/account/orders/${data.orderId}?commission=1`))
    dropIn.on('error', (e) => {
      const err = e as { detail?: { error?: { message?: string } } } | undefined
      setError(err?.detail?.error?.message ?? 'Payment failed')
    })
  }

  async function onReject() {
    setMode('rejecting'); setError(null)
    const res = await fetch(`/api/commissions/quotes/${quoteId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: rejectReason }),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error ?? 'Failed to reject')
      setMode('idle')
      return
    }
    router.refresh()
  }

  if (mode === 'paying') {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Complete payment to start the commission:</p>
        <div ref={dropinRef} className="bg-card border border-border rounded-xl p-4 min-h-[300px]" />
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button onClick={onAccept} disabled={mode !== 'idle'} className="text-sm px-5 py-2.5 rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50">
          {mode === 'accepting' ? 'Preparing…' : 'Accept & pay'}
        </button>
        <button onClick={() => setShowReject(v => !v)} disabled={mode !== 'idle'} className="text-sm px-5 py-2.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-foreground">
          Reject
        </button>
      </div>
      {showReject && (
        <div className="space-y-2">
          <textarea
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            maxLength={500}
            placeholder="Optional: tell the creator why (max 500 chars)"
            className="w-full text-sm p-3 rounded-lg bg-card border border-border text-foreground"
            rows={3}
          />
          <button onClick={onReject} disabled={mode === 'rejecting'} className="text-sm px-4 py-2 rounded-lg border border-border text-red-400 hover:border-red-400/50 disabled:opacity-50">
            {mode === 'rejecting' ? 'Rejecting…' : 'Confirm reject'}
          </button>
        </div>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
