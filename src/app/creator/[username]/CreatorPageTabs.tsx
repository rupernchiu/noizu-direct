'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ProductCard } from '@/components/ui/ProductCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { SupportModal } from '@/components/support/SupportModal'
import { safeExternalHref } from '@/lib/safe-url'
import {
  ShopDiscovery, AboutDiscovery, CommissionDiscovery,
  PortfolioDiscovery, VideosDiscovery, SupportDiscovery, PodDiscovery,
  type DiscoveryProduct, type DiscoveryCreator,
  type DiscoveryVideo, type DiscoveryPortfolioItem,
} from './CreatorDiscovery'

// ── Types ──────────────────────────────────────────────────────────────────────

interface ProductWithCreator {
  id: string
  title: string
  description: string
  price: number
  category: string
  type: string
  images: string
  isPinned: boolean
  isNew?: boolean
  trendingScore?: number
  reviewCount?: number
  averageRating?: number
  creator: {
    username: string
    displayName: string
    avatar: string | null
    isVerified: boolean
    isTopCreator: boolean
  }
}

interface PortfolioItem {
  id: string
  title: string
  description?: string
  category?: string
  imageUrl?: string
  isPublic: boolean
}

interface PricingTier {
  tier: string
  price: number
  description: string
}

interface VideoItem {
  id: string
  title: string
  platform: string
  url: string
  embedId: string
  description: string | null
}

interface SupportTierItem {
  id: string
  name: string
  priceUsd: number
  description: string | null
  perks: string[]
  subscriberCount: number
}

interface SupportGoalItem {
  id: string
  title: string
  description: string | null
  targetAmountUsd: number
  currentAmountUsd: number
  deadline: string | null
  status: string
  coverImage: string | null
}

interface SupportGiftConfig {
  isActive: boolean
  presetAmounts: number[]
  thankYouMessage: string
  giftCount: number
  monthlyGiftCount: number
  monthlyGifterCount: number
}

interface PodProvider {
  id: string
  name: string
  customName: string | null
  storeUrl: string | null
  notes: string | null
  isDefault: boolean
  defaultProductionDays: number
  shippingMY: number
  shippingSG: number
  shippingPH: number
  shippingIntl: number
}

interface GuestbookEntry {
  id: string
  content: string
  rating?: number | null
  createdAt: string
  authorName: string
  authorAvatar: string | null
}

interface CreatorPageTabsProps {
  products: ProductWithCreator[]
  portfolioItems: PortfolioItem[]
  commissionSlots: number | null
  commissionTerms: string | null
  commissionPricing: PricingTier[]
  commissionStatus: string
  commissionDescription: string | null
  creatorUsername: string
  displayName: string
  bio: string | null
  socialLinks: Record<string, string>
  joinDate: string
  videos: VideoItem[]
  supportTiers: SupportTierItem[]
  supportGoals: SupportGoalItem[]
  supportGift: SupportGiftConfig | null
  creatorAvatar: string | null
  userRole: string | null
  creatorUserId: string
  sessionUserId: string | null
  discoveryProducts: DiscoveryProduct[]
  discoveryCreators: DiscoveryCreator[]
  discoveryCommission: DiscoveryCreator[]
  discoveryPortfolio: DiscoveryPortfolioItem[]
  discoveryVideos: DiscoveryVideo[]
  discoverySupport: DiscoveryCreator[]
  discoveryPod: DiscoveryCreator[]
  podProviders: PodProvider[]
  guestbookEntries: GuestbookEntry[]
}

// ── Constants ──────────────────────────────────────────────────────────────────

const COMMISSION_STATUS_STYLES: Record<string, { label: string; className: string; dotClass: string }> = {
  OPEN: {
    label: 'Commissions Open',
    className: 'bg-success/10 text-success border border-success/30',
    dotClass: 'bg-success',
  },
  CLOSED: {
    label: 'Commissions Closed',
    className: 'bg-destructive/10 text-destructive border border-destructive/30',
    dotClass: 'bg-destructive',
  },
  LIMITED: {
    label: 'Limited Slots',
    className: 'bg-warning/10 text-warning border border-warning/30',
    dotClass: 'bg-warning',
  },
}

// ── Social icon SVGs (used only in About tab) ──────────────────────────────────

const SOCIAL_CONFIG: Record<string, { label: string; icon: React.ReactNode }> = {
  instagram: {
    label: 'Instagram',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="size-7">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
  },
  tiktok: {
    label: 'TikTok',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="size-7">
        <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
      </svg>
    ),
  },
  twitter: {
    label: 'X / Twitter',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="size-7">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  facebook: {
    label: 'Facebook',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="size-7">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  youtube: {
    label: 'YouTube',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="size-7">
        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
  pixiv: {
    label: 'Pixiv',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="size-7">
        <path d="M4.935 0A4.924 4.924 0 000 4.935v14.13A4.924 4.924 0 004.935 24H19.07A4.924 4.924 0 0024 19.065V4.935A4.924 4.924 0 0019.065 0zm7.81 4.547c2.181 0 4.058.676 5.399 1.847a6.104 6.104 0 012.116 4.66c0 1.812-.7 3.44-1.983 4.608-1.268 1.154-3.067 1.788-5.245 1.788a8.64 8.64 0 01-1.492-.124v4.864H8.92V4.977a19.2 19.2 0 013.825-.43zm-.108 1.8c-.44 0-.887.04-1.33.11v7.552a6.99 6.99 0 001.254.096c2.87 0 4.514-1.383 4.514-3.944 0-2.49-1.587-3.814-4.438-3.814z" />
      </svg>
    ),
  },
  twitch: {
    label: 'Twitch',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="size-7">
        <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
      </svg>
    ),
  },
  website: {
    label: 'Website',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="size-7">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
      </svg>
    ),
  },
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatJoinDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-MY', { month: 'long', year: 'numeric' })
  } catch {
    return iso
  }
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

// ── Portfolio Lightbox ─────────────────────────────────────────────────────────

function PortfolioLightbox({
  items,
  initialIndex,
  onClose,
}: {
  items: PortfolioItem[]
  initialIndex: number
  onClose: () => void
}) {
  const [idx, setIdx] = useState(initialIndex)
  const [visible, setVisible] = useState(false)
  const current = items[idx]
  const total = items.length

  const close = useCallback(() => {
    setVisible(false)
    setTimeout(onClose, 180)
  }, [onClose])

  const prev = useCallback(() => setIdx((i) => (i - 1 + total) % total), [total])
  const next = useCallback(() => setIdx((i) => (i + 1) % total), [total])

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [close, prev, next])

  if (!current) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
      style={{
        backgroundColor: `rgba(0,0,0,${visible ? 0.92 : 0})`,
        transition: 'background-color 180ms ease',
      }}
      onClick={close}
    >
      <div
        className="relative flex max-h-full w-full max-w-4xl flex-col items-center"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(12px)',
          transition: 'opacity 180ms ease, transform 180ms ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Counter + close */}
        <div className="mb-3 flex w-full items-center justify-between px-1">
          <span className="text-sm font-medium text-white/60">{idx + 1} / {total}</span>
          <button
            onClick={close}
            className="flex size-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Image + nav */}
        <div className="flex w-full items-center justify-center gap-3">
          <button
            onClick={prev}
            disabled={total <= 1}
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors disabled:opacity-30"
            aria-label="Previous"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div className="flex-1 overflow-hidden rounded-xl">
            {current.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={current.id}
                src={current.imageUrl}
                alt={current.title}
                className="mx-auto block max-h-[calc(100vh-200px)] w-auto max-w-full rounded-xl object-contain"
              />
            ) : (
              <div className="mx-auto flex aspect-[3/4] max-h-[calc(100vh-200px)] w-64 items-center justify-center rounded-xl bg-gradient-to-br from-primary/30 to-secondary/30">
                <span className="text-sm text-muted-foreground">No image</span>
              </div>
            )}
          </div>

          <button
            onClick={next}
            disabled={total <= 1}
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors disabled:opacity-30"
            aria-label="Next"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Title + category */}
        <div className="mt-4 flex flex-col items-center gap-1.5 text-center">
          <h3 className="text-base font-semibold text-white">{current.title}</h3>
          {current.category && (
            <span className="rounded-full bg-white/10 px-3 py-0.5 text-xs font-medium text-white/70">
              {current.category}
            </span>
          )}
          {current.description && (
            <p className="mt-1 max-w-md text-sm text-white/50">{current.description}</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Component ──────────────────────────────────────────────────────────────────

export function CreatorPageTabs({
  products,
  portfolioItems,
  commissionSlots,
  commissionTerms,
  commissionPricing,
  commissionStatus,
  commissionDescription,
  creatorUsername,
  displayName,
  bio,
  socialLinks,
  joinDate,
  videos,
  supportTiers,
  supportGoals,
  supportGift,
  creatorAvatar,
  userRole,
  creatorUserId,
  sessionUserId,
  discoveryProducts,
  discoveryCreators,
  discoveryCommission,
  discoveryPortfolio,
  discoveryVideos,
  discoverySupport,
  discoveryPod,
  podProviders,
  guestbookEntries,
}: CreatorPageTabsProps) {
  const podProducts    = products.filter(p => p.type === 'POD')
  const shopProducts   = products.filter(p => p.type !== 'POD')
  const activeGoals    = supportGoals.filter(g => g.status === 'ACTIVE' || g.status === 'COMPLETED')

  const showAbout      = !!(bio?.trim()) || Object.values(socialLinks).some(v => v?.trim())
  const showShop       = shopProducts.length > 0
  const showPod        = podProviders.length > 0 || podProducts.length > 0
  const showCommission = !!(commissionDescription?.trim()) || commissionPricing.length > 0 || commissionSlots != null
  const showPortfolio  = portfolioItems.length > 0
  const showVideos     = videos.length > 0
  const showSupport    = supportTiers.length > 0 || activeGoals.length > 0 || (supportGift?.isActive ?? false)

  type Tab = 'shop' | 'about' | 'portfolio' | 'videos' | 'commission' | 'pod' | 'support'

  const tabs: { id: Tab; label: string }[] = [
    ...(showAbout      ? [{ id: 'about'          as Tab, label: 'About'           }] : []),
    ...(showShop       ? [{ id: 'shop'           as Tab, label: 'Shop'            }] : []),
    ...(showPod        ? [{ id: 'pod'            as Tab, label: 'Print On Demand' }] : []),
    ...(showCommission ? [{ id: 'commission'     as Tab, label: 'Commission'      }] : []),
    ...(showSupport    ? [{ id: 'support'        as Tab, label: 'Support'         }] : []),
    ...(showPortfolio  ? [{ id: 'portfolio'      as Tab, label: 'Portfolio'       }] : []),
    ...(showVideos     ? [{ id: 'videos'         as Tab, label: 'Videos'          }] : []),
  ]

  const [activeTab, setActiveTab]       = useState<Tab>(tabs[0]?.id ?? 'about')
  const [shopSort, setShopSort]         = useState<'default' | 'popular'>('default')
  const [shopPage, setShopPage]         = useState(1)
  const [portfolioPage, setPortfolioPage] = useState(1)
  const [lightboxIdx, setLightboxIdx]   = useState<number | null>(null)
  const [loadedVideos, setLoadedVideos] = useState<Set<string>>(new Set())
  const [giftMode, setGiftMode]         = useState<'onetime' | 'monthly'>('onetime')
  const [giftAmount, setGiftAmount]     = useState<number | null>(null)
  const [giftCustom, setGiftCustom]     = useState('')
  const [giftMsg, setGiftMsg]           = useState('')
  const [giftAnon, setGiftAnon]         = useState(false)

  // Support modal state — one modal, driven by `supportModal`
  type SupportModalState =
    | { kind: 'tier'; tier: SupportTierItem }
    | { kind: 'goal'; goal: SupportGoalItem }
    | { kind: 'gift'; amountCents: number | null; message: string; anonymous: boolean }
    | { kind: 'monthly_gift'; amountCents: number | null }
    | null
  const [supportModal, setSupportModal] = useState<SupportModalState>(null)

  function openGiftModal() {
    if (!sessionUserId) { window.location.href = `/auth/signin?callbackUrl=/creator/${creatorUsername}`; return }
    const amtCents = giftCustom
      ? Math.round(Number(giftCustom) * 100)
      : giftAmount !== null ? giftAmount * 100 : null
    if (giftMode === 'monthly') {
      setSupportModal({ kind: 'monthly_gift', amountCents: amtCents })
    } else {
      setSupportModal({ kind: 'gift', amountCents: amtCents, message: giftMsg, anonymous: giftAnon })
    }
  }

  function openTierModal(tier: SupportTierItem) {
    if (!sessionUserId) { window.location.href = `/auth/signin?callbackUrl=/creator/${creatorUsername}`; return }
    setSupportModal({ kind: 'tier', tier })
  }

  function openGoalModal(goal: SupportGoalItem) {
    if (!sessionUserId) { window.location.href = `/auth/signin?callbackUrl=/creator/${creatorUsername}`; return }
    setSupportModal({ kind: 'goal', goal })
  }

  // Fan Messages state
  const [fanMsgText, setFanMsgText]           = useState('')
  const [fanMsgRating, setFanMsgRating]       = useState(0)
  const [fanMsgHoverRating, setFanMsgHoverRating] = useState(0)
  const [fanMsgSending, setFanMsgSending]     = useState(false)
  const [fanMsgSent, setFanMsgSent]           = useState(false)
  const [fanMsgError, setFanMsgError]         = useState<string | null>(null)

  // Leave a Message state
  const [msgText, setMsgText]     = useState('')
  const [msgSending, setMsgSending] = useState(false)
  const [msgSent, setMsgSent]     = useState(false)
  const [msgError, setMsgError]   = useState<string | null>(null)

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!msgText.trim()) return
    setMsgSending(true)
    setMsgError(null)
    try {
      const res = await fetch(`/api/creator/${creatorUsername}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: msgText.trim() }),
      })
      if (!res.ok) {
        const data = await res.json()
        setMsgError(data.error ?? 'Failed to send message')
      } else {
        setMsgSent(true)
        setMsgText('')
      }
    } catch {
      setMsgError('Failed to send message')
    } finally {
      setMsgSending(false)
    }
  }

  async function handleFanMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!fanMsgText.trim()) return
    setFanMsgSending(true)
    setFanMsgError(null)
    try {
      const res = await fetch(`/api/creator/${creatorUsername}/guestbook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: fanMsgText.trim(), rating: fanMsgRating || undefined }),
      })
      if (!res.ok) {
        const data = await res.json()
        setFanMsgError(data.error ?? 'Failed to post message')
      } else {
        setFanMsgSent(true)
        setFanMsgText('')
      }
    } catch {
      setFanMsgError('Failed to post message')
    } finally {
      setFanMsgSending(false)
    }
  }

  function handleTabClick(id: Tab) {
    setActiveTab(id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  useEffect(() => { setShopPage(1) }, [shopSort])

  const SHOP_PER_PAGE = 24
  const PORTFOLIO_PER_PAGE = 24

  const sortedProducts   = shopSort === 'popular'
    ? [...products].sort((a, b) => (b.trendingScore ?? 0) - (a.trendingScore ?? 0))
    : products
  const pinnedProducts   = products.filter((p) =>  p.isPinned)
  const unpinnedProducts = products.filter((p) => !p.isPinned)

  // Pagination slices — pinned always visible (small count), unpinned paginated in default mode;
  // popular mode paginates the full sorted list.
  const shopTotalPages = shopSort === 'popular'
    ? Math.max(1, Math.ceil(sortedProducts.length / SHOP_PER_PAGE))
    : Math.max(1, Math.ceil(unpinnedProducts.length / SHOP_PER_PAGE))
  const shopPageClamped = Math.min(shopPage, shopTotalPages)
  const pagedSortedProducts = sortedProducts.slice(
    (shopPageClamped - 1) * SHOP_PER_PAGE,
    shopPageClamped * SHOP_PER_PAGE,
  )
  const pagedUnpinnedProducts = unpinnedProducts.slice(
    (shopPageClamped - 1) * SHOP_PER_PAGE,
    shopPageClamped * SHOP_PER_PAGE,
  )

  const portfolioTotalPages = Math.max(1, Math.ceil(portfolioItems.length / PORTFOLIO_PER_PAGE))
  const portfolioPageClamped = Math.min(portfolioPage, portfolioTotalPages)
  const pagedPortfolioItems = portfolioItems.slice(
    (portfolioPageClamped - 1) * PORTFOLIO_PER_PAGE,
    portfolioPageClamped * PORTFOLIO_PER_PAGE,
  )
  const commissionInfo   = COMMISSION_STATUS_STYLES[commissionStatus] ?? COMMISSION_STATUS_STYLES.OPEN

  // Social links present in display order
  const filledSocials = (
    ['instagram', 'tiktok', 'twitter', 'facebook', 'youtube', 'pixiv', 'twitch', 'website'] as const
  ).filter((key) => socialLinks[key])

  return (
    <>
      {/* ── Sticky Tab Bar ─────────────────────────────────────────────────── */}
      <div className="sticky top-[100px] z-30 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="relative">
            <div className="flex overflow-x-auto scrollbar-none pb-0" style={{ WebkitOverflowScrolling: 'touch' }}>
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={[
                    'cursor-pointer shrink-0 px-5 py-3.5 text-sm font-semibold transition-colors duration-150 border-b-2 -mb-px',
                    activeTab === tab.id
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground',
                  ].join(' ')}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {/* Gradient fade — indicates horizontal scrollability on mobile */}
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ── Tab content ────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-5xl px-4 pb-24 sm:px-6 lg:px-8">

        {/* SHOP ────────────────────────────────────────────────────────────── */}
        {activeTab === 'shop' && (
          <section className="pt-10 animate-in fade-in duration-200">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">Shop</h2>
              {products.length > 0 && (
                <div className="flex rounded-lg border border-border bg-card p-0.5">
                  {(['default', 'popular'] as const).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setShopSort(opt)}
                      className={[
                        'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                        shopSort === opt
                          ? 'bg-primary text-white'
                          : 'text-muted-foreground hover:text-foreground',
                      ].join(' ')}
                    >
                      {opt === 'default' ? 'Default' : 'Popular'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {products.length === 0 ? (
              <EmptyState
                title="No products yet"
                description="This creator hasn't listed any products yet. Check back soon!"
              />
            ) : shopSort === 'popular' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                {pagedSortedProducts.map((product) => (
                  <div key={product.id} className="relative">
                    {product.isNew && (
                      <span className="absolute top-2 left-2 z-10 bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                        NEW
                      </span>
                    )}
                    <ProductCard product={product} />
                    {(product.reviewCount ?? 0) > 0 && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-yellow-400 text-xs">{'★'.repeat(Math.round(product.averageRating ?? 0))}{'☆'.repeat(5 - Math.round(product.averageRating ?? 0))}</span>
                        <span className="text-[10px] text-muted-foreground">({product.reviewCount})</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <>
                {pinnedProducts.length > 0 && (
                  <div className="mb-8">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">Featured</span>
                      <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] text-primary border border-primary/30">
                        Pinned
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                      {pinnedProducts.map((product) => (
                        <div key={product.id} className="relative">
                          <div className="absolute -top-2 left-2 z-10 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white">
                            Featured
                          </div>
                          {product.isNew && (
                            <span className="absolute top-2 left-2 z-20 bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                              NEW
                            </span>
                          )}
                          <ProductCard product={product} />
                          {(product.reviewCount ?? 0) > 0 && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-yellow-400 text-xs">{'★'.repeat(Math.round(product.averageRating ?? 0))}{'☆'.repeat(5 - Math.round(product.averageRating ?? 0))}</span>
                              <span className="text-[10px] text-muted-foreground">({product.reviewCount})</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {unpinnedProducts.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                    {pagedUnpinnedProducts.map((product) => (
                      <div key={product.id} className="relative">
                        {product.isNew && (
                          <span className="absolute top-2 left-2 z-10 bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                            NEW
                          </span>
                        )}
                        <ProductCard product={product} />
                        {(product.reviewCount ?? 0) > 0 && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-yellow-400 text-xs">{'★'.repeat(Math.round(product.averageRating ?? 0))}{'☆'.repeat(5 - Math.round(product.averageRating ?? 0))}</span>
                            <span className="text-[10px] text-muted-foreground">({product.reviewCount})</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {shopTotalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-3">
                <button
                  onClick={() => { setShopPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                  disabled={shopPageClamped <= 1}
                  className="rounded-lg border border-border bg-card px-4 py-2 text-sm text-foreground hover:border-primary/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ← Prev
                </button>
                <span className="text-sm text-muted-foreground">
                  Page {shopPageClamped} of {shopTotalPages}
                </span>
                <button
                  onClick={() => { setShopPage(p => Math.min(shopTotalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                  disabled={shopPageClamped >= shopTotalPages}
                  className="rounded-lg border border-border bg-card px-4 py-2 text-sm text-foreground hover:border-primary/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next →
                </button>
              </div>
            )}

            <ShopDiscovery products={discoveryProducts} />
          </section>
        )}

        {/* ABOUT ───────────────────────────────────────────────────────────── */}
        {/* Does NOT contain: banner (in header), category tags (in header)    */}
        {activeTab === 'about' && (
          <section className="animate-in fade-in duration-200">

            {/* ── About content — centered ──────────────────────────────── */}
            <div className="pt-10 pb-16 text-center">
              <h2 className="mb-6 text-3xl font-bold text-foreground sm:text-4xl">
                About {displayName}
              </h2>

              {/* Full bio */}
              {bio ? (
                <p
                  className="mx-auto mb-6 max-w-[680px] text-muted-foreground"
                  style={{ fontSize: '18px', lineHeight: '1.8' }}
                >
                  {bio}
                </p>
              ) : (
                <p
                  className="mx-auto mb-6 max-w-[680px] italic text-muted-foreground/60"
                  style={{ fontSize: '18px', lineHeight: '1.8' }}
                >
                  This creator hasn&apos;t written a bio yet.
                </p>
              )}

              {/* Member since */}
              <p className="mb-10 text-sm text-muted-foreground/60">
                Member since {formatJoinDate(joinDate)}
              </p>

              {/* Social icon row */}
              {filledSocials.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-5">
                  {filledSocials.map((key) => {
                    const cfg = SOCIAL_CONFIG[key]
                    if (!cfg) return null
                    // H17 — block `javascript:` / `data:` / relative URLs.
                    const safeUrl = safeExternalHref(socialLinks[key])
                    if (!safeUrl) return null
                    return (
                      <a
                        key={key}
                        href={safeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={cfg.label}
                        title={cfg.label}
                        className="text-muted-foreground/50 transition-colors duration-150 hover:text-primary"
                      >
                        {cfg.icon}
                      </a>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-border" />

            {/* Message CTA */}
            <div className="py-16 text-center">
              <p className="mb-5 text-base text-muted-foreground">
                Interested in working with {displayName}?
              </p>
              <Link
                href={`/account/messages?to=${creatorUsername}`}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-primary/40 active:scale-95"
              >
                Send a Message
              </Link>
            </div>

            <AboutDiscovery creators={discoveryCreators} />
          </section>
        )}

        {/* PORTFOLIO ───────────────────────────────────────────────────────── */}
        {showPortfolio && activeTab === 'portfolio' && (
          <section className="pt-10 animate-in fade-in duration-200">
            <h2 className="mb-6 text-xl font-bold text-foreground">Portfolio</h2>

            {portfolioItems.length === 0 ? (
              <EmptyState
                title="No portfolio items yet"
                description="This creator hasn't added any portfolio items yet. Check back soon!"
              />
            ) : (
            /* Masonry — CSS columns */
            <div style={{ columnCount: 2, columnGap: '12px' }}>
              <style>{`
                @media (min-width: 640px) { .portfolio-masonry { column-count: 3 !important; } }
                @media (min-width: 1024px) { .portfolio-masonry { column-count: 4 !important; } }
              `}</style>
              {pagedPortfolioItems.map((item, i) => (
                <div
                  key={item.id}
                  onClick={() => setLightboxIdx((portfolioPageClamped - 1) * PORTFOLIO_PER_PAGE + i)}
                  style={{ breakInside: 'avoid', marginBottom: '12px', cursor: 'pointer' }}
                  className="group relative overflow-hidden rounded-xl border border-border bg-card"
                >
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="block w-full transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="aspect-[3/4] w-full bg-gradient-to-br from-primary/30 via-surface to-secondary/30" />
                  )}

                  {/* Hover overlay */}
                  <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/20 to-transparent p-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    <p className="text-sm font-semibold leading-tight text-white">{item.title}</p>
                    {item.category && (
                      <span className="mt-1 inline-block w-fit rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-medium text-white/80">
                        {item.category}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            )}

            {portfolioTotalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-3">
                <button
                  onClick={() => { setPortfolioPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                  disabled={portfolioPageClamped <= 1}
                  className="rounded-lg border border-border bg-card px-4 py-2 text-sm text-foreground hover:border-primary/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ← Prev
                </button>
                <span className="text-sm text-muted-foreground">
                  Page {portfolioPageClamped} of {portfolioTotalPages}
                </span>
                <button
                  onClick={() => { setPortfolioPage(p => Math.min(portfolioTotalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                  disabled={portfolioPageClamped >= portfolioTotalPages}
                  className="rounded-lg border border-border bg-card px-4 py-2 text-sm text-foreground hover:border-primary/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next →
                </button>
              </div>
            )}

            <PortfolioDiscovery items={discoveryPortfolio} />
          </section>
        )}

        {/* COMMISSION ──────────────────────────────────────────────────────── */}
        {showCommission && activeTab === 'commission' && (
          <section className="pt-10 animate-in fade-in duration-200">
            <h2 className="mb-6 text-xl font-bold text-foreground">Commission</h2>

            <div className="space-y-6">
              {/* Status banner */}
              <div className={`flex items-center gap-3 rounded-2xl px-5 py-4 text-sm font-semibold ${commissionInfo.className}`}>
                <span className={`size-2.5 rounded-full ${commissionInfo.dotClass} shrink-0`} />
                <span className="text-base">{commissionInfo.label}</span>
              </div>

              {/* Slots */}
              {typeof commissionSlots === 'number' && commissionSlots > 0 && (
                <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4">
                  <span className="text-2xl font-bold text-primary">{commissionSlots}</span>
                  <span className="text-sm text-muted-foreground">
                    slot{commissionSlots !== 1 ? 's' : ''} available
                  </span>
                </div>
              )}

              {/* Commission description */}
              {commissionDescription && (
                <div className="rounded-2xl border border-border bg-card px-5 py-4">
                  {commissionDescription.split('\n').filter(Boolean).map((para, i) => (
                    <p key={i} className="text-muted-foreground" style={{ fontSize: '15px', lineHeight: '1.8', marginBottom: i < commissionDescription.split('\n').filter(Boolean).length - 1 ? '0.75rem' : 0 }}>
                      {para}
                    </p>
                  ))}
                </div>
              )}

              {/* Pricing tiers */}
              {commissionPricing.length > 0 && (
                <div>
                  <p className="mb-3 text-sm font-semibold text-foreground">Pricing</p>
                  <div className="overflow-hidden rounded-2xl border border-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-surface text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          <th className="px-4 py-3">Tier</th>
                          <th className="px-4 py-3">Price</th>
                          <th className="hidden sm:table-cell px-4 py-3">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border bg-card">
                        {commissionPricing.map((tier, i) => (
                          <tr key={i}>
                            <td className="px-4 py-3 font-semibold text-foreground">{tier.tier}</td>
                            <td className="px-4 py-3 font-bold text-primary whitespace-nowrap">
                              {formatPrice(tier.price)}
                            </td>
                            <td className="hidden sm:table-cell px-4 py-3 text-muted-foreground">
                              {tier.description}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="sm:hidden divide-y divide-border bg-card">
                      {commissionPricing.map((tier, i) =>
                        tier.description ? (
                          <div key={i} className="px-4 py-2 text-xs text-muted-foreground">
                            <span className="font-semibold text-muted-foreground">{tier.tier}:</span>{' '}
                            {tier.description}
                          </div>
                        ) : null
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Terms */}
              {commissionTerms && (
                <div className="rounded-2xl border border-border bg-card p-5">
                  <p className="mb-3 text-sm font-semibold text-foreground">Terms &amp; Process</p>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                    {commissionTerms}
                  </p>
                </div>
              )}

              {/* CTA */}
              <div className="pt-2 flex flex-wrap items-center gap-3">
                {commissionStatus === 'CLOSED' ? (
                  <span className="inline-flex items-center gap-2 rounded-xl border border-border px-6 py-3 text-sm font-semibold text-muted-foreground">
                    Commissions closed
                  </span>
                ) : (
                  <Link
                    href={`/creator/${creatorUsername}/commission/new`}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-primary/30 active:scale-95"
                  >
                    Request Commission
                  </Link>
                )}
                <Link
                  href={`/account/messages?to=${creatorUsername}`}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  or message {displayName} first
                </Link>
              </div>
            </div>
            <CommissionDiscovery creators={discoveryCommission} />
          </section>
        )}

        {/* VIDEOS ─────────────────────────────────────────────────────────── */}
        {showVideos && activeTab === 'videos' && (
          <section className="pt-10 animate-in fade-in duration-200">
            <h2 className="mb-6 text-xl font-bold text-foreground">Videos</h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {videos.map((video) => (
                <div key={video.id} className="overflow-hidden rounded-2xl border border-border bg-card">
                  {/* Embed — lazy: show thumbnail until clicked */}
                  <div className="relative aspect-video bg-surface">
                    {loadedVideos.has(video.id) ? (
                      <iframe
                        src={
                          video.platform === 'YOUTUBE'
                            ? `https://www.youtube.com/embed/${video.embedId}?autoplay=1`
                            : `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(video.url)}&show_text=false`
                        }
                        className="absolute inset-0 h-full w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title={video.title}
                      />
                    ) : (
                      <button
                        onClick={() => setLoadedVideos(prev => new Set([...prev, video.id]))}
                        className="absolute inset-0 flex flex-col items-center justify-center gap-3 w-full bg-surface hover:bg-surface/80 transition-colors"
                        aria-label={`Play ${video.title}`}
                      >
                        {video.platform === 'YOUTUBE' ? (
                          <img
                            src={`https://img.youtube.com/vi/${video.embedId}/hqdefault.jpg`}
                            alt={video.title}
                            className="absolute inset-0 h-full w-full object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-[#1877f2]/20 to-[#1877f2]/5" />
                        )}
                        <div className="relative z-10 flex size-14 items-center justify-center rounded-full bg-black/60 text-white shadow-lg">
                          <svg viewBox="0 0 24 24" className="size-6 fill-white ml-1" aria-hidden="true">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </button>
                    )}
                  </div>
                  {/* Meta */}
                  <div className="px-4 py-3 flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground leading-snug">{video.title}</p>
                    <span
                      className={[
                        'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                        video.platform === 'YOUTUBE'
                          ? 'bg-[#ff0000]/10 text-[#ff0000]'
                          : 'bg-[#1877f2]/10 text-[#1877f2]',
                      ].join(' ')}
                    >
                      {video.platform === 'YOUTUBE' ? 'YouTube' : 'Facebook'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <VideosDiscovery videos={discoveryVideos} />
          </section>
        )}

        {/* PRINT ON DEMAND ────────────────────────────────────────────────── */}
        {showPod && activeTab === 'pod' && (
          <section className="pt-10 animate-in fade-in duration-200">
            <h2 className="mb-6 text-xl font-bold text-foreground">Print On Demand</h2>
            <div className="space-y-6">

              {/* POD Products */}
              {podProducts.length > 0 ? (
                <div>
                  <p className="mb-3 text-sm font-semibold text-foreground">POD Products</p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {podProducts.map(p => {
                      const imgs: string[] = (() => { try { return JSON.parse(p.images) } catch { return [] } })()
                      return (
                        <div key={p.id} className="rounded-2xl border border-border bg-card overflow-hidden">
                          {imgs[0] && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={imgs[0]} alt={p.title} className="w-full aspect-square object-cover" />
                          )}
                          <div className="p-3">
                            <p className="text-sm font-semibold text-foreground line-clamp-2">{p.title}</p>
                            <p className="mt-1 text-sm font-bold text-primary">{formatPrice(p.price)}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-border bg-card px-5 py-8 text-center">
                  <p className="text-sm text-muted-foreground">No POD products listed yet.</p>
                </div>
              )}

              {/* POD Providers */}
              {podProviders.length > 0 && (
                <div>
                  <p className="mb-3 text-sm font-semibold text-foreground">Print Partners</p>
                  <div className="space-y-3">
                    {podProviders.map(provider => {
                      const displayName = provider.customName ?? provider.name.replace(/_/g, ' ')
                      return (
                        <div key={provider.id} className="rounded-2xl border border-border bg-card px-5 py-4">
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-foreground">{displayName}</p>
                              {provider.isDefault && (
                                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary border border-primary/20">
                                  Default
                                </span>
                              )}
                            </div>
                            {provider.storeUrl && (
                              <a
                                href={provider.storeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline shrink-0"
                              >
                                Visit store ↗
                              </a>
                            )}
                          </div>
                          {provider.notes && (
                            <p className="mt-1.5 text-sm text-muted-foreground">{provider.notes}</p>
                          )}
                          <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground sm:grid-cols-4">
                            <span>Production: <span className="font-medium text-foreground">{provider.defaultProductionDays}d</span></span>
                            <span>Malaysia: <span className="font-medium text-foreground">{provider.shippingMY}d</span></span>
                            <span>Singapore: <span className="font-medium text-foreground">{provider.shippingSG}d</span></span>
                            <span>Philippines: <span className="font-medium text-foreground">{provider.shippingPH}d</span></span>
                            {provider.shippingIntl > 0 && (
                              <span>International: <span className="font-medium text-foreground">{provider.shippingIntl}d</span></span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            <PodDiscovery creators={discoveryPod} />
          </section>
        )}

        {/* SUPPORT ─────────────────────────────────────────────────────────── */}
        {showSupport && activeTab === 'support' && (
          <section className="pt-10 animate-in fade-in duration-200 space-y-10">

            {/* Support payment modal */}
            {supportModal && (
              <SupportModal
                open
                onClose={() => setSupportModal(null)}
                mode={supportModal.kind}
                creatorUsername={creatorUsername}
                creatorDisplayName={displayName}
                tier={supportModal.kind === 'tier' ? supportModal.tier : undefined}
                goal={supportModal.kind === 'goal' ? {
                  id: supportModal.goal.id,
                  title: supportModal.goal.title,
                  targetAmountUsd: supportModal.goal.targetAmountUsd,
                  currentAmountUsd: supportModal.goal.currentAmountUsd,
                } : undefined}
                presetAmounts={supportModal.kind === 'gift' || supportModal.kind === 'monthly_gift'
                  ? supportGift?.presetAmounts
                  : undefined}
                initialAmountUsd={
                  supportModal.kind === 'gift' || supportModal.kind === 'monthly_gift'
                    ? supportModal.amountCents
                    : null
                }
                initialMessage={supportModal.kind === 'gift' ? supportModal.message : ''}
                initialAnonymous={supportModal.kind === 'gift' ? supportModal.anonymous : false}
              />
            )}

            {/* SECTION A — Monthly Membership */}
            {supportTiers.length > 0 && (
              <div>
                <h2 className="mb-1 text-xl font-bold text-foreground">Support {displayName} Monthly</h2>
                <p className="mb-5 text-sm text-muted-foreground">Choose a membership tier and get exclusive perks</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {supportTiers.map((tier, i) => {
                    const isPopular = i === 1 && supportTiers.length === 3
                    return (
                      <div
                        key={tier.id}
                        className={[
                          'relative flex flex-col rounded-2xl border p-6',
                          isPopular ? 'border-primary shadow-lg shadow-primary/10' : 'border-border bg-card',
                        ].join(' ')}
                      >
                        {isPopular && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                            Most Popular
                          </div>
                        )}
                        <p className="text-base font-bold text-foreground">{tier.name}</p>
                        <p className="mt-1 text-2xl font-extrabold text-primary">
                          ${(tier.priceUsd / 100).toFixed(0)}
                          <span className="text-sm font-medium text-muted-foreground"> / month</span>
                        </p>
                        {tier.description && (
                          <p className="mt-2 text-xs text-muted-foreground">{tier.description}</p>
                        )}
                        <ul className="my-4 space-y-1.5 flex-1">
                          {tier.perks.map((perk, pi) => (
                            <li key={pi} className="flex items-start gap-2 text-sm text-foreground">
                              <svg viewBox="0 0 16 16" className="mt-0.5 size-3.5 shrink-0 fill-primary" aria-hidden="true">
                                <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" />
                              </svg>
                              {perk}
                            </li>
                          ))}
                        </ul>
                        <p className="mb-3 text-xs text-muted-foreground">{tier.subscriberCount} supporter{tier.subscriberCount !== 1 ? 's' : ''}</p>
                        <button
                          onClick={() => openTierModal(tier)}
                          className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
                        >
                          Subscribe
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* SECTION B — Goals */}
            {activeGoals.length > 0 && (
              <div>
                <h2 className="mb-1 text-xl font-bold text-foreground">Help Fund a Project</h2>
                <p className="mb-5 text-sm text-muted-foreground">Support {displayName}&apos;s ongoing goals and projects</p>
                <div className="space-y-4">
                  {activeGoals.map((goal) => {
                    const pct = Math.min(100, Math.round((goal.currentAmountUsd / goal.targetAmountUsd) * 100))
                    const daysLeft = goal.deadline
                      ? Math.max(0, Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / 86_400_000))
                      : null
                    const isComplete = goal.status === 'COMPLETED'
                    return (
                      <div key={goal.id} className="overflow-hidden rounded-2xl border border-border bg-card">
                        {goal.coverImage && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={goal.coverImage} alt={goal.title} className="h-40 w-full object-cover" />
                        )}
                        <div className="p-5">
                          <div className="mb-1 flex items-center gap-2 flex-wrap">
                            <h3 className="text-base font-bold text-foreground">{goal.title}</h3>
                            {isComplete && (
                              <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success border border-success/30">
                                Goal Reached! 🎉
                              </span>
                            )}
                            {!isComplete && daysLeft !== null && (
                              <span className="rounded-full bg-warning/10 px-2.5 py-0.5 text-xs font-semibold text-warning border border-warning/30">
                                {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
                              </span>
                            )}
                          </div>
                          {goal.description && (
                            <p className="mb-4 text-sm text-muted-foreground">{goal.description}</p>
                          )}
                          {/* Progress bar */}
                          <div className="mb-1 h-2.5 overflow-hidden rounded-full bg-surface">
                            <div
                              className="h-full rounded-full bg-primary transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className="mt-2 flex items-center justify-between text-sm">
                            <span className="font-semibold text-foreground">
                              ${(goal.currentAmountUsd / 100).toFixed(0)} raised
                            </span>
                            <span className="text-muted-foreground">
                              of ${(goal.targetAmountUsd / 100).toFixed(0)} goal
                            </span>
                          </div>
                          {!isComplete && (
                            <button
                              onClick={() => openGoalModal(goal)}
                              className="mt-4 w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
                            >
                              Contribute
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* SECTION C — Gift */}
            {supportGift?.isActive && (
              <div>
                <h2 className="mb-1 text-xl font-bold text-foreground">Buy {displayName} a Coffee</h2>
                <p className="mb-5 text-sm text-muted-foreground">Show your appreciation with a gift</p>
                <div className="rounded-2xl border border-border bg-card p-6 max-w-lg">

                  {/* Avatar + thank you message */}
                  <div className="mb-5 flex items-start gap-4">
                    {creatorAvatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={creatorAvatar} alt={displayName} className="size-12 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-sm font-bold text-white">
                        {displayName.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <p className="text-sm leading-relaxed text-muted-foreground italic">
                      &ldquo;{supportGift.thankYouMessage}&rdquo;
                    </p>
                  </div>

                  {/* One-time / Monthly toggle */}
                  <div
                    className="mb-5 flex w-full rounded-full p-1"
                    style={{ background: 'var(--surface)' }}
                  >
                    {(['onetime', 'monthly'] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => { setGiftMode(mode); setGiftAmount(null); setGiftCustom('') }}
                        className="flex-1 rounded-full py-2 text-sm font-medium transition-all duration-200"
                        style={
                          giftMode === mode
                            ? { background: 'var(--card)', color: '#7c3aed', boxShadow: '0 1px 4px rgba(0,0,0,0.1)', fontWeight: 600 }
                            : { background: 'transparent', color: 'var(--muted-foreground)' }
                        }
                      >
                        {mode === 'onetime' ? 'One time' : 'Monthly'}
                      </button>
                    ))}
                  </div>

                  {/* Preset amounts */}
                  <div className="mb-3 flex flex-wrap gap-2">
                    {supportGift.presetAmounts.map((amt) => (
                      <button
                        key={amt}
                        onClick={() => { setGiftAmount(amt); setGiftCustom('') }}
                        className="rounded-full py-2 px-5 text-sm font-medium transition-colors"
                        style={
                          giftAmount === amt && !giftCustom
                            ? { border: '1.5px solid #7c3aed', color: '#7c3aed', background: 'rgba(124,58,237,0.08)' }
                            : { border: '1.5px solid var(--border)', color: 'var(--foreground)', background: 'transparent' }
                        }
                      >
                        ${amt}
                      </button>
                    ))}
                  </div>

                  {/* Custom amount */}
                  <div className="mb-3 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                    <input
                      type="number"
                      min="1"
                      placeholder="Or enter your own amount"
                      value={giftCustom}
                      onChange={e => { setGiftCustom(e.target.value); setGiftAmount(null) }}
                      className="w-full rounded-xl border border-border bg-surface pl-7 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                    />
                  </div>

                  {/* Message */}
                  <textarea
                    rows={2}
                    placeholder="Leave a message (optional)"
                    value={giftMsg}
                    onChange={e => setGiftMsg(e.target.value)}
                    className="mb-3 w-full resize-none rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                  />

                  {/* Anon toggle */}
                  <label className="mb-4 flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={giftAnon}
                      onChange={e => setGiftAnon(e.target.checked)}
                      className="size-4 rounded accent-primary"
                    />
                    Send anonymously
                  </label>

                  <button
                    onClick={openGiftModal}
                    className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
                  >
                    {giftMode === 'onetime' ? 'Send Gift 💜' : 'Support Monthly 💜'}
                  </button>

                  {giftMode === 'monthly' && (
                    <p className="mt-2 text-center text-xs text-muted-foreground">
                      Cancel anytime. You&apos;ll be charged monthly until cancelled.
                    </p>
                  )}

                  <p className="mt-3 text-center text-xs text-muted-foreground">
                    {giftMode === 'onetime'
                      ? `${supportGift.giftCount} ${supportGift.giftCount === 1 ? 'person has' : 'people have'} supported ${displayName}`
                      : `${supportGift.monthlyGifterCount} monthly supporter${supportGift.monthlyGifterCount !== 1 ? 's' : ''}`
                    }
                  </p>
                </div>
              </div>
            )}

            <SupportDiscovery creators={discoverySupport} />
          </section>
        )}

      </div>

      {/* ── Fan Messages ──────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 mt-12 mb-16">
        <h2 className="text-lg font-bold text-foreground mb-4">Fan Messages</h2>

        {/* Show approved entries */}
        {guestbookEntries.length > 0 ? (
          <div className="space-y-3 mb-6">
            {guestbookEntries.map(entry => {
              const initial = entry.authorName.slice(0, 1).toUpperCase()
              const ts = (() => { try { return new Date(entry.createdAt).toLocaleDateString('en-MY', { month: 'short', day: 'numeric', year: 'numeric' }) } catch { return '' } })()
              return (
                <div key={entry.id} className="flex gap-3 rounded-xl border border-border bg-card px-4 py-3">
                  {entry.authorAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={entry.authorAvatar} alt={entry.authorName} className="size-8 shrink-0 rounded-full object-cover mt-0.5" />
                  ) : (
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary mt-0.5">{initial}</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground">{entry.authorName}</span>
                      {entry.rating && (
                        <span className="text-xs text-yellow-400">{'★'.repeat(entry.rating)}{'☆'.repeat(5 - entry.rating)}</span>
                      )}
                      <span className="text-xs text-muted-foreground">{ts}</span>
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">{entry.content}</p>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground mb-6">No fan messages yet. Be the first to leave one!</p>
        )}

        {/* Leave a fan message form — below the list */}
        {sessionUserId === creatorUserId ? null : (userRole === 'ADMIN' || userRole === 'CREATOR') ? (
          <div className="rounded-xl border border-border bg-card p-5 text-center">
            <p className="text-sm text-muted-foreground">Only members can leave fan messages</p>
          </div>
        ) : !userRole ? (
          <div className="rounded-xl border border-border bg-card p-5 text-center">
            <p className="text-sm text-muted-foreground mb-3">Sign in to leave a fan message</p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
            >
              Sign In
            </Link>
          </div>
        ) : fanMsgSent ? (
          <div className="rounded-xl border border-border bg-card p-5 text-center">
            <p className="text-sm font-medium text-success">Thank you! Your message has been submitted and is pending creator approval.</p>
          </div>
        ) : (
          <form onSubmit={handleFanMessage} className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Rating</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFanMsgRating(star)}
                    onMouseEnter={() => setFanMsgHoverRating(star)}
                    onMouseLeave={() => setFanMsgHoverRating(0)}
                    className="text-2xl transition-colors"
                    aria-label={`${star} star`}
                  >
                    <span className={(fanMsgHoverRating || fanMsgRating) >= star ? 'text-yellow-400' : 'text-border'}>★</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <textarea
                rows={3}
                value={fanMsgText}
                onChange={e => setFanMsgText(e.target.value.slice(0, 280))}
                maxLength={280}
                required
                className="w-full resize-none rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                placeholder={`Leave a public message for ${displayName}…`}
              />
              <span className="text-xs text-muted-foreground">{fanMsgText.length}/280</span>
            </div>
            {fanMsgError && <p className="text-sm text-destructive">{fanMsgError}</p>}
            <button
              type="submit"
              disabled={fanMsgSending || !fanMsgText.trim()}
              className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {fanMsgSending ? 'Submitting…' : 'Leave a Message'}
            </button>
          </form>
        )}
      </div>


      {/* ── Leave a Private Message ───────────────────────────────────────── */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 mt-6 mb-16">
        <h2 className="text-lg font-bold text-foreground mb-4">Leave a Message</h2>
        {sessionUserId === creatorUserId ? null : (userRole === 'ADMIN' || userRole === 'CREATOR') ? (
          <div className="rounded-xl border border-border bg-card p-5 text-center">
            <p className="text-sm text-muted-foreground">Only members can send messages to creators</p>
          </div>
        ) : !userRole ? (
          <div className="rounded-xl border border-border bg-card p-5 text-center">
            <p className="text-sm text-muted-foreground mb-3">Sign in to send a message</p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
            >
              Sign In
            </Link>
          </div>
        ) : msgSent ? (
          <div className="rounded-xl border border-border bg-card p-5 text-center">
            <p className="text-sm font-medium text-success">Message sent! The creator will reply in your Messages inbox.</p>
          </div>
        ) : (
          <form onSubmit={handleSendMessage} className="rounded-xl border border-border bg-card p-5 space-y-4">
            <textarea
              rows={4}
              value={msgText}
              onChange={e => setMsgText(e.target.value.slice(0, 1000))}
              maxLength={1000}
              required
              className="w-full resize-none rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              placeholder={`Send a private message to ${displayName}…`}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{msgText.length}/1000</span>
              {msgError && <p className="text-sm text-destructive">{msgError}</p>}
              <button
                type="submit"
                disabled={msgSending || !msgText.trim()}
                className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {msgSending ? 'Sending…' : 'Send Message'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ── Portfolio Lightbox ─────────────────────────────────────────────── */}
      {lightboxIdx !== null && (
        <PortfolioLightbox
          items={portfolioItems}
          initialIndex={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
        />
      )}
    </>
  )
}
