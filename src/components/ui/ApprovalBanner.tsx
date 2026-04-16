'use client'

import { useState, useEffect } from 'react'
import { X, CheckCircle, ArrowRight } from 'lucide-react'
import Link from 'next/link'

const DISMISS_KEY = 'nd_approval_banner_dismissed'

export function ApprovalBanner() {
  const [isDismissed, setIsDismissed] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setIsDismissed(!!localStorage.getItem(DISMISS_KEY))
  }, [])

  function handleDismiss() {
    localStorage.setItem(DISMISS_KEY, '1')
    setIsDismissed(true)
  }

  if (!mounted || isDismissed) return null

  return (
    <div style={{
      background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
      borderBottom: '1px solid #86efac',
      padding: '10px 24px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    }}>
      <CheckCircle size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#15803d' }}>
          🎉 Your creator account is approved!
        </span>
        <span style={{ fontSize: '13px', color: '#166534', marginLeft: '8px' }}>
          Start by completing your store profile.
        </span>
      </div>
      <Link
        href="/dashboard"
        style={{
          display: 'flex', alignItems: 'center', gap: '4px',
          fontSize: '13px', fontWeight: 600, color: '#16a34a',
          whiteSpace: 'nowrap', textDecoration: 'none',
          background: 'white', padding: '6px 12px',
          borderRadius: '20px', border: '1px solid #86efac',
          flexShrink: 0,
        }}
      >
        Go to Dashboard <ArrowRight size={13} />
      </Link>
      <button
        suppressHydrationWarning
        onClick={handleDismiss}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#16a34a', padding: '4px',
          display: 'flex', alignItems: 'center', flexShrink: 0,
        }}
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>
    </div>
  )
}
