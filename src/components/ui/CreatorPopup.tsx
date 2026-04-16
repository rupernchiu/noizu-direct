'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

export interface CreatorPopupData {
  username: string
  displayName: string
  avatar: string | null
  popupTitle: string
  popupDescription: string | null
  popupImageUrl: string | null
  popupCtaText: string
  popupCtaLink: string
  popupBadgeText: string | null
}

const LS_VISITED  = 'nd_creators_visited'
const LS_COUNT    = 'nd_creator_visit_count'
const LS_DATE     = 'nd_creator_visit_date'
const TTL_MS      = 24 * 60 * 60 * 1000
const TRIGGER_MOD = 8
const DELAY_MS    = 10_000

function readVisitState(): { visited: string[]; count: number } {
  try {
    const dateRaw = localStorage.getItem(LS_DATE)
    if (dateRaw && Date.now() - parseInt(dateRaw, 10) > TTL_MS) {
      localStorage.removeItem(LS_VISITED)
      localStorage.removeItem(LS_COUNT)
      localStorage.setItem(LS_DATE, String(Date.now()))
      return { visited: [], count: 0 }
    }
    const visited = JSON.parse(localStorage.getItem(LS_VISITED) ?? '[]') as string[]
    const count   = parseInt(localStorage.getItem(LS_COUNT) ?? '0', 10)
    return { visited, count }
  } catch { return { visited: [], count: 0 } }
}

export function CreatorPopup({
  username, displayName, avatar,
  popupTitle, popupDescription, popupImageUrl,
  popupCtaText, popupCtaLink, popupBadgeText,
}: CreatorPopupData) {
  const pathname = usePathname()

  // Badge is rendered unconditionally — only the modal open state changes on dismiss
  const [isPopupOpen, setIsPopupOpen] = useState(false)
  const seenKey = `nd_creator_popup_${username}_seen`

  const hasSeenToday = useCallback(() => {
    try {
      const ts = localStorage.getItem(seenKey)
      return !!ts && Date.now() - parseInt(ts, 10) < TTL_MS
    } catch { return false }
  }, [seenKey])

  const markSeen  = useCallback(() => {
    try { localStorage.setItem(seenKey, String(Date.now())) } catch {}
  }, [seenKey])

  // closePopup ONLY closes the modal — never touches badge visibility
  const closePopup = useCallback(() => { setIsPopupOpen(false); markSeen() }, [markSeen])

  useEffect(() => {
    try {
      if (!localStorage.getItem(LS_DATE)) localStorage.setItem(LS_DATE, String(Date.now()))
    } catch {}

    let shouldTrigger = false
    try {
      const { visited, count } = readVisitState()
      let newCount = count
      if (!visited.includes(username)) {
        localStorage.setItem(LS_VISITED, JSON.stringify([...visited, username]))
        newCount = count + 1
        localStorage.setItem(LS_COUNT, String(newCount))
      }
      if (newCount > 0 && newCount % TRIGGER_MOD === 0 && !hasSeenToday()) {
        shouldTrigger = true  // auto-fire only — badge is always visible regardless
      }
    } catch {}

    if (!shouldTrigger) return

    const timer = setTimeout(() => {
      if (!hasSeenToday()) setIsPopupOpen(true)
    }, DELAY_MS)

    return () => clearTimeout(timer)
  }, [username, hasSeenToday])

  // Only render on creator pages — prevents badge/modal from appearing during client-side navigation
  if (!pathname.startsWith('/creator/')) return null

  const initials = displayName.slice(0, 2).toUpperCase()
  const badgeLabel = popupBadgeText ?? popupTitle

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
            {/* ── TOP SECTION — image / gradient with creator info ──────── */}
            <div style={{ position: 'relative', height: '260px', overflow: 'hidden' }}>
              {popupImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={popupImageUrl}
                  alt={popupTitle}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <div style={{
                  width: '100%', height: '100%',
                  background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
                }} />
              )}

              {/* Gradient scrim */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.05) 55%)',
              }} />

              {/* Creator avatar + name + title */}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                padding: '20px 24px',
              }}>
                {/* Creator row */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  marginBottom: '10px',
                }}>
                  {avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatar}
                      alt={displayName}
                      style={{
                        width: '36px', height: '36px', borderRadius: '50%',
                        objectFit: 'cover', border: '2px solid rgba(255,255,255,0.6)',
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '50%',
                      background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
                      border: '2px solid rgba(255,255,255,0.6)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '13px', fontWeight: 700, color: '#fff', flexShrink: 0,
                    }}>
                      {initials}
                    </div>
                  )}
                  <span style={{
                    color: 'rgba(255,255,255,0.9)',
                    fontSize: '13px', fontWeight: 600,
                    textShadow: '0 1px 4px rgba(0,0,0,0.4)',
                  }}>
                    {displayName}
                  </span>
                </div>

                <h2 style={{
                  margin: 0,
                  color: '#fff',
                  fontSize: '22px',
                  fontWeight: 800,
                  lineHeight: 1.25,
                  textShadow: '0 2px 8px rgba(0,0,0,0.5)',
                }}>
                  {popupTitle}
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
              {popupDescription && (
                <p style={{
                  margin: '0 0 16px',
                  color: 'var(--muted-foreground)',
                  fontSize: '14px',
                  lineHeight: 1.6,
                }}>
                  {popupDescription}
                </p>
              )}
              <Link
                href={popupCtaLink}
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
                {popupCtaText}
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Floating badge — always visible ───────────────────────────────── */}
      <button
        suppressHydrationWarning
        onClick={() => setIsPopupOpen(true)}
        aria-label="Open creator offer"
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
            marginBottom: '1px',
          }}>
            🎨 {displayName}
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
            {badgeLabel.slice(0, 35)}
          </span>
        </span>

        {/* Arrow */}
        <span style={{ color: '#fff', fontSize: '14px', flexShrink: 0 }}>→</span>
      </button>
    </>
  )
}
