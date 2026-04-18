'use client'

import { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, Trash2 } from 'lucide-react'

interface MessageRow {
  id: string
  senderName: string
  content: string
  createdAt: string
  displayOrder: number
}

const PER_PAGE = 20

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return {
    date: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
  }
}

const inputCls = 'rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none'

export function StorefrontMessagesManager({ initialMessages }: { initialMessages: MessageRow[] }) {
  const [messages, setMessages] = useState(initialMessages)
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)

  const filtered = useMemo(() => {
    let list = [...messages]
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(m => m.senderName.toLowerCase().includes(q) || m.content.toLowerCase().includes(q))
    }
    if (dateFrom) list = list.filter(m => m.createdAt >= dateFrom)
    if (dateTo) list = list.filter(m => m.createdAt <= dateTo + 'T23:59:59')
    return list
  }, [messages, search, dateFrom, dateTo])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const pageRows = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  async function handleDelete(id: string) {
    setLoading(id)
    const res = await fetch(`/api/dashboard/reviews/messages/${id}`, { method: 'DELETE' })
    if (res.ok) { setMessages(prev => prev.filter(m => m.id !== id)); setConfirmDelete(null) }
    setLoading(null)
  }

  async function handleReorder(id: string, direction: 'up' | 'down') {
    const idx = messages.findIndex(m => m.id === id)
    if (idx < 0) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= messages.length) return
    const updated = [...messages]
    const aOrder = updated[idx].displayOrder
    const bOrder = updated[swapIdx].displayOrder
    updated[idx] = { ...updated[idx], displayOrder: bOrder }
    updated[swapIdx] = { ...updated[swapIdx], displayOrder: aOrder }
    ;[updated[idx], updated[swapIdx]] = [updated[swapIdx], updated[idx]]
    setMessages(updated)
    setLoading(id)
    await Promise.all([
      fetch(`/api/dashboard/reviews/messages/${updated[swapIdx].id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ displayOrder: bOrder }) }),
      fetch(`/api/dashboard/reviews/messages/${updated[idx].id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ displayOrder: aOrder }) }),
    ])
    setLoading(null)
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground mb-4">Storefront Messages</h1>

      <div className="flex flex-wrap gap-2 mb-4">
        <input className={inputCls} placeholder="Search member or message…" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} style={{ minWidth: 220 }} />
        <input type="date" className={inputCls} value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1) }} />
        <input type="date" className={inputCls} value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1) }} />
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
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {pageRows.map(msg => {
                  const { date, time } = formatDateTime(msg.createdAt)
                  const globalIdx = messages.findIndex(m => m.id === msg.id)
                  return (
                    <tr key={msg.id} className="hover:bg-surface/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{msg.senderName}</td>
                      <td className="px-4 py-3 text-muted-foreground max-w-[300px]"><p className="truncate">{msg.content}</p></td>
                      <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{date}<br />{time}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleReorder(msg.id, 'up')} disabled={globalIdx === 0 || loading === msg.id} className="p-1 rounded hover:bg-border/40 disabled:opacity-30 transition-colors" aria-label="Move up"><ChevronUp className="size-4" /></button>
                          <button onClick={() => handleReorder(msg.id, 'down')} disabled={globalIdx === messages.length - 1 || loading === msg.id} className="p-1 rounded hover:bg-border/40 disabled:opacity-30 transition-colors" aria-label="Move down"><ChevronDown className="size-4" /></button>
                          <button onClick={() => setConfirmDelete(msg.id)} disabled={loading === msg.id} className="p-1 rounded hover:bg-destructive/10 text-destructive/60 hover:text-destructive disabled:opacity-30 transition-colors" aria-label="Delete"><Trash2 className="size-4" /></button>
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
              <button onClick={() => handleDelete(confirmDelete)} disabled={loading === confirmDelete} className="flex-1 rounded-xl bg-destructive py-2.5 text-sm font-semibold text-white hover:bg-destructive/90 transition-colors disabled:opacity-50">{loading === confirmDelete ? 'Deleting…' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
