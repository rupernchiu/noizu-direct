'use client'

import { useState, useMemo } from 'react'
import { Check, X, Trash2 } from 'lucide-react'

interface MessageRow {
  id: string
  authorName: string
  content: string
  rating?: number
  createdAt: string
  status: string
}

type StatusFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'

const PER_PAGE = 20

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return {
    date: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
  }
}

const inputCls = 'rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none'

const STATUS_BADGE: Record<string, string> = {
  PENDING:  'bg-warning/10 text-warning border border-warning/30',
  APPROVED: 'bg-success/10 text-success border border-success/30',
  REJECTED: 'bg-destructive/10 text-destructive border border-destructive/30',
}

export function StorefrontMessagesManager({ initialMessages }: { initialMessages: MessageRow[] }) {
  const [messages, setMessages] = useState(initialMessages)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)

  const pendingCount = messages.filter(m => m.status === 'PENDING').length

  const filtered = useMemo(() => {
    let list = [...messages]
    if (statusFilter !== 'ALL') list = list.filter(m => m.status === statusFilter)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(m => m.authorName.toLowerCase().includes(q) || m.content.toLowerCase().includes(q))
    }
    return list
  }, [messages, statusFilter, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const pageRows = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  async function handleApprove(id: string) {
    setLoading(id)
    const res = await fetch(`/api/dashboard/reviews/messages/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve' }),
    })
    if (res.ok) {
      setMessages(prev => prev.map(m => m.id === id ? { ...m, status: 'APPROVED' } : m))
    }
    setLoading(null)
  }

  async function handleReject(id: string) {
    setLoading(id)
    const res = await fetch(`/api/dashboard/reviews/messages/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject' }),
    })
    if (res.ok) {
      setMessages(prev => prev.map(m => m.id === id ? { ...m, status: 'REJECTED' } : m))
    }
    setLoading(null)
  }

  async function handleDelete(id: string) {
    setLoading(id)
    const res = await fetch(`/api/dashboard/reviews/messages/${id}`, { method: 'DELETE' })
    if (res.ok) { setMessages(prev => prev.filter(m => m.id !== id)); setConfirmDelete(null) }
    setLoading(null)
  }

  const statusTabs: StatusFilter[] = ['ALL', 'PENDING', 'APPROVED', 'REJECTED']

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <h1 className="text-xl font-bold text-foreground">Fan Messages</h1>
        {pendingCount > 0 && (
          <span className="rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-bold text-warning border border-warning/30">
            {pendingCount} pending
          </span>
        )}
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 border-b border-border mb-4">
        {statusTabs.map(s => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1) }}
            className={[
              'px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors',
              statusFilter === s ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
            ].join(' ')}
          >
            {s === 'ALL' ? `All (${messages.length})` : `${s.charAt(0) + s.slice(1).toLowerCase()} (${messages.filter(m => m.status === s).length})`}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <input
          className={inputCls}
          placeholder="Search member or message…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          style={{ minWidth: 220 }}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8">No messages found.</p>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Message</th>
                  <th className="px-4 py-3">Rating</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {pageRows.map(msg => {
                  const { date, time } = formatDateTime(msg.createdAt)
                  const isPending = msg.status === 'PENDING'
                  return (
                    <tr key={msg.id} className={['hover:bg-surface/50 transition-colors', isPending ? 'bg-warning/5' : ''].join(' ')}>
                      <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{msg.authorName}</td>
                      <td className="px-4 py-3 text-muted-foreground max-w-[300px]"><p className="truncate">{msg.content}</p></td>
                      <td className="px-4 py-3 text-yellow-400 whitespace-nowrap text-sm">
                        {msg.rating ? '★'.repeat(msg.rating) + '☆'.repeat(5 - msg.rating) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{date}<br />{time}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[msg.status] ?? 'bg-border text-muted-foreground'}`}>
                          {msg.status.charAt(0) + msg.status.slice(1).toLowerCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {isPending && (
                            <>
                              <button
                                onClick={() => handleApprove(msg.id)}
                                disabled={loading === msg.id}
                                className="p-1 rounded hover:bg-success/10 text-success/60 hover:text-success disabled:opacity-30 transition-colors"
                                aria-label="Approve"
                              >
                                <Check className="size-4" />
                              </button>
                              <button
                                onClick={() => handleReject(msg.id)}
                                disabled={loading === msg.id}
                                className="p-1 rounded hover:bg-destructive/10 text-destructive/60 hover:text-destructive disabled:opacity-30 transition-colors"
                                aria-label="Reject"
                              >
                                <X className="size-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => setConfirmDelete(msg.id)}
                            disabled={loading === msg.id}
                            className="p-1 rounded hover:bg-destructive/10 text-destructive/60 hover:text-destructive disabled:opacity-30 transition-colors"
                            aria-label="Delete"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Page {page} of {totalPages} ({filtered.length} messages)</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg border border-border hover:bg-surface disabled:opacity-40 transition-colors">Previous</button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 rounded-lg border border-border hover:bg-surface disabled:opacity-40 transition-colors">Next</button>
              </div>
            </div>
          )}
        </>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setConfirmDelete(null)}>
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-2xl" onClick={e => e.stopPropagation()}>
            <p className="text-base font-semibold text-foreground mb-2">Delete this message?</p>
            <p className="text-sm text-muted-foreground mb-5">This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-surface transition-colors">Cancel</button>
              <button onClick={() => handleDelete(confirmDelete)} disabled={loading === confirmDelete} className="flex-1 rounded-xl bg-destructive py-2.5 text-sm font-semibold text-white hover:bg-destructive/90 transition-colors disabled:opacity-50">
                {loading === confirmDelete ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
