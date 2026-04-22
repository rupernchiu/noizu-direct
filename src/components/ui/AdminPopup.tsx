'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { safeExternalHref, safeInternalHref } from '@/lib/safe-url'

export interface AdminPopupData {
  id: string
  title: string
  description: string | null
  imageUrl: string | null
  ctaText: string
  ctaLink: string
}

const LS_KEY = 'nd_admin_popup_seen'
const TTL_MS = 24 * 60 * 60 * 1000

export function AdminPopup({ popup }: { popup: AdminPopupData }) {
  const pathname = usePathname()

  // Badge visibility is independent of popup open state — never hidden after mount
  const [isPopupOpen, setIsPopupOpen] = useState(false)

  const hasSeenToday = useCallback(() => {
    try {
      const ts = localStorage.getItem(LS_KEY)
      return !!ts && Date.now() - parseInt(ts, 10) < TTL_MS
    } catch { return false }
  }, [])

  const markSeen = useCallback(() => {
    try { localStorage.setItem(LS_KEY, String(Date.now())) } catch {}
  }, [])

  // closePopup ONLY closes the modal — badge visibility is never touched
  const closePopup = useCallback(() => { setIsPopupOpen(false); markSeen() }, [markSeen])

  useEffect(() => {
    // Auto-fire respects localStorage, but badge is rendered unconditionally above
    if (hasSeenToday()) return

    const fire = () => { if (!hasSeenToday()) setIsPopupOpen(true) }

    const timer = setTimeout(fire, 8000)

    const handleScroll = () => {
      const total = document.body.scrollHeight - window.innerHeight
      if (total > 0 && window.scrollY / total >= 0.4 && !hasSeenToday()) {
        setIsPopupOpen(true)
        window.removeEventListener('scroll', handleScroll)
        clearTimeout(timer)
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      clearTimeout(timer)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [hasSeenToday])

  // Only render on homepage — prevents badge/modal from appearing during client-side navigation
  if (pathname !== '/') return null

  return (
    <>
      {/* ── Keyframes ──────────────────────────────────────────────────────── */}
      <style>{`
        @keyframes nd-fadein  { from { opacity: 0 }                          to { opacity: 1 } }
        @keyframes nd-slideup { from { transform: translateY(20px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        @keyframes nd-bounce  { 0%,100% { transform: translateY(0) }  50%   { transform: translateY(-4px) } }
        @keyframes nd-pulse   { 0%,100% { transform: scale(1); opacity: 1 }  50% { transform: scale(1.5); opacity: 0 } }
      `}</style>

      {/* ── Modal ─────────────────────────────────────────────────────────── */}
      {isPopupOpen && (
        <div
          onClick={closePopup}
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '16px',
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            animation: 'nd-fadein 0.3s ease',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '520px',
              borderRadius: '20px',
              overflow: 'hidden',
              boxShadow: '0 25px 60px rgba(0,0,0,0.45)',
              animation: 'nd-slideup 0.3s ease',
            }}
          >
            {/* ── TOP SECTION — image / gradient with overlaid title ─────── */}
            <div style={{ position: 'relative', height: '260px', overflow: 'hidden' }}>
              {popup.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={popup.imageUrl}
                  alt={popup.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <div style={{
                  width: '100%', height: '100%',
                  background: 'linear-gradient(135deg, #7c3aed 0%, #00d4aa 100%)',
                }} />
              )}

              {/* Gradient scrim for text legibility */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.05) 55%)',
              }} />

              {/* Title overlaid at bottom of image */}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                padding: '20px 24px',
                textAlign: 'center',
              }}>
                <h2 style={{
                  margin: 0,
                  color: '#fff',
                  fontSize: '26px',
                  fontWeight: 800,
                  lineHeight: 1.2,
                  textShadow: '0 2px 8px rgba(0,0,0,0.5)',
                }}>
                  {popup.title}
                </h2>
              </div>

              {/* Close button */}
              <button
                suppressHydrationWarning
                onClick={closePopup}
                aria-label="Close"
                style={{
                  position: 'absolute', top: '12px', right: '12px',
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', transition: 'background 0.2s',
                  flexShrink: 0,
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.4)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.2)' }}
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* ── BOTTOM SECTION — description + CTA ────────────────────── */}
            <div style={{
              background: 'var(--card)',
              padding: '20px 24px 24px',
            }}>
              {popup.description && (
                <p style={{
                  margin: '0 0 16px',
                  color: 'var(--muted-foreground)',
                  fontSize: '14px',
                  lineHeight: 1.6,
                }}>
                  {popup.description}
                </p>
              )}
              {/* H17 — admin-controlled CTA; reject `javascript:` / `data:`
                  / protocol-relative. Fall back to homepage if invalid. */}
              <Link
                href={safeInternalHref(popup.ctaLink) ?? safeExternalHref(popup.ctaLink) ?? '/'}
                onClick={closePopup}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'center',
                  background: '#7c3aed',
                  color: '#fff',
                  borderRadius: '50px',
                  height: '48px',
                  lineHeight: '48px',
                  fontWeight: 700,
                  fontSize: '15px',
                  textDecoration: 'none',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                  boxShadow: '0 4px 15px rgba(124,58,237,0.3)',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLAnchorElement
                  el.style.transform = 'scale(1.02)'
                  el.style.boxShadow = '0 6px 22px rgba(124,58,237,0.5)'
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLAnchorElement
                  el.style.transform = 'scale(1)'
                  el.style.boxShadow = '0 4px 15px rgba(124,58,237,0.3)'
                }}
              >
                {popup.ctaText}
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Floating badge — always visible while popup is active ─────────── */}
      <button
          suppressHydrationWarning
          onClick={() => setIsPopupOpen(true)}
          aria-label="Open promotion"
          style={{
            position: 'fixed',
            bottom: '80px',
            left: '24px',
            zIndex: 40,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
            padding: '10px 16px',
            borderRadius: '50px',
            boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
            border: 'none',
            cursor: 'pointer',
            maxWidth: '220px',
            animation: 'nd-bounce 2s ease-in-out infinite',
          }}
        >
          {/* Pulse dot */}
          <span style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: '#fff', flexShrink: 0,
            animation: 'nd-pulse 1.5s ease-in-out infinite',
          }} />

          {/* Labels */}
          <span style={{ flex: 1, overflow: 'hidden', textAlign: 'left' }}>
            <span style={{
              display: 'block',
              fontSize: '9px', fontWeight: 600,
              color: 'rgba(255,255,255,0.7)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              lineHeight: 1,
              marginBottom: '2px',
            }}>
              LIVE OFFER
            </span>
            <span style={{
              display: 'block',
              fontSize: '13px', fontWeight: 700,
              color: '#fff',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '148px',
              lineHeight: 1.2,
            }}>
              {popup.title.slice(0, 35)}
            </span>
          </span>

          {/* Arrow */}
          <span style={{ color: '#fff', fontSize: '14px', flexShrink: 0 }}>→</span>
        </button>
    </>
  )
}
