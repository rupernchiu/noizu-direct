'use client'
import { useState, useEffect, useCallback } from 'react'
import { Shield, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react'

type FraudFlag = {
  id: string
  type: string
  severity: string
  status: string
  description: string
  orderId: string | null
  userId: string | null
  createdAt: string
  reviewedAt: string | null
  reviewedBy: string | null
  reviewNote: string | null
}

const STATUS_OPTIONS = ['OPEN', 'REVIEWED', 'DISMISSED', 'ACTIONED']

const severityStyle: Record<string, string> = {
  LOW:      'bg-blue-500/20 text-blue-400',
  MEDIUM:   'bg-yellow-500/20 text-yellow-400',
  HIGH:     'bg-orange-500/20 text-orange-400',
  CRITICAL: 'bg-red-500/20 text-red-400',
}

const statusStyle: Record<string, string> = {
  OPEN:      'bg-red-500/20 text-red-400',
  REVIEWED:  'bg-yellow-500/20 text-yellow-400',
  DISMISSED: 'bg-muted/20 text-muted-foreground',
  ACTIONED:  'bg-green-500/20 text-green-400',
}

type FreezeTarget = { id: string; name: string; frozen: boolean }

export default function FraudPage() {
  const [flags, setFlags] = useState<FraudFlag[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('OPEN')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<FraudFlag | null>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [saving, setSaving] = useState(false)

  // Creator freeze
  const [freezeId, setFreezeId] = useState('')
  const [freezeReason, setFreezeReason] = useState('')
  const [freezeLoading, setFreezeLoading] = useState(false)
  const [freezeResult, setFreezeResult] = useState<FreezeTarget | null>(null)

  // Manual flag creation
  const [showCreate, setShowCreate] = useState(false)
  const [newFlag, setNewFlag] = useState({ type: 'MANUAL', severity: 'MEDIUM', description: '', orderId: '', userId: '' })
  const [createLoading, setCreateLoading] = useState(false)

  const perPage = 25

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), status: statusFilter })
    const r = await fetch(`/api/admin/fraud/flags?${params}`)
    if (r.ok) { const d = await r.json(); setFlags(d.items); setTotal(d.total) }
    setLoading(false)
  }, [page, statusFilter])

  useEffect(() => { load() }, [load])

  async function updateFlag(id: string, status: string) {
    setSaving(true)
    await fetch(`/api/admin/fraud/flags/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, reviewNote }),
    })
    setSaving(false)
    setSelected(null)
    load()
  }

  async function handleFreeze(freeze: boolean) {
    if (!freezeId.trim()) return
    setFreezeLoading(true)
    const r = await fetch(`/api/admin/fraud/creators/${freezeId}/freeze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ freeze, reason: freezeReason }),
    })
    if (r.ok) setFreezeResult(await r.json())
    setFreezeLoading(false)
  }

  async function createFlagSubmit() {
    setCreateLoading(true)
    await fetch('/api/admin/fraud/flags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newFlag,
        orderId: newFlag.orderId || undefined,
        userId: newFlag.userId || undefined,
      }),
    })
    setCreateLoading(false)
    setShowCreate(false)
    setNewFlag({ type: 'MANUAL', severity: 'MEDIUM', description: '', orderId: '', userId: '' })
    if (statusFilter === 'OPEN') load()
  }

  const totalPages = Math.ceil(total / perPage)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Fraud Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Review fraud flags, freeze creator payouts, manage risk</p>
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
            className="px-3 py-1.5 text-sm bg-card border border-border rounded-lg text-foreground"
          >
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button
            onClick={() => setShowCreate(true)}
            className="px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            + Flag
          </button>
        </div>
      </div>

      {/* Creator payout freeze */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-red-400" />
          <h2 className="font-semibold text-foreground text-sm">Creator Payout Freeze</h2>
        </div>
        <p className="text-xs text-muted-foreground">Enter a creator's user ID to freeze or unfreeze their payouts. Frozen creators cannot receive Friday payouts until released.</p>
        <div className="flex flex-wrap gap-2">
          <input
            value={freezeId}
            onChange={e => setFreezeId(e.target.value)}
            placeholder="Creator user ID"
            className="flex-1 min-w-48 px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground"
          />
          <input
            value={freezeReason}
            onChange={e => setFreezeReason(e.target.value)}
            placeholder="Reason (required for freeze)"
            className="flex-1 min-w-48 px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground"
          />
          <button
            onClick={() => handleFreeze(true)}
            disabled={freezeLoading || !freezeId.trim() || !freezeReason.trim()}
            className="px-3 py-2 text-sm bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 disabled:opacity-50"
          >
            Freeze
          </button>
          <button
            onClick={() => handleFreeze(false)}
            disabled={freezeLoading || !freezeId.trim()}
            className="px-3 py-2 text-sm bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 disabled:opacity-50"
          >
            Unfreeze
          </button>
        </div>
        {freezeResult && (
          <p className="text-xs text-foreground">
            {freezeResult.name}: payouts are now <strong className={freezeResult.frozen ? 'text-red-400' : 'text-green-400'}>{freezeResult.frozen ? 'FROZEN' : 'ACTIVE'}</strong>
            {freezeResult.frozen && ' — they will not receive Friday sweeps until released.'}
          </p>
        )}
      </div>

      {/* Flags table */}
      {loading ? (
        <div className="py-16 text-center text-muted-foreground">Loading…</div>
      ) : flags.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center text-muted-foreground">
          No {statusFilter.toLowerCase()} fraud flags.
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm [&_td]:whitespace-nowrap">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-border bg-muted/10">
                <th className="px-3 py-1.5 text-left font-medium">Type</th>
                <th className="px-3 py-1.5 text-left font-medium">Severity</th>
                <th className="px-3 py-1.5 text-left font-medium">Description</th>
                <th className="px-3 py-1.5 text-left font-medium hidden md:table-cell">Linked</th>
                <th className="px-3 py-1.5 text-left font-medium">Status</th>
                <th className="px-3 py-1.5 text-left font-medium hidden sm:table-cell">Date</th>
                <th className="px-3 py-1.5 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {flags.map(f => (
                <tr key={f.id} className="border-b border-border last:border-0 hover:bg-muted/10">
                  <td className="px-3 py-1.5 text-xs font-medium text-muted-foreground">{f.type.replace(/_/g, ' ')}</td>
                  <td className="px-3 py-1.5">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${severityStyle[f.severity] ?? ''}`}>
                      {f.severity}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-foreground truncate max-w-[200px]">{f.description}</td>
                  <td className="px-3 py-1.5 hidden md:table-cell text-xs text-muted-foreground">
                    {f.orderId ? `Order: ${f.orderId.slice(-8).toUpperCase()}` : f.userId ? `User: ${f.userId.slice(-8).toUpperCase()}` : '—'}
                  </td>
                  <td className="px-3 py-1.5">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle[f.status] ?? ''}`}>
                      {f.status}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 hidden sm:table-cell text-xs text-muted-foreground">
                    {new Date(f.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-1.5">
                    <button
                      onClick={() => { setSelected(f); setReviewNote(f.reviewNote ?? '') }}
                      className="text-xs text-primary hover:underline"
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{total} flags</span>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-1 disabled:opacity-30"><ChevronLeft size={16} /></button>
            <span>{page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-1 disabled:opacity-30"><ChevronRight size={16} /></button>
          </div>
        </div>
      )}

      {/* Review modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-md space-y-4 p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-foreground flex items-center gap-2"><AlertTriangle size={16} className="text-yellow-400" /> Review Flag</h2>
              <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="text-sm space-y-2">
              <div><span className="text-muted-foreground">Type: </span><span className="text-foreground">{selected.type}</span></div>
              <div><span className="text-muted-foreground">Severity: </span><span className="text-foreground">{selected.severity}</span></div>
              <div><span className="text-muted-foreground">Description: </span><span className="text-foreground">{selected.description}</span></div>
              {selected.orderId && <div><span className="text-muted-foreground">Order: </span><span className="font-mono text-foreground">{selected.orderId}</span></div>}
              {selected.userId && <div><span className="text-muted-foreground">User: </span><span className="font-mono text-foreground">{selected.userId}</span></div>}
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Review Note</label>
              <textarea
                value={reviewNote}
                onChange={e => setReviewNote(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground resize-none"
                placeholder="What action was taken…"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => updateFlag(selected.id, 'REVIEWED')} disabled={saving}
                className="px-3 py-1.5 text-sm bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 disabled:opacity-50">
                Mark Reviewed
              </button>
              <button onClick={() => updateFlag(selected.id, 'DISMISSED')} disabled={saving}
                className="px-3 py-1.5 text-sm bg-muted/20 text-muted-foreground rounded-lg hover:bg-muted/30 disabled:opacity-50">
                Dismiss
              </button>
              <button onClick={() => updateFlag(selected.id, 'ACTIONED')} disabled={saving}
                className="px-3 py-1.5 text-sm bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 disabled:opacity-50">
                Mark Actioned
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create flag modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-md space-y-4 p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-foreground">Create Manual Fraud Flag</h2>
              <button onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Type</label>
                  <select value={newFlag.type} onChange={e => setNewFlag(f => ({ ...f, type: e.target.value }))}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm">
                    {['MANUAL', 'VELOCITY', 'AMOUNT_THRESHOLD', 'CHARGEBACK_PATTERN'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Severity</label>
                  <select value={newFlag.severity} onChange={e => setNewFlag(f => ({ ...f, severity: e.target.value }))}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm">
                    {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Description *</label>
                <textarea value={newFlag.description} onChange={e => setNewFlag(f => ({ ...f, description: e.target.value }))}
                  rows={2} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm resize-none"
                  placeholder="Describe the suspicious activity…" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Order ID (optional)</label>
                  <input value={newFlag.orderId} onChange={e => setNewFlag(f => ({ ...f, orderId: e.target.value }))}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">User ID (optional)</label>
                  <input value={newFlag.userId} onChange={e => setNewFlag(f => ({ ...f, userId: e.target.value }))}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
              <button onClick={createFlagSubmit} disabled={createLoading || !newFlag.description.trim()}
                className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50">
                Create Flag
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
