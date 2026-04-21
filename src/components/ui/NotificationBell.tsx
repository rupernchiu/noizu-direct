'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  Bell, ShoppingBag, Package, AlertTriangle, AlertOctagon, XCircle,
  CheckCircle, MessageCircle, Zap, ClipboardCheck, Wallet, Truck,
  Download, ArrowLeftRight,
} from 'lucide-react'

interface Notification {
  id: string; userId: string; type: string; title: string; message: string
  orderId: string | null; isRead: boolean; actionUrl: string | null; createdAt: string
}

const P = '#7c3aed'

function typeIcon(type: string) {
  const s = { flexShrink: 0 } as const
  switch (type) {
    case 'NEW_ORDER':               return <ShoppingBag size={16} color="#22c55e" style={s} />
    case 'FULFILLMENT_REMINDER':    return <Package size={16} color="#eab308" style={s} />
    case 'FULFILLMENT_WARNING':     return <AlertTriangle size={16} color="#f97316" style={s} />
    case 'FULFILLMENT_FINAL_WARNING': return <AlertOctagon size={16} color="#ef4444" style={s} />
    case 'ORDER_CANCELLED':         return <XCircle size={16} color="#ef4444" style={s} />
    case 'ESCROW_RELEASED':         return <CheckCircle size={16} color="#22c55e" style={s} />
    case 'NEW_MESSAGE':             return <MessageCircle size={16} color="#3b82f6" style={s} />
    case 'DISPUTE_RAISED':          return <Zap size={16} color="#ef4444" style={s} />
    case 'DISPUTE_RESOLVED':        return <ClipboardCheck size={16} color={P} style={s} />
    case 'PAYOUT_PROCESSED':        return <Wallet size={16} color="#22c55e" style={s} />
    case 'ORDER_CONFIRMED':         return <CheckCircle size={16} color="#22c55e" style={s} />
    case 'ORDER_SHIPPED':           return <Truck size={16} color="#3b82f6" style={s} />
    case 'DOWNLOAD_READY':          return <Download size={16} color={P} style={s} />
    case 'REFUND_ISSUED':           return <ArrowLeftRight size={16} color="#f97316" style={s} />
    case 'APPLICATION_APPROVED':    return <CheckCircle size={16} color="#22c55e" style={s} />
    case 'APPLICATION_REJECTED':    return <XCircle size={16} color="#ef4444" style={s} />
    default:                        return <Bell size={16} color="var(--muted-foreground)" style={s} />
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
  return new Date(dateStr).toLocaleDateString('en-MY', { month: 'short', day: 'numeric' })
}

export function NotificationBell({ viewAllHref = '/account/notifications' }: { viewAllHref?: string }) {
  const { data: session } = useSession()
  const router = useRouter()
  const [count, setCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const fetchCount = useCallback(async () => {
    if (!session?.user) return
    try {
      const res = await fetch('/api/notifications/unread-count')
      const data = await res.json() as { count: number }
      setCount(data.count)
    } catch { /* ignore */ }
  }, [session])

  const fetchNotifications = useCallback(async () => {
    if (!session?.user) return
    setLoading(true)
    try {
      const res = await fetch('/api/notifications?page=1')
      const data = await res.json() as { notifications: Notification[]; unreadCount: number }
      setNotifications(data.notifications)
      setCount(data.unreadCount)
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [session])

  // Poll every 30s
  useEffect(() => {
    fetchCount()
    const interval = setInterval(fetchCount, 30000)
    return () => clearInterval(interval)
  }, [fetchCount])

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (open) fetchNotifications()
  }, [open, fetchNotifications])

  // Close on outside click / Escape
  useEffect(() => {
    function onOut(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onEsc(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    if (open) {
      document.addEventListener('mousedown', onOut)
      window.addEventListener('keydown', onEsc)
    }
    return () => {
      document.removeEventListener('mousedown', onOut)
      window.removeEventListener('keydown', onEsc)
    }
  }, [open])

  async function handleClick(notif: Notification) {
    if (!notif.isRead) {
      await fetch(`/api/notifications/${notif.id}/read`, { method: 'POST' })
      setNotifications(ns => ns.map(n => n.id === notif.id ? { ...n, isRead: true } : n))
      setCount(c => Math.max(0, c - 1))
    }
    if (notif.actionUrl) {
      router.push(notif.actionUrl)
      setOpen(false)
    }
  }

  async function markAllRead() {
    await fetch('/api/notifications/read-all', { method: 'POST' })
    setNotifications(ns => ns.map(n => ({ ...n, isRead: true })))
    setCount(0)
  }

  if (!session?.user) return null

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        suppressHydrationWarning
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '36px', height: '36px', position: 'relative',
          background: 'transparent', border: 'none', borderRadius: '8px',
          cursor: 'pointer', color: 'var(--foreground)',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--border)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <Bell size={20} />
        {count > 0 && (
          <span style={{
            position: 'absolute', top: '4px', right: '4px',
            minWidth: '16px', height: '16px',
            background: '#ef4444', borderRadius: '8px',
            border: '1.5px solid var(--background)',
            fontSize: '10px', fontWeight: 700, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 3px', lineHeight: 1,
          }}>
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 50,
          width: 'min(340px, calc(100vw - 24px))',
          maxWidth: 'calc(100vw - 24px)',
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--foreground)' }}>Notifications</p>
            {count > 0 && (
              <button suppressHydrationWarning onClick={markAllRead} style={{ fontSize: '12px', color: P, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                Mark all as read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
            {loading && (
              <div style={{ padding: '24px', textAlign: 'center', fontSize: '13px', color: 'var(--muted-foreground)' }}>Loading…</div>
            )}

            {!loading && notifications.length === 0 && (
              <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '14px', color: 'var(--muted-foreground)' }}>You&apos;re all caught up 🎉</p>
              </div>
            )}

            {!loading && notifications.map(notif => (
              <button
                suppressHydrationWarning
                key={notif.id}
                onClick={() => void handleClick(notif)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: '10px',
                  width: '100%', padding: '10px 16px', textAlign: 'left',
                  background: notif.isRead ? 'transparent' : 'rgba(124,58,237,0.04)',
                  borderLeft: notif.isRead ? '3px solid transparent' : `3px solid ${P}`,
                  border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
                onMouseLeave={e => (e.currentTarget.style.background = notif.isRead ? 'transparent' : 'rgba(124,58,237,0.04)')}
              >
                <div style={{ marginTop: '2px' }}>{typeIcon(notif.type)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--foreground)', lineHeight: 1.4 }}>{notif.title}</p>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--muted-foreground)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {notif.message}
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--muted-foreground)' }}>{timeAgo(notif.createdAt)}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Footer */}
          <div style={{ borderTop: '1px solid var(--border)', padding: '8px 16px' }}>
            <Link
              href={viewAllHref}
              onClick={() => setOpen(false)}
              style={{ fontSize: '13px', color: P, textDecoration: 'none', display: 'block', textAlign: 'center' }}
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
