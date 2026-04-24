'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AccessReasonModal } from '@/components/admin/AccessReasonModal'
import { AuthedThumbnail, type RevealState } from '@/components/admin/AuthedThumbnail'

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

export interface EvidenceDto {
  id: string
  disputeId: string
  uploaderId: string
  role: string // "RAISER" | "CREATOR"
  r2Key: string
  viewerUrl: string
  mimeType: string | null
  fileSize: number | null
  note: string | null
  uploadedAt: Date
  supersededAt: Date | null
  supersededBy: string | null
  uploader: { id: string; name: string; email: string } | null
}

function fmt(d: Date | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function fmtSize(bytes: number | null): string {
  if (bytes == null) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function EvidenceCard({
  ev,
  superseded,
  reveal,
}: {
  ev: EvidenceDto
  superseded: boolean
  reveal: RevealState | null
}) {
  return (
    <div
      className={`rounded-lg border p-3 flex gap-3 items-start ${
        superseded
          ? 'border-border/60 bg-background/20 opacity-60'
          : 'border-border bg-background/40'
      }`}
    >
      <div className="shrink-0">
        <AuthedThumbnail
          viewerUrl={ev.viewerUrl}
          reveal={reveal}
          label={`${ev.role} evidence · ${ev.uploader?.email ?? 'unknown'}`}
          mimeType={ev.mimeType}
          dense
        />
      </div>
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium ${
            ev.role === 'RAISER' ? 'bg-red-500/15 text-red-400' : 'bg-blue-500/15 text-blue-400'
          }`}>
            {ev.role}
          </span>
          {superseded && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-border text-muted-foreground">
              Superseded
            </span>
          )}
          {ev.mimeType && (
            <span className="text-[10px] font-mono text-muted-foreground">{ev.mimeType}</span>
          )}
          <span className="text-[10px] text-muted-foreground">{fmtSize(ev.fileSize)}</span>
        </div>
        <div>
          <p className="text-xs text-foreground">
            {ev.uploader?.name || '—'}{' '}
            <span className="text-muted-foreground">({ev.uploader?.email ?? 'unknown'})</span>
          </p>
          <p className="text-[11px] text-muted-foreground">Uploaded {fmt(ev.uploadedAt)}</p>
          {superseded && ev.supersededAt && (
            <p className="text-[11px] text-muted-foreground">Superseded {fmt(ev.supersededAt)}</p>
          )}
        </div>
        {ev.note && (
          <p className="text-xs text-foreground italic border-l-2 border-border pl-2">
            {ev.note}
          </p>
        )}
        <p className="text-[10px] font-mono text-muted-foreground truncate" title={ev.r2Key}>
          {ev.r2Key}
        </p>
      </div>
    </div>
  )
}

export default function DisputeDetailClient({
  dispute,
  liveEvidence,
  supersededEvidence,
}: {
  dispute: DisputeDetail
  liveEvidence: EvidenceDto[]
  supersededEvidence: EvidenceDto[]
}) {
  const router = useRouter()
  const [adminNote, setAdminNote] = useState(dispute.adminNote ?? '')
  const [partialAmount, setPartialAmount] = useState('')
  const [resolving, setResolving] = useState(false)
  const [confirm, setConfirm] = useState<'FULL_REFUND' | 'PARTIAL_REFUND' | 'RELEASE' | null>(null)

  // Evidence reveal gate — admin picks a reason once, every thumbnail on the
  // page then fetches through /api/files with that reason, writing one audit
  // row per file.
  const [reveal, setReveal] = useState<RevealState | null>(null)
  const [reasonOpen, setReasonOpen] = useState(false)

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

  const raiserEvidence = liveEvidence.filter((e) => e.role === 'RAISER')
  const creatorEvidence = liveEvidence.filter((e) => e.role === 'CREATOR')
  const hasAnyEvidence = liveEvidence.length > 0 || supersededEvidence.length > 0

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

          {/* ── Evidence ─────────────────────────────────────────────────── */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground">Evidence</h3>
              <span className="text-xs text-muted-foreground">
                {liveEvidence.length} live{supersededEvidence.length > 0 && ` · ${supersededEvidence.length} superseded`}
              </span>
            </div>
            {!hasAnyEvidence && (
              <p className="text-xs text-muted-foreground">No evidence files attached to this dispute.</p>
            )}

            {hasAnyEvidence && !reveal && (
              <div className="mb-3 rounded-lg border border-amber-500/40 bg-amber-500/10 dark:bg-amber-500/5 p-3 flex items-center justify-between gap-3">
                <p className="text-xs text-amber-900 dark:text-amber-200">
                  Evidence files are audited. Confirm your reason to load thumbnails.
                </p>
                <button
                  type="button"
                  onClick={() => setReasonOpen(true)}
                  className="shrink-0 px-3 py-1.5 rounded-md text-xs font-medium bg-amber-600 text-white hover:bg-amber-700 transition-colors"
                >
                  🔒 Reveal evidence
                </button>
              </div>
            )}

            {raiserEvidence.length > 0 && (
              <div className="mb-3">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Raiser evidence
                </p>
                <div className="flex flex-col gap-2">
                  {raiserEvidence.map((ev) => (
                    <EvidenceCard key={ev.id} ev={ev} superseded={false} reveal={reveal} />
                  ))}
                </div>
              </div>
            )}

            {creatorEvidence.length > 0 && (
              <div className="mb-3">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Creator evidence
                </p>
                <div className="flex flex-col gap-2">
                  {creatorEvidence.map((ev) => (
                    <EvidenceCard key={ev.id} ev={ev} superseded={false} reveal={reveal} />
                  ))}
                </div>
              </div>
            )}

            {supersededEvidence.length > 0 && (
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Superseded (historical)
                </p>
                <div className="flex flex-col gap-2">
                  {supersededEvidence.map((ev) => (
                    <EvidenceCard key={ev.id} ev={ev} superseded={true} reveal={reveal} />
                  ))}
                </div>
              </div>
            )}
          </div>

          <AccessReasonModal
            open={reasonOpen}
            onClose={() => setReasonOpen(false)}
            onConfirm={(code, note) => {
              setReveal({ code, note })
              setReasonOpen(false)
            }}
            defaultReasonCode="DISPUTE_REVIEW"
            resourceLabel="All evidence for this dispute"
            title="Reveal dispute evidence"
            submitLabel="Reveal all"
          />


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
