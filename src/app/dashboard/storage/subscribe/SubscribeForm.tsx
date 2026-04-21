'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { StoragePlanOption } from '@/lib/storage-quota'

type AirwallexSDK = {
  init: (opts: { env: 'demo' | 'prod'; origin: string }) => Promise<void>
  createElement: (type: string, opts: { intent_id: string; client_secret: string; currency: string }) => Promise<{
    mount: (el: HTMLElement) => void
    on: (event: string, cb: (data?: unknown) => void) => void
  }>
}

export function SubscribeForm({ plans, currentPlan }: { plans: StoragePlanOption[]; currentPlan: string }) {
  const router = useRouter()
  const [selected, setSelected] = useState<'CREATOR' | 'PRO' | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkout, setCheckout] = useState<{ intentId: string; clientSecret: string; currency: string } | null>(null)
  const dropinRef = useRef<HTMLDivElement | null>(null)

  async function startSubscribe(plan: 'CREATOR' | 'PRO') {
    setSelected(plan); setBusy(true); setError(null)
    const res = await fetch('/api/account/storage/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error ?? 'Failed to start checkout')
      setBusy(false)
      return
    }
    const data = await res.json() as { intentId: string; clientSecret: string; currency: string }
    setCheckout(data)
    setBusy(false)
  }

  useEffect(() => {
    if (!checkout || !dropinRef.current) return
    let cancelled = false
    ;(async () => {
      try {
        const mod = await import('@airwallex/components-sdk') as unknown as AirwallexSDK
        await mod.init({
          env: (process.env.NEXT_PUBLIC_AIRWALLEX_ENV ?? 'demo') as 'demo' | 'prod',
          origin: window.location.origin,
        })
        if (cancelled) return
        const el = await mod.createElement('dropIn', {
          intent_id: checkout.intentId,
          client_secret: checkout.clientSecret,
          currency: checkout.currency,
        })
        el.mount(dropinRef.current!)
        el.on('success', () => {
          router.push('/dashboard/storage?subscribed=1')
          router.refresh()
        })
        el.on('error', (e) => {
          setError((e as { message?: string } | undefined)?.message ?? 'Payment failed')
        })
      } catch (e) {
        setError((e as Error).message)
      }
    })()
    return () => { cancelled = true }
  }, [checkout, router])

  if (checkout) {
    return (
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <p className="text-sm text-foreground">Confirm your first month&apos;s payment:</p>
        <div ref={dropinRef} className="min-h-[280px]" />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <p className="text-xs text-muted-foreground">
          Your card is saved so we can renew monthly without prompting you again.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {plans.map(p => {
        const isCurrent = currentPlan === p.plan
        return (
          <div key={p.plan} className={`rounded-xl border p-5 space-y-2 ${isCurrent ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-foreground uppercase">{p.label}</span>
              {isCurrent && <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">Current</span>}
            </div>
            <p className="text-3xl font-bold text-foreground">{p.gb} GB</p>
            <p className="text-sm text-muted-foreground">${(p.priceCents / 100).toFixed(2)} / month</p>
            <button
              onClick={() => startSubscribe(p.plan)}
              disabled={busy || isCurrent}
              className="w-full mt-2 text-sm px-4 py-2.5 rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-40"
            >
              {isCurrent ? 'Current plan' : busy && selected === p.plan ? 'Starting…' : `Subscribe — $${(p.priceCents / 100).toFixed(2)}/mo`}
            </button>
          </div>
        )
      })}
      {error && <p className="sm:col-span-2 text-sm text-red-400">{error}</p>}
    </div>
  )
}
