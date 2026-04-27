'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface Props {
  creatorProfileId: string
  status: string
  certificateUrl: string | null
}

export function SalesTaxApplicationActions({
  creatorProfileId,
  status,
  certificateUrl,
}: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [reason, setReason] = useState('')

  async function patch(body: object) {
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/creators/${creatorProfileId}/sales-tax`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        toast.error(j.error ?? 'Action failed.')
        return false
      }
      router.refresh()
      return true
    } catch {
      toast.error('Network error — try again.')
      return false
    } finally {
      setBusy(false)
    }
  }

  async function approve() {
    if (busy) return
    const ok = await patch({ action: 'APPROVE' })
    if (ok) toast.success('Approved — creator notified.')
  }

  async function submitReject() {
    if (busy) return
    const trimmed = reason.trim()
    if (trimmed.length < 5) {
      toast.error('Rejection reason must be at least 5 characters.')
      return
    }
    const ok = await patch({ action: 'REJECT', reason: trimmed })
    if (ok) {
      toast.success('Rejected — creator notified.')
      setRejectOpen(false)
      setReason('')
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {certificateUrl && (
        <a
          href={certificateUrl}
          target="_blank"
          rel="noreferrer"
          className="px-2 py-1 rounded text-xs font-medium bg-border text-foreground hover:bg-border/80 transition-colors"
        >
          Certificate
        </a>
      )}
      {status === 'REQUESTED' && (
        <>
          <button
            type="button"
            onClick={approve}
            disabled={busy}
            className="px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-400 hover:bg-green-500/30 disabled:opacity-60 transition-colors"
          >
            Approve
          </button>
          <button
            type="button"
            onClick={() => setRejectOpen(true)}
            disabled={busy}
            className="px-2 py-1 rounded text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 disabled:opacity-60 transition-colors"
          >
            Reject
          </button>
        </>
      )}
      {status === 'REJECTED' && (
        // Admin can reconsider a rejected application and approve directly.
        <button
          type="button"
          onClick={approve}
          disabled={busy}
          className="px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-400 hover:bg-green-500/30 disabled:opacity-60 transition-colors"
        >
          Approve anyway
        </button>
      )}

      {rejectOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          role="dialog"
          aria-modal="true"
          onClick={() => !busy && setRejectOpen(false)}
        >
          <div
            className="w-full max-w-md bg-card rounded-2xl border border-border p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="text-base font-bold text-foreground">Reject sales-tax request</h3>
              <p className="text-xs text-muted-foreground mt-1">
                The reason below will be emailed to the creator and recorded in the audit log.
              </p>
            </div>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              maxLength={1000}
              placeholder="e.g. Certificate is illegible / does not match the tax ID provided."
              className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-foreground placeholder:text-muted-foreground focus-visible:border-primary outline-none transition-colors text-sm"
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setRejectOpen(false)}
                disabled={busy}
                className="px-4 py-2 rounded-lg border border-border text-sm font-semibold text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitReject}
                disabled={busy}
                className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 text-sm font-semibold disabled:opacity-60"
              >
                {busy ? 'Rejecting…' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
