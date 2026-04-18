'use client'

import { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, Trash2, ExternalLink } from 'lucide-react'

interface ReviewRow {
  id: string
  productId: string
  productTitle: string
  creatorName: string
  buyerName: string
  rating: number
  title: string | null
  body: string | null
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

export function ProductReviewsManager({ initialReviews }: { initialReviews: ReviewRow[] }) {
  const [reviews, setReviews] = useState(initialReviews)
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)

  const filtered = useMemo(() => {
    let list = [...reviews]
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(r =>
        r.productTitle.toLowerCase().includes(q) ||
        r.buyerName.toLowerCase().includes(q) ||
        r.creatorName.toLowerCase().includes(q)
      )
    }
    if (dateFrom) list = list.filter(r => r.createdAt >= dateFrom)
    if (dateTo) list = list.filter(r => r.createdAt <= dateTo + 'T23:59:59')
    return list
  }, [reviews, search, dateFrom, dateTo])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const pageRows = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  async function handleDelete(id: string) {
    setLoading(id)
    const res = await fetch(`/api/dashboard/reviews/products/${id}`, { method: 'DELETE' })
    if (res.ok) { setReviews(prev => prev.filter(r => r.id !== id)); setConfirmDelete(null) }
    setLoading(null)
  }

  async function handleReorder(id: string, direction: 'up' | 'down') {
    const idx = reviews.findIndex(r => r.id === id)
    if (idx < 0) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= reviews.length) return
    const updated = [...reviews]
    const aOrder = updated[idx].displayOrder
    const bOrder = updated[swapIdx].displayOrder
    updated[idx] = { ...updated[idx], displayOrder: bOrder }
    updated[swapIdx] = { ...updated[swapIdx], displayOrder: aOrder }
    ;[updated[idx], updated[swapIdx]] = [updated[swapIdx], updated[idx]]
    setReviews(updated)
    setLoading(id)
    await Promise.all([
      fetch(`/api/dashboard/reviews/products/${updated[swapIdx].id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ displayOrder: bOrder }) }),
      fetch(`/api/dashboard/reviews/products/${updated[idx].id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ displayOrder: aOrder }) }),
    ])
    setLoading(null)
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground mb-4">Product Reviews</h1>

      <div className="flex flex-wrap gap-2 mb-4">
        <input className={inputCls} placeholder="Search product, creator, member…" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} style={{ minWidth: 220 }} />
        <input type="date" className={inputCls} value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1) }} />
        <input type="date" className={inputCls} value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1) }} />
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8">No reviews found.</p>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Creator</th>
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Rating</th>
                  <th className="hidden md:table-cell px-4 py-3">Review</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {pageRows.map(review => {
                  const { date, time } = formatDateTime(review.createdAt)
                  const globalIdx = reviews.findIndex(r => r.id === review.id)
                  return (
                    <tr key={review.id} className="hover:bg-surface/50 transition-colors">
                      <td className="px-4 py-3 max-w-[140px]">
                        <a href={`/product/${review.productId}`} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline flex items-center gap-1 truncate">
                          <span className="truncate">{review.productTitle}</span>
                          <ExternalLink className="size-3 shrink-0" />
                        </a>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{review.creatorName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{review.buyerName}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-yellow-400">{'★'.repeat(review.rating)}</span><span className="text-border">{'★'.repeat(5 - review.rating)}</span>
                      </td>
                      <td className="hidden md:table-cell px-4 py-3 text-muted-foreground max-w-[200px]">
                        {review.title && <p className="font-medium text-foreground text-xs truncate">{review.title}</p>}
                        {review.body && <p className="text-xs truncate">{review.body}</p>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                        {date}<br />{time}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleReorder(review.id, 'up')} disabled={globalIdx === 0 || loading === review.id} className="p-1 rounded hover:bg-border/40 disabled:opacity-30 transition-colors" aria-label="Move up"><ChevronUp className="size-4" /></button>
                          <button onClick={() => handleReorder(review.id, 'down')} disabled={globalIdx === reviews.length - 1 || loading === review.id} className="p-1 rounded hover:bg-border/40 disabled:opacity-30 transition-colors" aria-label="Move down"><ChevronDown className="size-4" /></button>
                          <button onClick={() => setConfirmDelete(review.id)} disabled={loading === review.id} className="p-1 rounded hover:bg-destructive/10 text-destructive/60 hover:text-destructive disabled:opacity-30 transition-colors" aria-label="Delete"><Trash2 className="size-4" /></button>
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
              <span className="text-muted-foreground">Page {page} of {totalPages} ({filtered.length} reviews)</span>
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
            <p className="text-base font-semibold text-foreground mb-2">Delete this review?</p>
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
