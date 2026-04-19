'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutGrid, Users, BookOpen, Star, Tag, Home,
  type LucideIcon,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MobileNavItem {
  id: string
  label: string
  href: string
  dropdownType: string
  dropdownContent: string
}

interface SimpleItem { label: string; url: string }
interface SimpleGroup { heading?: string; items: SimpleItem[] }
interface SimpleListContent { groups?: SimpleGroup[]; items?: SimpleItem[] }

interface MegaMenuItem { label: string; url: string; icon?: string }
interface MegaMenuColumn { heading: string; items: MegaMenuItem[] }
interface MegaMenuFeatured { image?: string; headline: string; subtext: string; ctaText: string; ctaUrl: string }
interface MegaMenuContent { columns: MegaMenuColumn[]; featured?: MegaMenuFeatured; bottomBarText?: string; bottomBarUrl?: string }

interface FeatureCardStat { value: string; label: string }
interface FeatureCardLink { label: string; url: string }
interface FeatureCardContent {
  image?: string; heading: string; description: string
  stats?: FeatureCardStat[]; ctaText: string; ctaUrl: string
  items?: FeatureCardLink[]
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PURPLE = '#7c3aed'
const P_BG = 'rgba(124,58,237,0.07)'

function parseSafe<T>(s: string, fallback: T): T {
  try { return JSON.parse(s) as T } catch { return fallback }
}

function iconForLabel(label: string): LucideIcon {
  const l = label.toLowerCase()
  if (l.includes('home')) return Home
  if (l.includes('categor') || l.includes('all')) return LayoutGrid
  if (l.includes('creator')) return Users
  if (l.includes('blog') || l.includes('article')) return BookOpen
  if (l.includes('wcs') || l.includes('cosplay') || l.includes('contest')) return Star
  return Tag
}

// ── Bottom sheet ──────────────────────────────────────────────────────────────

function BottomSheet({ item, onClose }: { item: MobileNavItem; onClose: () => void }) {
  const sheetRef = useRef<HTMLDivElement>(null)

  // Close on outside tap
  useEffect(() => {
    function onDown(e: MouseEvent | TouchEvent) {
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
    }
  }, [onClose])

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'flex-end',
      }}
    >
      <div
        ref={sheetRef}
        style={{
          width: '100%',
          background: 'var(--card)',
          borderRadius: '16px 16px 0 0',
          maxHeight: '80vh',
          overflowY: 'auto',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 72px)',
        }}
      >
        {/* Handle + title */}
        <div style={{ padding: '12px 20px 0', textAlign: 'center' }}>
          <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'var(--border)', margin: '0 auto 14px' }} />
          <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--foreground)', textAlign: 'left' }}>
            {item.label}
          </p>
        </div>

        <div style={{ padding: '12px 0 0' }} onClick={onClose}>
          {item.dropdownType === 'SIMPLE_LIST' && (
            <SimpleListSheet content={parseSafe<SimpleListContent>(item.dropdownContent, {})} />
          )}
          {item.dropdownType === 'MEGA_MENU' && (
            <MegaMenuSheet content={parseSafe<MegaMenuContent>(item.dropdownContent, { columns: [] })} />
          )}
          {item.dropdownType === 'FEATURE_CARD' && (
            <FeatureCardSheet content={parseSafe<FeatureCardContent>(item.dropdownContent, { heading: '', description: '', ctaText: '', ctaUrl: '' })} />
          )}
        </div>
      </div>
    </div>
  )
}

// ── Sheet: SIMPLE_LIST ────────────────────────────────────────────────────────

function SimpleListSheet({ content }: { content: SimpleListContent }) {
  const groups: SimpleGroup[] = content.groups?.length
    ? content.groups
    : [{ items: content.items ?? [] }]

  return (
    <div>
      {groups.map((group, gi) => (
        <div key={gi} style={{ marginBottom: gi < groups.length - 1 ? '8px' : 0 }}>
          {group.heading && (
            <p style={{
              margin: 0, padding: '4px 20px 6px',
              fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: 'var(--muted-foreground)',
            }}>
              {group.heading}
            </p>
          )}
          {group.items.map((item, ii) => (
            <Link
              key={ii} href={item.url}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0 20px', height: '48px',
                fontSize: '14px', color: 'var(--foreground)',
                textDecoration: 'none',
                borderBottom: '1px solid var(--border)',
              }}
            >
              {item.label}
              <span style={{ color: PURPLE, fontSize: '13px' }}>→</span>
            </Link>
          ))}
        </div>
      ))}
    </div>
  )
}

// ── Sheet: MEGA_MENU ──────────────────────────────────────────────────────────

function MegaMenuSheet({ content }: { content: MegaMenuContent }) {
  const { columns = [], featured, bottomBarText, bottomBarUrl } = content

  return (
    <div>
      {/* Featured banner with image */}
      {featured && (
        <Link
          href={featured.ctaUrl}
          style={{ display: 'block', margin: '0 20px 16px', borderRadius: '12px', overflow: 'hidden', textDecoration: 'none', position: 'relative', height: '120px' }}
        >
          {featured.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={featured.image} alt={featured.headline} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #7c3aed 0%, #00d4aa 100%)' }} />
          )}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0) 55%)' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px' }}>
            <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{featured.headline}</p>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>{featured.subtext}</p>
          </div>
        </Link>
      )}
      {columns.map((col, ci) => (
        <div key={ci} style={{ marginBottom: '4px' }}>
          <p style={{
            margin: 0, padding: '8px 20px 4px',
            fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: PURPLE,
          }}>
            {col.heading}
          </p>
          {col.items.map((item, ii) => (
            <Link
              key={ii} href={item.url}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0 20px', height: '44px',
                fontSize: '14px', color: 'var(--foreground)',
                textDecoration: 'none',
                borderBottom: '1px solid var(--border)',
              }}
            >
              {item.icon ? `${item.icon} ${item.label}` : item.label}
              <span style={{ color: PURPLE, fontSize: '13px' }}>→</span>
            </Link>
          ))}
        </div>
      ))}
      {bottomBarUrl && (
        <Link
          href={bottomBarUrl}
          style={{
            display: 'block', padding: '14px 20px',
            fontSize: '13px', fontWeight: 600, color: PURPLE,
            textDecoration: 'none',
          }}
        >
          {bottomBarText ?? 'View all →'}
        </Link>
      )}
    </div>
  )
}

// ── Sheet: FEATURE_CARD ───────────────────────────────────────────────────────

function FeatureCardSheet({ content }: { content: FeatureCardContent }) {
  return (
    <div>
      {/* Hero image */}
      {(content.image || content.heading) && (
        <div style={{ position: 'relative', height: '140px', marginBottom: '4px' }}>
          {content.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={content.image} alt={content.heading} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #7c3aed, #00d4aa)' }} />
          )}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.1) 55%)' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px' }}>
            <p style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{content.heading}</p>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>{content.description}</p>
          </div>
        </div>
      )}
      {/* Stats row */}
      {content.stats && content.stats.length > 0 && (
        <div style={{
          display: 'flex', borderBottom: '1px solid var(--border)',
          background: P_BG, padding: '12px 20px', gap: '8px',
        }}>
          {content.stats.map((stat, i) => (
            <div key={i} style={{
              flex: 1, textAlign: 'center',
              borderLeft: i > 0 ? '1px solid var(--border)' : 'none',
              paddingLeft: i > 0 ? '8px' : 0,
            }}>
              <p style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: PURPLE }}>{stat.value}</p>
              <p style={{ margin: 0, fontSize: '11px', color: 'var(--muted-foreground)' }}>{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* CTA */}
      <div style={{ padding: '0 20px 16px' }}>
        <Link
          href={content.ctaUrl}
          style={{
            display: 'block', textAlign: 'center',
            background: PURPLE, color: '#fff',
            borderRadius: '10px', height: '44px', lineHeight: '44px',
            fontSize: '14px', fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          {content.ctaText}
        </Link>
      </div>

      {/* Quick links */}
      {content.items?.map((item, i) => (
        <Link
          key={i} href={item.url}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 20px', height: '48px',
            fontSize: '14px', color: 'var(--foreground)',
            textDecoration: 'none',
            borderTop: '1px solid var(--border)',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: PURPLE, flexShrink: 0 }} />
            {item.label}
          </span>
          <span style={{ color: PURPLE, fontSize: '13px' }}>→</span>
        </Link>
      ))}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function MobileBottomNav({ items }: { items: MobileNavItem[] }) {
  const pathname = usePathname()
  const [openId, setOpenId] = useState<string | null>(null)
  const openItem = openId ? items.find(i => i.id === openId) ?? null : null

  function isActive(href: string) {
    return href === '/' ? pathname === '/' : pathname.startsWith(href)
  }

  // Close sheet on route change
  useEffect(() => { setOpenId(null) }, [pathname])

  return (
    <>
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex h-16">
          {items.map((item) => {
            const Icon = iconForLabel(item.label)
            const active = isActive(item.href) || openId === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setOpenId(openId === item.id ? null : item.id)}
                className="flex flex-col items-center justify-center gap-1 flex-1 min-h-[44px] transition-colors border-none bg-transparent cursor-pointer"
                style={{ color: active ? PURPLE : 'var(--muted-foreground)' }}
              >
                <Icon size={20} aria-hidden="true" />
                <span className="text-[11px] font-medium leading-none">{item.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {openItem && (
        <BottomSheet item={openItem} onClose={() => setOpenId(null)} />
      )}
    </>
  )
}
