'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { X, XCircle, ArrowRight } from 'lucide-react'
import Link from 'next/link'

const DISMISS_KEY = 'nd_rejection_banner_dismissed_v'

export function RejectionBannerWrapper() {
  const { data: session } = useSession()
  const [reason, setReason] = useState<string | null>(null)
  const [isDismissed, setIsDismissed] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (!session?.user || (session.user as any).role !== 'BUYER') return
    fetch('/api/user/application-status')
      .then((res) => res.json())
      .then((data: { status: string; reason: string | null }) => {
        if (data.status !== 'REJECTED') return
        setReason(data.reason)
        // Dismiss key includes truncated reason so re-rejection shows the banner again
        const key = DISMISS_KEY + btoa(data.reason ?? '').slice(0, 8)
        setIsDismissed(!!localStorage.getItem(key))
        setMounted(true)
      })
      .catch(() => {})
  }, [session])

  function handleDismiss() {
    const key = DISMISS_KEY + btoa(reason ?? '').slice(0, 8)
    localStorage.setItem(key, '1')
    setIsDismissed(true)
  }

  if (!mounted || isDismissed) return null

  return (
    <div style={{
      background: '#fef2f2',
      borderBottom: '1px solid #fca5a5',
      padding: '10px 24px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    }}>
      <XCircle size={18} style={{ color: '#dc2626', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#991b1b' }}>
          Creator application not approved.
        </span>
        {reason && (
          <span style={{
            fontSize: '13px', color: '#b91c1c', marginLeft: '6px',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            display: 'inline',
          }}>
            {reason}
          </span>
        )}
      </div>
      <Link
        href="/start-selling"
        style={{
          display: 'flex', alignItems: 'center', gap: '4px',
          fontSize: '13px', fontWeight: 600, color: '#dc2626',
          whiteSpace: 'nowrap', textDecoration: 'none',
          background: 'white', padding: '6px 12px',
          borderRadius: '20px', border: '1px solid #fca5a5',
          flexShrink: 0,
        }}
      >
        Reapply <ArrowRight size={13} />
      </Link>
      <button
        suppressHydrationWarning
        onClick={handleDismiss}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#dc2626', padding: '4px',
          display: 'flex', alignItems: 'center', flexShrink: 0,
        }}
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>
    </div>
  )
}
