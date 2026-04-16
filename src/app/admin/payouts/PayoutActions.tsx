'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function PayoutActions({ payoutId, status }: { payoutId: string; status: string }) {
  const router = useRouter()
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [showReject, setShowReject] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')

  async function patch(body: Record<string, unknown>) {
    const res = await fetch(`/api/admin/payouts/${payoutId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return res
  }

  async function handleApprove() {
    if (!confirm('Approve this payout?')) return
    setLoadingAction('approve')
    try {
      await patch({ action: 'approve' })
      router.refresh()
    } finally {
      setLoadingAction(null)
    }
  }

  async function handlePaid() {
    if (!confirm('Mark this payout as paid?')) return
    setLoadingAction('paid')
    try {
      await patch({ action: 'paid' })
      router.refresh()
    } finally {
      setLoadingAction(null)
    }
  }

  async function handleReject() {
    if (!rejectionReason.trim()) return
    setLoadingAction('reject')
    try {
      await patch({ action: 'reject', rejectionReason: rejectionReason.trim() })
      setShowReject(false)
      setRejectionReason('')
      router.refresh()
    } finally {
      setLoadingAction(null)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {status === 'PENDING' && (
          <button
            onClick={handleApprove}
            disabled={loadingAction !== null}
            className="px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors disabled:opacity-50"
          >
            {loadingAction === 'approve' ? 'Approving...' : 'Approve'}
          </button>
        )}

        {status === 'APPROVED' && (
          <button
            onClick={handlePaid}
            disabled={loadingAction !== null}
            className="px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors disabled:opacity-50"
          >
            {loadingAction === 'paid' ? 'Marking...' : 'Mark as Paid'}
          </button>
        )}

        {(status === 'PENDING' || status === 'APPROVED') && !showReject && (
          <button
            onClick={() => setShowReject(true)}
            disabled={loadingAction !== null}
            className="px-2 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
          >
            Reject
          </button>
        )}
      </div>

      {showReject && (
        <div className="flex flex-col gap-1.5">
          <input
            type="text"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Rejection reason..."
            className="rounded bg-card border border-border px-2 py-1 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring w-48"
          />
          <div className="flex gap-1">
            <button
              onClick={handleReject}
              disabled={loadingAction !== null || !rejectionReason.trim()}
              className="px-2 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
            >
              {loadingAction === 'reject' ? 'Rejecting...' : 'Confirm Reject'}
            </button>
            <button
              onClick={() => { setShowReject(false); setRejectionReason('') }}
              disabled={loadingAction !== null}
              className="px-2 py-0.5 rounded text-xs font-medium bg-border text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
