'use client'

import { useState, useMemo } from 'react'
import { Trash2, Eye, EyeOff, ExternalLink } from 'lucide-react'

interface ReviewRow {
  id: string; productId: string; productTitle: string; creatorName: string
  buyerName: string; rating: number; title: string | null; body: string | null
  isVisible: boolean; createdAt: string
}
interface MessageRow {
  id: string; senderName: string; creatorUsername: string | null
  creatorName: string; content: string; createdAt: string
}

const PER_PAGE = 20

function dt(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function trunc(s: string | null, n = 100) {
  if (!s) return ''
  return s.length > n ? s.slice(0, n) + '…' : s
}

export function AdminReviewsClient({ initialReviews, initialMessages }: {
  initialReviews: ReviewRow[]
  initialMessages: MessageRow[]
}) {
  const [tab, setTab] = useState<'reviews' | 'messages'>('reviews')
  const [reviews, setReviews] = useState(initialReviews)
  const [messages, setMessages] = useState(initialMessages)
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; type: 'review' | 'message' } | null>(null)
  const [loading, setLoading] = useState<string | null>(null)

  // Review filters
  const [rSearch, setRSearch] = useState('')
  const [rRating, setRRating] = useState('')
  const [rVisible, setRVisible] = useState('')
  const [rDateFrom, setRDateFrom] = useState('')
  const [rDateTo, setRDateTo] = useState('')
  const [rSort, setRSort] = useState('newest')
  const [rPage, setRPage] = useState(1)

  // Message filters
  const [mSearch, setMSearch] = useState('')
  const [mDateFrom, setMDateFrom] = useState('')
  const [mDateTo, setMDateTo] = useState('')
  const [mPage, setMPage] = useState(1)

  const filteredReviews = useMemo(() => {
    let list = [...reviews]
    if (rSearch) {
      const q = rSearch.toLowerCase()
      list = list.filter(r =>
        r.productTitle.toLowerCase().includes(q) ||
        r.creatorName.toLowerCase().includes(q) ||
        r.buyerName.toLowerCase().includes(q)
      )
    }
    if (rRating) list = list.filter(r => r.rating === Number(rRating))
    if (rVisible === 'visible') list = list.filter(r => r.isVisible)
    if (rVisible === 'hidden') list = list.filter(r => !r.isVisible)
    if (rDateFrom) list = list.filter(r => r.createdAt >= rDateFrom)
    if (rDateTo) list = list.filter(r => r.createdAt <= rDateTo + 'T23:59:59')
    list.sort((a, b) => {
      if (rSort === 'oldest') return a.createdAt.localeCompare(b.createdAt)
      if (rSort === 'highest') return b.rating - a.rating
      if (rSort === 'lowest') return a.rating - b.rating
      return b.createdAt.localeCompare(a.createdAt)
    })
    return list
  }, [reviews, rSearch, rRating, rVisible, rDateFrom, rDateTo, rSort])

  const filteredMessages = useMemo(() => {
    let list = [...messages]
    if (mSearch) {
      const q = mSearch.toLowerCase()
      list = list.filter(m =>
        m.creatorName.toLowerCase().includes(q) ||
        m.senderName.toLowerCase().includes(q)
      )
    }
    if (mDateFrom) list = list.filter(m => m.createdAt >= mDateFrom)
    if (mDateTo) list = list.filter(m => m.createdAt <= mDateTo + 'T23:59:59')
    return list
  }, [messages, mSearch, mDateFrom, mDateTo])

  const rPages = Math.max(1, Math.ceil(filteredReviews.length / PER_PAGE))
  const mPages = Math.max(1, Math.ceil(filteredMessages.length / PER_PAGE))
  const rRows = filteredReviews.slice((rPage - 1) * PER_PAGE, rPage * PER_PAGE)
  const mRows = filteredMessages.slice((mPage - 1) * PER_PAGE, mPage * PER_PAGE)

  async function deleteReview(id: string) {
    setLoading(id)
    const res = await fetch(`/api/admin/reviews/products/${id}`, { method: 'DELETE' })
    if (res.ok) setReviews(prev => prev.filter(r => r.id !== id))
    setConfirmDelete(null); setLoading(null)
  }

  async function toggleVisible(id: string, current: boolean) {
    setLoading(id)
    const res = await fetch(`/api/admin/reviews/products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isVisible: !current }),
    })
    if (res.ok) setReviews(prev => prev.map(r => r.id === id ? { ...r, isVisible: !current } : r))
    setLoading(null)
  }

  async function deleteMessage(id: string) {
    setLoading(id)
    const res = await fetch(`/api/admin/reviews/guestbook/${id}`, { method: 'DELETE' })
    if (res.ok) setMessages(prev => prev.filter(m => m.id !== id))
    setConfirmDelete(null); setLoading(null)
  }

  const inputCls = 'rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none'

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground mb-6">Reviews &amp; Messages</h1>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border mb-6">
        {(['reviews', 'messages'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              'px-5 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors',
              tab === t ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
            ].join(' ')}
          >
            {t === 'reviews' ? `Product Reviews (${reviews.length})` : `Creator Messages (${messages.length})`}
          </button>
        ))}
      </div>

      {/* ── PRODUCT REVIEWS TAB ── */}
      {tab === 'reviews' && (
        <div>
          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-4">
            <input className={inputCls} placeholder="Search product, creator, member…" value={rSearch} onChange={e => { setRSearch(e.target.value); setRPage(1) }} style={{ minWidth: 220 }} />
            <select className={inputCls} value={rRating} onChange={e => { setRRating(e.target.value); setRPage(1) }}>
              <option value="">All ratings</option>
              {[5,4,3,2,1].map(s => <option key={s} value={s}>{s} ★</option>)}
            </select>
            <select className={inputCls} value={rVisible} onChange={e => { setRVisible(e.target.value); setRPage(1) }}>
              <option value="">All visibility</option>
              <option value="visible">Visible</option>
              <option value="hidden">Hidden</option>
            </select>
            <select className={inputCls} value={rSort} onChange={e => setRSort(e.target.value)}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="highest">Highest rating</option>
              <option value="lowest">Lowest rating</option>
            </select>
            <input type="date" className={inputCls} value={rDateFrom} onChange={e => { setRDateFrom(e.target.value); setRPage(1) }} />
            <input type="date" className={inputCls} value={rDateTo} onChange={e => { setRDateTo(e.target.value); setRPage(1) }} />
          </div>

          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm [&_td]:whitespace-nowrap">
              <thead>
                <tr className="border-b border-border bg-surface text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-1.5">Product</th>
                  <th className="px-3 py-1.5">Creator</th>
                  <th className="px-3 py-1.5">Member</th>
                  <th className="px-3 py-1.5">Rating</th>
                  <th className="px-3 py-1.5 hidden lg:table-cell">Review</th>
                  <th className="px-3 py-1.5">Date / Time</th>
                  <th className="px-3 py-1.5">Status</th>
                  <th className="px-3 py-1.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {rRows.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground text-sm">No reviews found</td></tr>
                )}
                {rRows.map(r => (
                  <tr key={r.id} className={r.isVisible ? '' : 'opacity-60'}>
                    <td className="px-3 py-1.5 max-w-[140px]">
                      <a href={`/product/${r.productId}`} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline flex items-center gap-1 truncate">
                        <span className="truncate">{r.productTitle}</span>
                        <ExternalLink className="size-3 shrink-0" />
                      </a>
                    </td>
                    <td className="px-3 py-1.5 text-muted-foreground text-xs whitespace-nowrap">{r.creatorName}</td>
                    <td className="px-3 py-1.5 text-muted-foreground whitespace-nowrap">{r.buyerName}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap">
                      <span className="text-yellow-400">{'★'.repeat(r.rating)}</span><span className="text-border">{'★'.repeat(5 - r.rating)}</span>
                    </td>
                    <td className="hidden lg:table-cell px-3 py-1.5 text-muted-foreground max-w-[200px]">
                      {r.title && <p className="text-xs font-medium text-foreground">{trunc(r.title, 60)}</p>}
                      <p className="text-xs">{trunc(r.body)}</p>
                    </td>
                    <td className="px-3 py-1.5 text-xs text-muted-foreground whitespace-nowrap">{dt(r.createdAt)}</td>
                    <td className="px-3 py-1.5">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${r.isVisible ? 'bg-success/10 text-success' : 'bg-border text-muted-foreground'}`}>
                        {r.isVisible ? 'Visible' : 'Hidden'}
                      </span>
                    </td>
                    <td className="px-3 py-1.5">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => toggleVisible(r.id, r.isVisible)} disabled={loading === r.id} className="p-1 rounded hover:bg-border/40 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors" aria-label={r.isVisible ? 'Hide' : 'Show'}>
                          {r.isVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                        <button onClick={() => setConfirmDelete({ id: r.id, type: 'review' })} disabled={loading === r.id} className="p-1 rounded hover:bg-destructive/10 text-destructive/60 hover:text-destructive disabled:opacity-30 transition-colors" aria-label="Delete">
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {rPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{filteredReviews.length} reviews · page {rPage} of {rPages}</span>
              <div className="flex gap-2">
                <button disabled={rPage === 1} onClick={() => setRPage(p => p - 1)} className="px-3 py-1.5 rounded-lg border border-border hover:bg-surface disabled:opacity-40">Previous</button>
                <button disabled={rPage === rPages} onClick={() => setRPage(p => p + 1)} className="px-3 py-1.5 rounded-lg border border-border hover:bg-surface disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── CREATOR MESSAGES TAB ── */}
      {tab === 'messages' && (
        <div>
          <div className="flex flex-wrap gap-2 mb-4">
            <input className={inputCls} placeholder="Search creator or member…" value={mSearch} onChange={e => { setMSearch(e.target.value); setMPage(1) }} style={{ minWidth: 220 }} />
            <input type="date" className={inputCls} value={mDateFrom} onChange={e => { setMDateFrom(e.target.value); setMPage(1) }} />
            <input type="date" className={inputCls} value={mDateTo} onChange={e => { setMDateTo(e.target.value); setMPage(1) }} />
          </div>

          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm [&_td]:whitespace-nowrap">
              <thead>
                <tr className="border-b border-border bg-surface text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-1.5">Creator</th>
                  <th className="px-3 py-1.5">Member</th>
                  <th className="px-3 py-1.5">Message</th>
                  <th className="px-3 py-1.5">Date / Time</th>
                  <th className="px-3 py-1.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {mRows.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">No messages found</td></tr>
                )}
                {mRows.map(m => (
                  <tr key={m.id}>
                    <td className="px-3 py-1.5">
                      {m.creatorUsername ? (
                        <a href={`/creator/${m.creatorUsername}`} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline flex items-center gap-1 whitespace-nowrap">
                          {m.creatorName} <ExternalLink className="size-3" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground">{m.creatorName}</span>
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-muted-foreground whitespace-nowrap">{m.senderName}</td>
                    <td className="px-3 py-1.5 text-muted-foreground max-w-[300px]"><p className="truncate">{trunc(m.content)}</p></td>
                    <td className="px-3 py-1.5 text-xs text-muted-foreground whitespace-nowrap">{dt(m.createdAt)}</td>
                    <td className="px-3 py-1.5">
                      <div className="flex justify-end">
                        <button onClick={() => setConfirmDelete({ id: m.id, type: 'message' })} disabled={loading === m.id} className="p-1 rounded hover:bg-destructive/10 text-destructive/60 hover:text-destructive disabled:opacity-30 transition-colors">
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {mPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{filteredMessages.length} messages · page {mPage} of {mPages}</span>
              <div className="flex gap-2">
                <button disabled={mPage === 1} onClick={() => setMPage(p => p - 1)} className="px-3 py-1.5 rounded-lg border border-border hover:bg-surface disabled:opacity-40">Previous</button>
                <button disabled={mPage === mPages} onClick={() => setMPage(p => p + 1)} className="px-3 py-1.5 rounded-lg border border-border hover:bg-surface disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirm delete modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setConfirmDelete(null)}>
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-2xl" onClick={e => e.stopPropagation()}>
            <p className="text-base font-semibold text-foreground mb-2">Delete this {confirmDelete.type === 'review' ? 'review' : 'message'}?</p>
            <p className="text-sm text-muted-foreground mb-5">This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-surface transition-colors">Cancel</button>
              <button
                onClick={() => confirmDelete.type === 'review' ? deleteReview(confirmDelete.id) : deleteMessage(confirmDelete.id)}
                disabled={loading === confirmDelete.id}
                className="flex-1 rounded-xl bg-destructive py-2.5 text-sm font-semibold text-white hover:bg-destructive/90 transition-colors disabled:opacity-50"
              >
                {loading === confirmDelete.id ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
