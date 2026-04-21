'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface Subscription {
  id: string
  type: string
  status: string
  amountUsd: number
  currency: string
  cancelAtPeriodEnd: boolean
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  canceledAt: string | null
  failedChargeCount: number
  nextRetryAt: string | null
  createdAt: string
  creator: {
    id: string
    username: string
    displayName: string
    avatar: string | null
  }
  tier: {
    id: string
    name: string
    description: string | null
    perks: string[]
  } | null
}

const STATUS_STYLES: Record<string, { label: string; cls: string }> = {
  ACTIVE:   { label: 'Active',   cls: 'bg-success/10 text-success border border-success/30' },
  PENDING:  { label: 'Pending',  cls: 'bg-warning/10 text-warning border border-warning/30' },
  PAST_DUE: { label: 'Past due', cls: 'bg-warning/10 text-warning border border-warning/30' },
  CANCELED: { label: 'Canceled', cls: 'bg-muted/30 text-muted-foreground border border-border' },
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-MY', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return '—'
  }
}

export function SubscriptionsClient({ subscriptions }: { subscriptions: Subscription[] }) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)

  if (subscriptions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
        <p className="text-sm text-muted-foreground">
          You&apos;re not subscribed to any creators yet.
        </p>
        <Link
          href="/creators"
          className="mt-4 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
        >
          Discover creators
        </Link>
      </div>
    )
  }

  async function cancelAtPeriodEnd(sub: Subscription) {
    if (!confirm(`Cancel your subscription to ${sub.creator.displayName}? You'll keep perks until ${formatDate(sub.currentPeriodEnd)}.`)) return
    setBusyId(sub.id)
    try {
      const res = await fetch(`/api/support/subscription/${sub.id}/cancel`, { method: 'POST' })
      if (!res.ok) throw new Error((await res.json() as { error?: string }).error ?? 'Cancel failed')
      toast.success(`Subscription will end ${formatDate(sub.currentPeriodEnd)}`)
      router.refresh()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusyId(null)
    }
  }

  async function cancelImmediately(sub: Subscription) {
    if (!confirm('Cancel immediately and lose access now? This cannot be undone.')) return
    setBusyId(sub.id)
    try {
      const res = await fetch(`/api/support/subscription/${sub.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ immediate: true }),
      })
      if (!res.ok) throw new Error((await res.json() as { error?: string }).error ?? 'Cancel failed')
      toast.success('Subscription canceled')
      router.refresh()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusyId(null)
    }
  }

  async function resume(sub: Subscription) {
    setBusyId(sub.id)
    try {
      const res = await fetch(`/api/support/subscription/${sub.id}/resume`, { method: 'POST' })
      if (!res.ok) throw new Error((await res.json() as { error?: string }).error ?? 'Resume failed')
      toast.success('Subscription resumed')
      router.refresh()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-4">
      {subscriptions.map(sub => {
        const style = STATUS_STYLES[sub.status] ?? STATUS_STYLES.PENDING
        const kindLabel = sub.type === 'TIER'
          ? (sub.tier?.name ?? 'Membership')
          : 'Monthly gift'
        return (
          <div key={sub.id} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                {sub.creator.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={sub.creator.avatar} alt={sub.creator.displayName} className="size-12 shrink-0 rounded-full object-cover" />
                ) : (
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-sm font-bold text-white">
                    {sub.creator.displayName.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <Link
                      href={`/creator/${sub.creator.username}`}
                      className="font-semibold text-foreground hover:text-primary transition-colors"
                    >
                      {sub.creator.displayName}
                    </Link>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${style.cls}`}>
                      {style.label}
                    </span>
                    {sub.cancelAtPeriodEnd && sub.status === 'ACTIVE' && (
                      <span className="rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warning">
                        Ending
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {kindLabel} · <span className="font-medium text-foreground">${(sub.amountUsd / 100).toFixed(2)}/mo</span>
                  </p>
                  {sub.status === 'ACTIVE' && sub.currentPeriodEnd && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {sub.cancelAtPeriodEnd
                        ? `Ends ${formatDate(sub.currentPeriodEnd)}`
                        : `Next charge ${formatDate(sub.currentPeriodEnd)}`}
                    </p>
                  )}
                  {sub.status === 'PAST_DUE' && (
                    <p className="mt-1 text-xs text-warning">
                      Payment failed ({sub.failedChargeCount}/3 retries){sub.nextRetryAt ? ` · next retry ${formatDate(sub.nextRetryAt)}` : ''}
                    </p>
                  )}
                  {sub.status === 'CANCELED' && sub.canceledAt && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Canceled {formatDate(sub.canceledAt)}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 gap-2">
                {sub.status === 'ACTIVE' && !sub.cancelAtPeriodEnd && (
                  <button
                    disabled={busyId === sub.id}
                    onClick={() => cancelAtPeriodEnd(sub)}
                    className="rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground hover:bg-border/40 transition-colors disabled:opacity-50"
                  >
                    {busyId === sub.id ? '…' : 'Cancel'}
                  </button>
                )}
                {sub.status === 'ACTIVE' && sub.cancelAtPeriodEnd && (
                  <button
                    disabled={busyId === sub.id}
                    onClick={() => resume(sub)}
                    className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {busyId === sub.id ? '…' : 'Resume'}
                  </button>
                )}
                {sub.status === 'PAST_DUE' && (
                  <button
                    disabled={busyId === sub.id}
                    onClick={() => cancelImmediately(sub)}
                    className="rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground hover:bg-border/40 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>

            {sub.tier?.perks && sub.tier.perks.length > 0 && (sub.status === 'ACTIVE' || sub.status === 'PAST_DUE') && (
              <div className="mt-4 border-t border-border pt-3">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your perks</p>
                <ul className="space-y-1">
                  {sub.tier.perks.map((perk, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                      <svg viewBox="0 0 16 16" className="mt-0.5 size-3 shrink-0 fill-primary" aria-hidden="true">
                        <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" />
                      </svg>
                      {perk}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
