'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Bell, ShoppingBag, Package, AlertTriangle, AlertOctagon, XCircle,
  CheckCircle, MessageCircle, Zap, ClipboardCheck, Wallet, Truck,
  Download, ArrowLeftRight,
} from 'lucide-react'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  isRead: boolean
  actionUrl: string | null
  createdAt: string
}

const P = '#7c3aed'
const PAGE_SIZE = 20

function typeIcon(type: string) {
  const cls = 'shrink-0 mt-0.5'
  switch (type) {
    case 'NEW_ORDER':                 return <ShoppingBag size={18} color="#22c55e" className={cls} />
    case 'FULFILLMENT_REMINDER':      return <Package size={18} color="#eab308" className={cls} />
    case 'FULFILLMENT_WARNING':       return <AlertTriangle size={18} color="#f97316" className={cls} />
    case 'FULFILLMENT_FINAL_WARNING': return <AlertOctagon size={18} color="#ef4444" className={cls} />
    case 'ORDER_CANCELLED':           return <XCircle size={18} color="#ef4444" className={cls} />
    case 'ESCROW_RELEASED':           return <CheckCircle size={18} color="#22c55e" className={cls} />
    case 'NEW_MESSAGE':               return <MessageCircle size={18} color="#3b82f6" className={cls} />
    case 'DISPUTE_RAISED':            return <Zap size={18} color="#ef4444" className={cls} />
    case 'DISPUTE_RESOLVED':          return <ClipboardCheck size={18} color={P} className={cls} />
    case 'PAYOUT_PROCESSED':          return <Wallet size={18} color="#22c55e" className={cls} />
    case 'ORDER_CONFIRMED':           return <CheckCircle size={18} color="#22c55e" className={cls} />
    case 'ORDER_SHIPPED':             return <Truck size={18} color="#3b82f6" className={cls} />
    case 'DOWNLOAD_READY':            return <Download size={18} color={P} className={cls} />
    case 'REFUND_ISSUED':             return <ArrowLeftRight size={18} color="#f97316" className={cls} />
    case 'APPLICATION_APPROVED':      return <CheckCircle size={18} color="#22c55e" className={cls} />
    case 'APPLICATION_REJECTED':      return <XCircle size={18} color="#ef4444" className={cls} />
    default:                          return <Bell size={18} color="var(--muted-foreground)" className={cls} />
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-MY', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function NotificationsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)

  const loadNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/notifications?page=${page}`)
      if (res.ok) {
        const data = await res.json() as { notifications: Notification[] }
        setNotifications(data.notifications)
      }
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => { void loadNotifications() }, [loadNotifications])

  async function markAllRead() {
    setMarkingAll(true)
    try {
      await fetch('/api/notifications/read-all', { method: 'POST' })
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    } catch { /* ignore */ } finally {
      setMarkingAll(false)
    }
  }

  async function handleRowClick(notif: Notification) {
    if (!notif.isRead) {
      try {
        await fetch(`/api/notifications/${notif.id}/read`, { method: 'POST' })
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n))
      } catch { /* ignore */ }
    }
    if (notif.actionUrl) router.push(notif.actionUrl)
  }

  const hasUnread = notifications.some(n => !n.isRead)
  const hasPrev = page > 1
  const hasNext = notifications.length === PAGE_SIZE

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-1">Your activity and updates</p>
        </div>
        {hasUnread && (
          <button
            suppressHydrationWarning
            onClick={() => void markAllRead()}
            disabled={markingAll}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-surface text-sm text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle size={14} />
            {markingAll ? 'Marking…' : 'Mark all as read'}
          </button>
        )}
      </div>

      {/* List */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>
        ) : notifications.length === 0 ? (
          <div className="py-16 text-center">
            <Bell size={32} className="mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-muted-foreground">You have no notifications yet</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {notifications.map(notif => {
              const isClickable = Boolean(notif.actionUrl) || !notif.isRead
              return (
                <li key={notif.id}>
                  <button
                    suppressHydrationWarning
                    onClick={() => void handleRowClick(notif)}
                    disabled={!isClickable}
                    className={[
                      'w-full flex items-start gap-3 px-5 py-4 text-left transition-colors',
                      notif.isRead
                        ? 'bg-transparent hover:bg-background/60'
                        : 'bg-primary/[0.04] border-l-2 border-primary hover:bg-primary/[0.07]',
                      isClickable ? 'cursor-pointer' : 'cursor-default',
                    ].join(' ')}
                  >
                    {typeIcon(notif.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className={`text-sm leading-snug truncate ${notif.isRead ? 'font-medium text-foreground' : 'font-semibold text-foreground'}`}>
                          {notif.title}
                        </p>
                        <span suppressHydrationWarning className="shrink-0 text-xs text-muted-foreground">
                          {timeAgo(notif.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5 leading-snug">
                        {notif.message}
                      </p>
                    </div>
                    {!notif.isRead && (
                      <span className="shrink-0 mt-1.5 w-2 h-2 rounded-full bg-primary" />
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Pagination */}
      {(hasPrev || hasNext) && (
        <div className="flex items-center justify-between gap-4">
          {hasPrev ? (
            <Link
              href={`/account/notifications?page=${page - 1}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border bg-background hover:bg-surface text-sm text-foreground transition-colors"
            >
              ← Previous
            </Link>
          ) : <span />}
          <span className="text-sm text-muted-foreground">Page {page}</span>
          {hasNext ? (
            <Link
              href={`/account/notifications?page=${page + 1}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border bg-background hover:bg-surface text-sm text-foreground transition-colors"
            >
              Next →
            </Link>
          ) : <span />}
        </div>
      )}
    </div>
  )
}
