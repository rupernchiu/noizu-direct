'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface DisputeDetail {
  id: string; orderId: string; reason: string; description: string
  status: string; evidence: string; creatorResponse: string | null
  adminNote: string | null; createdAt: Date; resolvedAt: Date | null
  order: {
    id: string; amountUsd: number; escrowStatus: string
    trackingNumber: string | null; courierName: string | null; createdAt: Date
    product: { title: string; type: string; images: string }
    buyer: { name: string; email: string }
    creator: { name: string; email: string }
    escrowTransactions: { id: string; type: string; amount: number; note: string | null; createdAt: Date }[]
  }
  raiser: { name: string; email: string }
}

function fmt(d: Date | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function DisputeDetailClient({ dispute }: { dispute: DisputeDetail }) {
  const router = useRouter()
  const [adminNote, setAdminNote] = useState(dispute.adminNote ?? '')
  const [partialAmount, setPartialAmount] = useState('')
  const [resolving, setResolving] = useState(false)
  const [confirm, setConfirm] = useState<'FULL_REFUND' | 'PARTIAL_REFUND' | 'RELEASE' | null>(null)

  const isResolved = !['OPEN', 'UNDER_REVIEW'].includes(dispute.status)

  async function resolve(action: 'FULL_REFUND' | 'PARTIAL_REFUND' | 'RELEASE') {
    if (!adminNote.trim()) { alert('Admin note is required'); return }
    setResolving(true)
    const amount = action === 'PARTIAL_REFUND' ? Math.round(parseFloat(partialAmount) * 100) : undefined
    await fetch(`/api/admin/disputes/${dispute.id}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, adminNote, amount }),
    })
    setConfirm(null)
    setResolving(false)
    router.refresh()
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Link href="/admin/disputes" className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-block">← Back to disputes</Link>
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-foreground">Dispute</h1>
        <span style={{ fontSize: '12px', fontWeight: 700, padding: '3px 10px', borderRadius: '12px', background: dispute.status === 'OPEN' ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', color: dispute.status === 'OPEN' ? '#ef4444' : '#22c55e' }}>
          {dispute.status.replace(/_/g, ' ')}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: order details */}
        <div className="flex flex-col gap-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-foreground mb-3">Order Details</h3>
            <div className="text-sm flex flex-col gap-1.5">
              <div className="flex justify-between"><span className="text-muted-foreground">Order ID</span><span className="font-mono text-xs">#{dispute.orderId.slice(-8).toUpperCase()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Product</span><span className="text-foreground">{dispute.order.product.title}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="text-foreground">{dispute.order.product.type}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-semibold text-foreground">USD {(dispute.order.amountUsd / 100).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Escrow</span><span className="text-foreground">{dispute.order.escrowStatus}</span></div>
              {dispute.order.trackingNumber && <div className="flex justify-between"><span className="text-muted-foreground">Tracking</span><span className="font-mono text-xs">{dispute.order.trackingNumber}</span></div>}
              <div className="flex justify-between"><span className="text-muted-foreground">Order date</span><span>{fmt(dispute.order.createdAt)}</span></div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-foreground mb-3">Parties</h3>
            <div className="text-sm flex flex-col gap-2">
              <div><p className="text-muted-foreground text-xs">Buyer</p><p className="text-foreground">{dispute.order.buyer.name}</p><p className="text-muted-foreground text-xs">{dispute.order.buyer.email}</p></div>
              <div><p className="text-muted-foreground text-xs">Creator</p><p className="text-foreground">{dispute.order.creator.name}</p><p className="text-muted-foreground text-xs">{dispute.order.creator.email}</p></div>
            </div>
          </div>

          {dispute.order.escrowTransactions.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-semibold text-foreground mb-3">Escrow History</h3>
              <div className="flex flex-col gap-2">
                {dispute.order.escrowTransactions.map(et => (
                  <div key={et.id} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{et.type} · {fmt(et.createdAt)}</span>
                    <span className="text-foreground font-medium">USD {(et.amount / 100).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: dispute + resolution */}
        <div className="flex flex-col gap-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-foreground mb-3">Dispute Details</h3>
            <div className="text-sm flex flex-col gap-2">
              <div><span className="text-muted-foreground">Reason: </span><span className="text-foreground font-medium">{dispute.reason.replace(/_/g, ' ')}</span></div>
              <div><span className="text-muted-foreground">Raised: </span><span>{fmt(dispute.createdAt)}</span></div>
            </div>
            <div className="mt-3 p-3 rounded-lg bg-surface border border-border text-sm text-foreground">{dispute.description}</div>
          </div>

          {dispute.creatorResponse && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-semibold text-foreground mb-2">Creator Response</h3>
              <div className="p-3 rounded-lg bg-surface border border-border text-sm text-foreground">{dispute.creatorResponse}</div>
            </div>
          )}

          {!isResolved && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-semibold text-foreground mb-3">Resolution</h3>
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Admin Note (required)</label>
                  <textarea suppressHydrationWarning value={adminNote} onChange={e => setAdminNote(e.target.value)} rows={3} placeholder="Document your reasoning..." style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--foreground)', fontSize: '13px', outline: 'none', resize: 'none' }} />
                </div>
                {confirm === 'PARTIAL_REFUND' && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Refund amount (USD)</label>
                    <input suppressHydrationWarning type="number" step="0.01" value={partialAmount} onChange={e => setPartialAmount(e.target.value)} placeholder={`Max ${(dispute.order.amountUsd / 100).toFixed(2)}`} style={{ width: '160px', height: '36px', padding: '0 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--foreground)', fontSize: '14px', outline: 'none' }} />
                  </div>
                )}
                <div className="flex gap-2 flex-wrap">
                  <button suppressHydrationWarning onClick={() => setConfirm('FULL_REFUND')} style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', background: '#ef4444', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Full Refund to Buyer</button>
                  <button suppressHydrationWarning onClick={() => setConfirm(confirm === 'PARTIAL_REFUND' ? null : 'PARTIAL_REFUND')} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--foreground)', fontSize: '13px', cursor: 'pointer' }}>Partial Refund</button>
                  <button suppressHydrationWarning onClick={() => setConfirm('RELEASE')} style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', background: '#22c55e', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Release to Creator</button>
                </div>
                {confirm && (
                  <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <p style={{ margin: '0 0 8px', fontSize: '13px', color: 'var(--foreground)', fontWeight: 600 }}>Confirm: {confirm.replace(/_/g, ' ')}?</p>
                    <p style={{ margin: '0 0 10px', fontSize: '12px', color: 'var(--muted-foreground)' }}>This action will notify both parties and cannot be undone.</p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button suppressHydrationWarning onClick={() => void resolve(confirm)} disabled={resolving} style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', background: '#ef4444', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', opacity: resolving ? 0.6 : 1 }}>{resolving ? 'Processing…' : 'Confirm'}</button>
                      <button suppressHydrationWarning onClick={() => setConfirm(null)} style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--foreground)', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {isResolved && dispute.adminNote && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-semibold text-foreground mb-2">Admin Note</h3>
              <p className="text-sm text-foreground">{dispute.adminNote}</p>
              <p className="text-xs text-muted-foreground mt-2">Resolved: {fmt(dispute.resolvedAt)}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
