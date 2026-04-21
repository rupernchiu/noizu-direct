'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Check, X, Upload } from 'lucide-react'
import { DigitalFilesUpload, type DigitalFile } from '@/components/ui/DigitalFilesUpload'

interface Props {
  orderId: string
  commissionStatus: string
  acceptDeadlineAt: string | null
}

function timeLeft(deadline: string | null): string | null {
  if (!deadline) return null
  const diff = new Date(deadline).getTime() - Date.now()
  if (diff <= 0) return 'Expired'
  const hours = Math.floor(diff / (1000 * 60 * 60))
  if (hours < 1) {
    const mins = Math.floor(diff / (1000 * 60))
    return `${mins} minute${mins !== 1 ? 's' : ''} left`
  }
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} left`
  const days = Math.floor(hours / 24)
  return `${days} day${days !== 1 ? 's' : ''} left`
}

export function CommissionActions({ orderId, commissionStatus, acceptDeadlineAt }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [declineReason, setDeclineReason] = useState('')
  const [showDecline, setShowDecline] = useState(false)
  const [deliveryFiles, setDeliveryFiles] = useState<DigitalFile[]>([])
  const [deliveryMessage, setDeliveryMessage] = useState('')
  const [showDeliver, setShowDeliver] = useState(false)

  async function post(path: string, body?: unknown, action?: string) {
    setBusy(action ?? path)
    setError(null)
    try {
      const res = await fetch(`/api/orders/${orderId}/commission/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        setError(data.error ?? `Request failed (${res.status})`)
        return false
      }
      router.refresh()
      return true
    } catch {
      setError('Network error')
      return false
    } finally {
      setBusy(null)
    }
  }

  if (commissionStatus === 'PENDING_ACCEPTANCE') {
    const left = timeLeft(acceptDeadlineAt)
    return (
      <div className="space-y-3">
        {left && (
          <p className={`text-xs ${left === 'Expired' ? 'text-red-400' : 'text-muted-foreground'}`}>
            Acceptance window: {left}
          </p>
        )}
        {!showDecline ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => post('accept', undefined, 'accept')}
              disabled={busy !== null}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-medium disabled:opacity-60 transition-colors"
            >
              {busy === 'accept' ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              Accept commission
            </button>
            <button
              type="button"
              onClick={() => setShowDecline(true)}
              disabled={busy !== null}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-card transition-colors"
            >
              <X className="size-4" />
              Decline
            </button>
          </div>
        ) : (
          <div className="space-y-2 rounded-lg border border-border bg-card p-3">
            <label className="block text-xs text-muted-foreground">Reason (optional, shown to buyer)</label>
            <textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              rows={3}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground"
              placeholder="e.g. I'm fully booked until next month"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={async () => {
                  const ok = await post('decline', { reason: declineReason || undefined }, 'decline')
                  if (ok) setShowDecline(false)
                }}
                disabled={busy !== null}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/90 hover:bg-red-500 text-white text-sm font-medium disabled:opacity-60 transition-colors"
              >
                {busy === 'decline' ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
                Confirm decline & refund buyer
              </button>
              <button
                type="button"
                onClick={() => { setShowDecline(false); setDeclineReason('') }}
                disabled={busy !== null}
                className="px-4 py-2 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-card transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    )
  }

  if (commissionStatus === 'ACCEPTED' || commissionStatus === 'REVISION_REQUESTED') {
    const fileUrls = deliveryFiles.map((f) => f.key)
    return (
      <div className="space-y-3">
        {!showDeliver ? (
          <button
            type="button"
            onClick={() => setShowDeliver(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-medium transition-colors"
          >
            <Upload className="size-4" />
            Deliver work
          </button>
        ) : (
          <div className="space-y-3 rounded-lg border border-border bg-card p-3">
            <div>
              <p className="text-xs text-muted-foreground mb-2">Delivery files</p>
              <DigitalFilesUpload files={deliveryFiles} onChange={setDeliveryFiles} maxFiles={10} />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Message to buyer (optional)</label>
              <textarea
                value={deliveryMessage}
                onChange={(e) => setDeliveryMessage(e.target.value)}
                rows={3}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground"
                placeholder="Notes for the buyer about this delivery"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={async () => {
                  if (fileUrls.length === 0) {
                    setError('Upload at least one delivery file')
                    return
                  }
                  const ok = await post('deliver', { files: fileUrls, message: deliveryMessage || undefined }, 'deliver')
                  if (ok) {
                    setShowDeliver(false)
                    setDeliveryFiles([])
                    setDeliveryMessage('')
                  }
                }}
                disabled={busy !== null || fileUrls.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-medium disabled:opacity-60 transition-colors"
              >
                {busy === 'deliver' ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                Submit delivery
              </button>
              <button
                type="button"
                onClick={() => setShowDeliver(false)}
                disabled={busy !== null}
                className="px-4 py-2 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-card transition-colors"
              >
                Cancel
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              After delivery, the buyer has 30 days to accept or request a revision. If no action, the balance auto-releases to you.
            </p>
          </div>
        )}
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    )
  }

  if (commissionStatus === 'DELIVERED') {
    return (
      <p className="text-sm text-muted-foreground">
        Delivery submitted. Awaiting buyer acceptance — balance auto-releases after 30 days.
      </p>
    )
  }

  if (commissionStatus === 'COMPLETED') {
    return <p className="text-sm text-muted-foreground">Commission completed.</p>
  }

  return null
}
