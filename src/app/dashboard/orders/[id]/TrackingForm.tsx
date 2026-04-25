'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { COURIERS } from '@/lib/courier-tracking'
import { Truck, ExternalLink } from 'lucide-react'

interface TrackingFormProps {
  orderId: string
  productType: string
  isPod: boolean
  trackingNumber: string | null
  courierCode: string | null
  courierName: string | null
  estimatedDelivery: Date | null
  trackingAddedAt: Date | null
  trackingUrl: string | null
  escrowStatus: string
  escrowAutoReleaseAt: Date | null
}

function fmt(d: Date | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function TrackingForm(props: TrackingFormProps) {
  const router = useRouter()
  const [courierCode, setCourierCode] = useState(props.courierCode ?? '')
  const [trackingNumber, setTrackingNumber] = useState(props.trackingNumber ?? '')
  const [eta, setEta] = useState(
    props.estimatedDelivery ? new Date(props.estimatedDelivery).toISOString().slice(0, 10) : ''
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const alreadyAdded = props.trackingAddedAt !== null
  const courierLabel = props.courierName ?? COURIERS.find(c => c.code === props.courierCode)?.name ?? props.courierCode

  if (alreadyAdded) {
    return (
      <div className="bg-surface rounded-xl border border-border p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Truck className="size-4 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Tracking</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Courier</p>
            <p className="text-foreground">{courierLabel ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Tracking #</p>
            <p className="text-foreground font-mono text-xs break-all">{props.trackingNumber}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Added</p>
            <p className="text-foreground">{fmt(props.trackingAddedAt)}</p>
          </div>
          {props.estimatedDelivery && (
            <div>
              <p className="text-xs text-muted-foreground">Est. delivery</p>
              <p className="text-foreground">{fmt(props.estimatedDelivery)}</p>
            </div>
          )}
        </div>
        {props.escrowAutoReleaseAt && (
          <p className="text-xs text-muted-foreground">
            Escrow auto-releases {fmt(props.escrowAutoReleaseAt)} unless the buyer disputes.
          </p>
        )}
        {props.trackingUrl && (
          <a
            href={props.trackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80"
          >
            Track on {courierLabel} <ExternalLink size={12} />
          </a>
        )}
      </div>
    )
  }

  const canSubmit = ['HELD', 'PAID'].includes(props.escrowStatus)

  async function submit() {
    if (!courierCode || !trackingNumber.trim()) {
      setError('Pick a courier and enter a tracking number.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const courier = COURIERS.find(c => c.code === courierCode)
      const res = await fetch(`/api/orders/${props.orderId}/tracking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courierCode,
          courierName: courier?.name ?? courierCode,
          trackingNumber: trackingNumber.trim(),
          ...(eta ? { estimatedDelivery: eta } : {}),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error ?? 'Failed to submit tracking')
        setSubmitting(false)
        return
      }
      router.refresh()
    } catch {
      setError('Network error — please retry.')
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-surface rounded-xl border border-border p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Truck className="size-4 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">
          {props.isPod ? 'Submit POD tracking' : 'Mark as shipped'}
        </h2>
      </div>
      <p className="text-sm text-muted-foreground">
        {props.isPod
          ? 'Once your POD provider dispatches the order, paste the tracking details here. The buyer will be notified and the escrow auto-release timer starts.'
          : 'Add the courier and tracking number once the parcel is dispatched. The buyer will be notified and the escrow auto-release timer starts.'}
      </p>

      {!canSubmit && (
        <div className="rounded-lg border border-orange-500/30 bg-orange-500/5 px-3 py-2 text-xs text-orange-300">
          Tracking can only be added when the order is in HELD or PAID escrow state.
          Current state: <span className="font-mono">{props.escrowStatus}</span>.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Courier</label>
          <select
            value={courierCode}
            onChange={e => setCourierCode(e.target.value)}
            disabled={!canSubmit || submitting}
            className="w-full rounded-md bg-background border border-border px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">Select courier…</option>
            {COURIERS.map(c => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Tracking number</label>
          <input
            type="text"
            value={trackingNumber}
            onChange={e => setTrackingNumber(e.target.value)}
            disabled={!canSubmit || submitting}
            placeholder="e.g. EM123456789MY"
            className="w-full rounded-md bg-background border border-border px-2 py-1.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Estimated delivery <span className="text-muted-foreground/60">(optional)</span></label>
          <input
            type="date"
            value={eta}
            onChange={e => setEta(e.target.value)}
            disabled={!canSubmit || submitting}
            className="w-full rounded-md bg-background border border-border px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}

      <button
        onClick={submit}
        disabled={!canSubmit || submitting || !courierCode || !trackingNumber.trim()}
        className="px-4 py-2 rounded-md bg-primary hover:bg-primary/90 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? 'Submitting…' : props.isPod ? 'Submit tracking' : 'Mark as shipped'}
      </button>
    </div>
  )
}
