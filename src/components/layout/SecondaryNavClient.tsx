'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface NavItemData {
  id: string
  label: string
  url: string
  position: string
  dropdownType: string
  dropdownContent: string
  openInNewTab: boolean
}

interface SimpleItem { label: string; url: string; icon?: string }
interface SimpleGroup { heading?: string; items: SimpleItem[] }
interface SimpleListContent { groups?: SimpleGroup[]; items?: SimpleItem[] }

interface MegaMenuItem { label: string; url: string; icon?: string }
interface MegaMenuColumn { heading: string; items: MegaMenuItem[] }
interface MegaMenuFeatured { image?: string; headline: string; subtext: string; ctaText: string; ctaUrl: string }
interface MegaMenuContent {
  columns: MegaMenuColumn[]
  featured?: MegaMenuFeatured
  bottomBarText?: string
  bottomBarUrl?: string
}

interface FeatureCardStat { value: string; label: string }
interface FeatureCardItem { label: string; url: string }
interface FeatureCardContent {
  image?: string
  heading: string
  description: string
  stats?: FeatureCardStat[]
  ctaText: string
  ctaUrl: string
  items?: FeatureCardItem[]
}

// ── Constants ─────────────────────────────────────────────────────────────────

const P = '#7c3aed'
const P_BG = 'rgba(124,58,237,0.06)'
const P_BG_MD = 'rgba(124,58,237,0.09)'

function parseSafe<T>(s: string, fallback: T): T {
  try { return JSON.parse(s) as T } catch { return fallback }
}

// ── Keyframes (injected once) ─────────────────────────────────────────────────

const KF = `
  @keyframes nd-drop { from{opacity:0;transform:translateY(-5px)} to{opacity:1;transform:translateY(0)} }
  @keyframes nd-mega { from{opacity:0;transform:scaleY(.97)} to{opacity:1;transform:scaleY(1)} }
  @keyframes nd-pulse-p { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.9);opacity:0} }
`

// ── Root component ─────────────────────────────────────────────────────────────

export function SecondaryNavClient({ items }: { items: NavItemData[] }) {
  const [openId, setOpenId] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleClose = useCallback(() => {
    timer.current = setTimeout(() => setOpenId(null), 180)
  }, [])
  const cancelClose = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  useEffect(() => {
    const onOut = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpenId(null)
    }
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpenId(null) }
    document.addEventListener('mousedown', onOut)
    window.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onOut)
      window.removeEventListener('keydown', onEsc)
    }
  }, [])

  const leftItems = items.filter(i => i.position !== 'RIGHT')
  const rightItems = items.filter(i => i.position === 'RIGHT')
  const openItem = openId ? items.find(i => i.id === openId) : null

  return (
    <>
      <style>{KF}</style>
      <div
        ref={containerRef}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', height: '100%', position: 'relative',
        }}
      >
        {/* Left items */}
        <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          {leftItems.map(item => (
            <NavTrigger
              key={item.id} item={item}
              isOpen={openId === item.id}
              onOpen={() => { cancelClose(); setOpenId(item.id) }}
              onCancelClose={cancelClose}
              onScheduleClose={scheduleClose}
            />
          ))}
        </div>

        {/* Right items */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '100%' }}>
          {rightItems.map(item => (
            <NavTrigger
              key={item.id} item={item}
              isOpen={openId === item.id}
              onOpen={() => { cancelClose(); setOpenId(item.id) }}
              onCancelClose={cancelClose}
              onScheduleClose={scheduleClose}
            />
          ))}
        </div>

        {/* MEGA_MENU — full container width, rendered at root level */}
        {openItem?.dropdownType === 'MEGA_MENU' && (
          <div
            style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
              transformOrigin: 'top center',
              animation: 'nd-mega .2s ease',
            }}
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
          >
            <MegaMenuDropdown
              content={parseSafe<MegaMenuContent>(openItem.dropdownContent, { columns: [] })}
            />
          </div>
        )}
      </div>
    </>
  )
}

// ── Nav trigger (button or pill) ───────────────────────────────────────────────

function NavTrigger({
  item, isOpen, onOpen, onCancelClose, onScheduleClose,
}: {
  item: NavItemData
  isOpen: boolean
  onOpen: () => void
  onCancelClose: () => void
  onScheduleClose: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const isMega = item.dropdownType === 'MEGA_MENU'
  const hasDropdown = item.dropdownType !== 'NONE'
  const isWCS = item.label === 'WCS Malaysia'
  const isSell = item.label === 'Start Selling'

  const { data: session } = useSession()
  const user = session?.user as { role?: string } | undefined

  const content = parseSafe<unknown>(item.dropdownContent, {})

  // Start Selling → pill button
  if (isSell) {
    let startSellingHref = item.url // default from DB
    if (session) {
      const role = (session.user as any)?.role
      if (role === 'CREATOR') startSellingHref = '/dashboard'
      else if (role === 'ADMIN') startSellingHref = '/admin'
      else startSellingHref = '/start-selling'
    }

    return (
      <div style={{ display: 'flex', alignItems: 'center', paddingLeft: '8px' }}>
        <Link
          href={startSellingHref}
          style={{
            display: 'flex', alignItems: 'center',
            fontSize: '13px', fontWeight: 600,
            color: hovered ? '#fff' : P,
            border: `1.5px solid ${P}`,
            borderRadius: '20px',
            padding: '4px 14px',
            height: '28px',
            background: hovered ? P : 'transparent',
            textDecoration: 'none',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          Start Selling
        </Link>
      </div>
    )
  }

  const highlighted = isOpen || hovered || isWCS
  const btnStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '4px',
    fontSize: '13px', fontWeight: 500,
    color: highlighted ? P : 'var(--muted-foreground)',
    background: isOpen ? P_BG_MD : (isWCS || hovered) ? P_BG : 'transparent',
    borderRadius: '6px',
    padding: '0 14px',
    height: '100%',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap',
    textDecoration: 'none',
  }

  const chevron = hasDropdown && (
    <svg
      width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, transition: 'transform 0.15s ease', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )

  const inner = (
    <>
      {isWCS && (
        <span style={{
          display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%',
          background: P, marginRight: '4px', flexShrink: 0,
          animation: 'nd-pulse-p 1.5s ease-in-out infinite',
        }} />
      )}
      {item.label}
      {chevron}
    </>
  )

  // Mega items: no dropdown here (rendered at root level)
  if (isMega || !hasDropdown) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
        <button
          type="button"
          suppressHydrationWarning
          style={btnStyle}
          onMouseEnter={() => { setHovered(true); onOpen() }}
          onMouseLeave={() => setHovered(false)}
        >
          {inner}
        </button>
      </div>
    )
  }

  // SIMPLE_LIST / FEATURE_CARD — dropdown anchored to this trigger
  return (
    <div
      style={{ position: 'relative', display: 'flex', alignItems: 'center', height: '100%' }}
      onMouseEnter={() => { setHovered(true); onCancelClose(); onOpen() }}
      onMouseLeave={() => { setHovered(false); onScheduleClose() }}
    >
      <button type="button" suppressHydrationWarning style={btnStyle}>
        {inner}
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute', top: '100%', left: 0, zIndex: 50,
            animation: 'nd-drop .15s ease',
          }}
          onMouseEnter={onCancelClose}
          onMouseLeave={onScheduleClose}
        >
          {item.dropdownType === 'SIMPLE_LIST' && (
            <SimpleListDropdown content={content as SimpleListContent} />
          )}
          {item.dropdownType === 'FEATURE_CARD' && (
            <FeatureCardDropdown content={content as FeatureCardContent} />
          )}
        </div>
      )}
    </div>
  )
}

// ── SIMPLE_LIST dropdown ───────────────────────────────────────────────────────

function SimpleListDropdown({ content }: { content: SimpleListContent }) {
  // Support both {groups:[...]} and legacy {items:[...]}
  const groups: SimpleGroup[] = content.groups?.length
    ? content.groups
    : [{ items: content.items ?? [] }]

  return (
    <div style={{
      minWidth: '220px',
      background: 'var(--card)',
      borderRadius: '12px',
      border: '1px solid var(--border)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
      padding: '8px 0',
      overflow: 'hidden',
    }}>
      {groups.map((group, gi) => (
        <div key={gi}>
          {gi > 0 && <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />}
          {group.heading && (
            <p style={{
              fontSize: '11px', fontWeight: 600,
              color: 'var(--muted-foreground)',
              textTransform: 'uppercase', letterSpacing: '0.08em',
              padding: '10px 16px 4px',
              margin: 0,
            }}>
              {group.heading}
            </p>
          )}
          {group.items.map((item, ii) => (
            <SimpleListItem key={ii} label={item.label} url={item.url} />
          ))}
        </div>
      ))}
    </div>
  )
}

function SimpleListItem({ label, url }: { label: string; url: string }) {
  const [hovered, setHovered] = useState(false)
  return (
    <Link
      href={url}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: '40px', padding: '0 16px',
        fontSize: '13px',
        color: hovered ? P : 'var(--foreground)',
        background: hovered ? P_BG : 'transparent',
        textDecoration: 'none',
        transition: 'all 0.12s ease',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span>{label}</span>
      <span style={{
        opacity: hovered ? 1 : 0,
        transition: 'opacity 0.12s',
        color: P, fontSize: '12px', marginLeft: '8px',
      }}>
        →
      </span>
    </Link>
  )
}

// ── MEGA_MENU dropdown ─────────────────────────────────────────────────────────

function MegaMenuDropdown({ content }: { content: MegaMenuContent }) {
  const { columns = [], featured, bottomBarText, bottomBarUrl } = content

  return (
    <div style={{
      maxWidth: '900px',
      background: 'var(--card)',
      borderRadius: '0 0 12px 12px',
      border: '1px solid var(--border)',
      borderTop: 'none',
      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
      overflow: 'hidden',
    }}>
      {/* Main body: columns + featured */}
      <div style={{ display: 'flex', padding: '24px', gap: '24px' }}>
        {/* Left: columns (70%) */}
        <div style={{ flex: '0 0 70%', display: 'grid', gridTemplateColumns: `repeat(${Math.min(3, columns.length)}, 1fr)`, gap: '0 8px' }}>
          {columns.map((col, ci) => (
            <div key={ci}>
              <p style={{
                fontSize: '12px', fontWeight: 700,
                color: P, textTransform: 'uppercase', letterSpacing: '0.05em',
                borderBottom: `2px solid ${P}`,
                paddingBottom: '8px', marginBottom: '10px', margin: '0 0 10px',
              }}>
                {col.heading}
              </p>
              {col.items.map((item, ii) => (
                <MegaMenuItem key={ii} label={item.label} url={item.url} icon={item.icon} />
              ))}
            </div>
          ))}
        </div>

        {/* Right: featured banner (30%) */}
        {featured && (
          <div style={{ flex: '0 0 calc(30% - 24px)', minWidth: '180px' }}>
            <FeaturedBanner featured={featured} />
          </div>
        )}
      </div>

      {/* Bottom bar */}
      {(bottomBarText || bottomBarUrl) && (
        <div style={{
          borderTop: '1px solid var(--border)',
          background: 'var(--surface)',
          padding: '10px 24px',
          display: 'flex', justifyContent: 'flex-end',
        }}>
          <Link
            href={bottomBarUrl ?? '#'}
            style={{
              fontSize: '13px', fontWeight: 500, color: P,
              textDecoration: 'none',
              transition: 'opacity 0.1s',
            }}
          >
            {bottomBarText ?? 'View all →'}
          </Link>
        </div>
      )}
    </div>
  )
}

function MegaMenuItem({ label, url, icon }: { label: string; url: string; icon?: string }) {
  const [hovered, setHovered] = useState(false)
  return (
    <Link
      href={url}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: '34px', padding: '0 8px',
        fontSize: '13px',
        color: hovered ? P : 'var(--foreground)',
        background: hovered ? P_BG : 'transparent',
        borderRadius: '6px',
        textDecoration: 'none',
        transition: 'all 0.12s ease',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span>{icon ? `${icon} ${label}` : label}</span>
      <span style={{ opacity: hovered ? 1 : 0, transition: 'opacity 0.12s', color: P, fontSize: '11px' }}>→</span>
    </Link>
  )
}

function FeaturedBanner({ featured }: { featured: MegaMenuFeatured }) {
  const [btnHovered, setBtnHovered] = useState(false)
  return (
    <div style={{
      borderRadius: '12px', overflow: 'hidden',
      border: '1px solid var(--border)',
      height: '100%', display: 'flex', flexDirection: 'column',
    }}>
      {/* Image / gradient */}
      <div style={{ position: 'relative', height: '120px', flexShrink: 0 }}>
        {featured.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={featured.image} alt={featured.headline}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            background: 'linear-gradient(135deg, #7c3aed 0%, #00d4aa 100%)',
          }} />
        )}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 55%)',
        }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px' }}>
          <p style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>
            {featured.headline}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.8)', lineHeight: 1.4 }}>
            {featured.subtext}
          </p>
        </div>
      </div>
      {/* CTA */}
      <div style={{ padding: '12px', background: 'var(--card)', flex: 1, display: 'flex', alignItems: 'center' }}>
        <Link
          href={featured.ctaUrl}
          style={{
            display: 'block', width: '100%', textAlign: 'center',
            background: btnHovered ? P : '#fff',
            color: btnHovered ? '#fff' : P,
            border: `1.5px solid ${P}`,
            borderRadius: '20px',
            height: '34px', lineHeight: '31px',
            fontSize: '13px', fontWeight: 600,
            textDecoration: 'none',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={() => setBtnHovered(true)}
          onMouseLeave={() => setBtnHovered(false)}
        >
          {featured.ctaText}
        </Link>
      </div>
    </div>
  )
}

// ── FEATURE_CARD dropdown ──────────────────────────────────────────────────────

function FeatureCardDropdown({ content }: { content: FeatureCardContent }) {
  const [btnHovered, setBtnHovered] = useState(false)

  return (
    <div style={{
      width: '380px',
      background: 'var(--card)',
      borderRadius: '12px',
      border: '1px solid var(--border)',
      boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
      overflow: 'hidden',
    }}>
      {/* Image section */}
      <div style={{ position: 'relative', height: '140px' }}>
        {content.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={content.image} alt={content.heading}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #7c3aed, #00d4aa)' }} />
        )}
        {/* Overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.1) 55%)',
        }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px' }}>
          <p style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
            {content.heading}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>
            {content.description}
          </p>
        </div>
      </div>

      {/* Stats row */}
      {content.stats && content.stats.length > 0 && (
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface)',
          padding: '12px 16px',
        }}>
          {content.stats.map((stat, i) => (
            <div key={i} style={{
              flex: 1, textAlign: 'center',
              borderLeft: i > 0 ? '1px solid var(--border)' : 'none',
              padding: i > 0 ? '0 0 0 12px' : '0 12px 0 0',
            }}>
              <p style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: P }}>{stat.value}</p>
              <p style={{ margin: 0, fontSize: '11px', color: 'var(--muted-foreground)' }}>{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* CTA button */}
      <Link
        href={content.ctaUrl}
        style={{
          display: 'block', width: '100%', textAlign: 'center',
          background: btnHovered ? '#6d28d9' : P,
          color: '#fff',
          height: '44px', lineHeight: '44px',
          fontSize: '14px', fontWeight: 600,
          textDecoration: 'none',
          transition: 'background 0.15s ease',
          borderRadius: 0,
        }}
        onMouseEnter={() => setBtnHovered(true)}
        onMouseLeave={() => setBtnHovered(false)}
      >
        {content.ctaText}
      </Link>

      {/* Quick links */}
      {content.items && content.items.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border)' }}>
          {content.items.map((item, i) => (
            <FeatureCardLink key={i} label={item.label} url={item.url} />
          ))}
        </div>
      )}
    </div>
  )
}

function FeatureCardLink({ label, url }: { label: string; url: string }) {
  const [hovered, setHovered] = useState(false)
  return (
    <Link
      href={url}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: '40px', padding: '0 16px',
        fontSize: '13px',
        color: hovered ? P : 'var(--foreground)',
        background: hovered ? P_BG : 'transparent',
        textDecoration: 'none',
        transition: 'all 0.12s ease',
        borderBottom: '1px solid var(--border)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: P, flexShrink: 0 }} />
        {label}
      </div>
      <span style={{ opacity: hovered ? 1 : 0, transition: 'opacity 0.12s', color: P, fontSize: '12px' }}>→</span>
    </Link>
  )
}
