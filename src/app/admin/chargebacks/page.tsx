'use client'
import { useState, useEffect, useCallback } from 'react'
import { AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react'

type Chargeback = {
  id: string
  airwallexDisputeId: string
  amountUsd: number
  currency: string
  reason: string
  status: string
  evidenceDeadline: string | null
  adminNotes: string | null
  outcome: string | null
  createdAt: string
  order: {
    id: string
    amountUsd: number
    buyer: { name: string | null; email: string } | null
    creator: { name: string } | null
    product: { title: string } | null
  }
}

const STATUS_OPTIONS = ['', 'OPEN', 'UNDER_REVIEW', 'WON', 'LOST', 'CANCELLED']

const statusStyle: Record<string, string> = {
  OPEN:         'bg-orange-500/20 text-orange-400',
  UNDER_REVIEW: 'bg-yellow-500/20 text-yellow-400',
  WON:          'bg-green-500/20 text-green-400',
  LOST:         'bg-red-500/20 text-red-400',
  CANCELLED:    'bg-muted/20 text-muted-foreground',
}

function daysUntil(dateStr: string | null) {
  if (!dateStr) return null
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
  return diff
}

export default function ChargebacksPage() {
  const [items, setItems] = useState<Chargeback[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('OPEN')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Chargeback | null>(null)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const perPage = 20

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page) })
    if (status) params.set('status', status)
    const r = await fetch(`/api/admin/chargebacks?${params}`)
    if (r.ok) { const d = await r.json(); setItems(d.items); setTotal(d.total) }
    setLoading(false)
  }, [page, status])

  useEffect(() => { load() }, [load])

  async function updateStatus(id: string, newStatus: string, outcome?: string) {
    setSaving(true)
    await fetch(`/api/admin/chargebacks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus, adminNotes: notes, ...(outcome ? { outcome } : {}) }),
    })
    setSaving(false)
    setSelected(null)
    load()
  }

  const totalPages = Math.ceil(total / perPage)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Chargebacks</h1>
          <p className="text-sm text-muted-foreground mt-1">Credit card disputes raised by buyers with their bank</p>
        </div>
        <select
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1) }}
          className="px-3 py-1.5 text-sm bg-card border border-border rounded-lg text-foreground"
        >
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="py-16 text-center text-muted-foreground">Loading…</div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center text-muted-foreground">
          No chargebacks found.
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-border bg-muted/10">
                <th className="px-4 py-3 text-left font-medium">Dispute ID</th>
                <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Order / Product</th>
                <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">Buyer</th>
                <th className="px-4 py-3 text-right font-medium">Amount</th>
                <th className="px-4 py-3 text-left font-medium">Reason</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Deadline</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {items.map(cb => {
                const days = daysUntil(cb.evidenceDeadline)
                return (
                  <tr key={cb.id} className="border-b border-border last:border-0 hover:bg-muted/10">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{cb.airwallexDisputeId.slice(-10).toUpperCase()}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-foreground truncate max-w-[160px]">{cb.order.product?.title ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">{cb.order.id.slice(-8).toUpperCase()}</p>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground text-xs">
                      {cb.order.buyer?.name ?? cb.order.buyer?.email ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-foreground">${(cb.amountUsd / 100).toFixed(2)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{cb.reason.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle[cb.status] ?? 'bg-muted text-muted-foreground'}`}>
                        {cb.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs">
                      {days !== null ? (
                        <span className={days <= 3 ? 'text-red-400 font-semibold' : days <= 7 ? 'text-yellow-400' : 'text-muted-foreground'}>
                          {days <= 0 ? 'Expired' : `${days}d left`}
                        </span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => { setSelected(cb); setNotes(cb.adminNotes ?? '') }}
                        className="text-xs text-primary hover:underline"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{total} chargebacks</span>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-1 disabled:opacity-30"><ChevronLeft size={16} /></button>
            <span>{page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-1 disabled:opacity-30"><ChevronRight size={16} /></button>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-lg space-y-4 p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-foreground flex items-center gap-2"><AlertTriangle size={16} className="text-orange-400" /> Chargeback Detail</h2>
              <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-muted-foreground">Dispute ID</p><p className="font-mono text-foreground">{selected.airwallexDisputeId}</p></div>
              <div><p className="text-xs text-muted-foreground">Amount</p><p className="font-bold text-foreground">${(selected.amountUsd / 100).toFixed(2)} {selected.currency}</p></div>
              <div><p className="text-xs text-muted-foreground">Reason</p><p className="text-foreground">{selected.reason.replace(/_/g, ' ')}</p></div>
              <div><p className="text-xs text-muted-foreground">Status</p><p className="text-foreground">{selected.status}</p></div>
              <div><p className="text-xs text-muted-foreground">Product</p><p className="text-foreground truncate">{selected.order.product?.title ?? '—'}</p></div>
              <div><p className="text-xs text-muted-foreground">Buyer</p><p className="text-foreground">{selected.order.buyer?.name ?? selected.order.buyer?.email ?? '—'}</p></div>
              {selected.evidenceDeadline && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Evidence deadline</p>
                  <p className={`font-semibold ${daysUntil(selected.evidenceDeadline)! <= 3 ? 'text-red-400' : 'text-yellow-400'}`}>
                    {new Date(selected.evidenceDeadline).toLocaleDateString()} ({daysUntil(selected.evidenceDeadline)}d remaining)
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs text-muted-foreground block mb-1">Admin Notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground resize-none"
                placeholder="Evidence submitted, response sent…"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {selected.status === 'OPEN' && (
                <button onClick={() => updateStatus(selected.id, 'UNDER_REVIEW')} disabled={saving}
                  className="px-3 py-1.5 text-sm bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 disabled:opacity-50">
                  Mark Under Review
                </button>
              )}
              {['OPEN', 'UNDER_REVIEW'].includes(selected.status) && (
                <>
                  <button onClick={() => updateStatus(selected.id, 'WON', 'WON')} disabled={saving}
                    className="px-3 py-1.5 text-sm bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 disabled:opacity-50">
                    Mark Won
                  </button>
                  <button onClick={() => updateStatus(selected.id, 'LOST', 'LOST')} disabled={saving}
                    className="px-3 py-1.5 text-sm bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 disabled:opacity-50">
                    Mark Lost
                  </button>
                </>
              )}
              <button onClick={() => { setSaving(true); fetch(`/api/admin/chargebacks/${selected.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminNotes: notes }) }).then(() => { setSaving(false); load() }) }} disabled={saving}
                className="px-3 py-1.5 text-sm bg-primary/20 text-primary rounded-lg hover:bg-primary/30 disabled:opacity-50">
                Save Notes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
