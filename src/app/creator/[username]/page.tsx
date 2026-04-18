import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { getCached, setCached, CACHE_KEYS, CACHE_TTL } from '@/lib/redis'
import { CreatorPageTabs } from './CreatorPageTabs'
import type { DiscoveryProduct, DiscoveryCreator, DiscoveryVideo, DiscoveryPortfolioItem } from './CreatorDiscovery'
import { CreatorPopup } from '@/components/ui/CreatorPopup'
import { FollowButton } from '@/components/ui/FollowButton'
import { JsonLd } from '@/components/seo/JsonLd'
import { SEO_CONFIG } from '@/lib/seo-config'

interface PageProps {
  params: Promise<{ username: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params
  const creator = await prisma.creatorProfile.findUnique({
    where: { username },
    select: { displayName: true, bio: true, avatar: true, categoryTags: true, username: true },
  })
  if (!creator) return {}

  const tags: string[] = (() => { try { return JSON.parse(creator.categoryTags) } catch { return [] } })()
  const tagStr = tags.length > 0 ? tags.slice(0, 2).join(' & ') + ' ' : ''
  const title = `${creator.displayName} — ${tagStr}Creator | noizu.direct`
  const description = creator.bio
    ? `${creator.bio.slice(0, 120)}${creator.bio.length > 120 ? '…' : ''} — Browse ${creator.displayName}'s products on noizu.direct.`
    : `Browse products by ${creator.displayName} on noizu.direct, the SEA creator marketplace.`
  const url = `${SEO_CONFIG.siteUrl}/creator/${username}`
  const ogImage = creator.avatar || SEO_CONFIG.defaultOgImage

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: 'profile',
      images: [{ url: ogImage, width: 400, height: 400, alt: `${creator.displayName} profile photo` }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  }
}

// ── Types ──────────────────────────────────────────────────────────────────────

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

// ── Helpers ────────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function parseTags(raw: string | null): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as string[]) : []
  } catch {
    return []
  }
}

function parseSocialLinks(raw: string | null): Record<string, string> {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {}
  } catch {
    return {}
  }
}

function parsePortfolioItems(raw: string | null): PortfolioItem[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as PortfolioItem[]) : []
  } catch {
    return []
  }
}

function parsePricingTiers(raw: string | null): PricingTier[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as PricingTier[]) : []
  } catch {
    return []
  }
}

function parseBadges(raw: string | null): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as string[]) : []
  } catch {
    return []
  }
}

// ── Static lookups ─────────────────────────────────────────────────────────────

const COMMISSION_STATUS: Record<string, { label: string; className: string }> = {
  OPEN:    { label: 'Commissions Open',   className: 'bg-success/10 text-success border border-success/30' },
  CLOSED:  { label: 'Commissions Closed', className: 'bg-destructive/10 text-destructive border border-destructive/30' },
  LIMITED: { label: 'Limited Slots',      className: 'bg-warning/10 text-warning border border-warning/30' },
}

const SOCIAL_LABELS: Record<string, string> = {
  twitter:   'X / Twitter',
  instagram: 'Instagram',
  pixiv:     'Pixiv',
  youtube:   'YouTube',
  tiktok:    'TikTok',
  twitch:    'Twitch',
  facebook:  'Facebook',
  website:   'Website',
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function CreatorPage({ params }: PageProps) {
  const { username } = await params

  const cacheKey = CACHE_KEYS.creator(username)
  const fetchCreator = () => prisma.creatorProfile.findUnique({
    where: { username },
    include: {
      user: { select: { id: true, name: true, createdAt: true } },
      products: {
        where: { isActive: true },
        orderBy: [{ isPinned: 'desc' }, { order: 'asc' }, { createdAt: 'desc' }],
      },
      videos: {
        where: { isActive: true },
        orderBy: { order: 'asc' },
      },
      supportTiers: {
        where: { isActive: true },
        orderBy: { order: 'asc' },
      },
      supportGoals: {
        orderBy: { createdAt: 'desc' },
      },
      supportGift: true,
      podProviders: {
        orderBy: { isDefault: 'desc' },
      },
    },
  })
  type CreatorWithRelations = Awaited<ReturnType<typeof fetchCreator>>
  const cachedCreator = await getCached<NonNullable<CreatorWithRelations>>(cacheKey)
  const creator: CreatorWithRelations = cachedCreator ?? await fetchCreator()

  if (!creator) notFound()
  if (!cachedCreator) await setCached(cacheKey, creator, CACHE_TTL.creator)

  // ── Discovery queries ──────────────────────────────────────────────────────
  const topCategory = (() => {
    const cats: Record<string, number> = {}
    for (const p of creator.products) cats[p.category] = (cats[p.category] ?? 0) + 1
    return Object.entries(cats).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  })()
  const creatorTags = parseTags(creator.categoryTags)

  const [
    rawDProducts, rawDCreators, rawDCommission,
    rawDPortfolioCreators, rawDVideos, rawDSupportCreators,
  ] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true, ...(topCategory ? { category: topCategory } : {}), creator: { username: { not: username } } },
      include: { creator: { select: { username: true, displayName: true, avatar: true, isVerified: true, isTopCreator: true } } },
      take: 12,
    }),
    prisma.creatorProfile.findMany({
      where: { username: { not: username }, isSuspended: false },
      select: { username: true, displayName: true, avatar: true, isVerified: true, categoryTags: true, commissionStatus: true, commissionPricing: true, supportGoals: { where: { status: 'ACTIVE' }, take: 1, orderBy: { createdAt: 'desc' } } },
      take: 24,
    }),
    prisma.creatorProfile.findMany({
      where: { username: { not: username }, commissionStatus: 'OPEN', isSuspended: false },
      select: { username: true, displayName: true, avatar: true, isVerified: true, categoryTags: true, commissionStatus: true, commissionPricing: true, supportGoals: { where: { status: 'ACTIVE' }, take: 1, orderBy: { createdAt: 'desc' } } },
      take: 12,
    }),
    prisma.creatorProfile.findMany({
      where: { username: { not: username }, isSuspended: false },
      select: { username: true, displayName: true, avatar: true, portfolioItems: true },
      take: 20,
    }),
    prisma.video.findMany({
      where: { isActive: true, creator: { username: { not: username } } },
      include: { creator: { select: { username: true, displayName: true, avatar: true } } },
      take: 12,
    }),
    prisma.creatorProfile.findMany({
      where: { username: { not: username }, isSuspended: false, OR: [{ supportTiers: { some: { isActive: true } } }, { supportGoals: { some: { status: 'ACTIVE' } } }] },
      select: { username: true, displayName: true, avatar: true, isVerified: true, categoryTags: true, commissionStatus: true, commissionPricing: true, supportGoals: { where: { status: 'ACTIVE' }, take: 1, orderBy: { createdAt: 'desc' } } },
      take: 12,
    }),
  ])

  // Helpers to convert raw query results to discovery types
  function toDiscoveryCreator(c: typeof rawDCreators[0]): DiscoveryCreator {
    const pricing = parsePricingTiers(c.commissionPricing)
    const lowestPrice = pricing.length > 0 ? Math.min(...pricing.map(t => t.price)) : null
    const goal = c.supportGoals[0] ?? null
    return {
      username: c.username, displayName: c.displayName, avatar: c.avatar,
      isVerified: c.isVerified, categoryTags: parseTags(c.categoryTags),
      commissionStatus: c.commissionStatus, lowestCommissionPrice: lowestPrice,
      activeGoal: goal ? { title: goal.title, targetAmountUsd: goal.targetAmountUsd, currentAmountUsd: goal.currentAmountUsd } : null,
    }
  }

  const discoveryProducts: DiscoveryProduct[] = rawDProducts.slice(0, 6).map(p => ({
    id: p.id, title: p.title, description: p.description, price: p.price,
    category: p.category, type: p.type, images: p.images, isPinned: p.isPinned,
    creator: p.creator,
  }))

  const discoveryCreators: DiscoveryCreator[] = rawDCreators
    .map(c => ({ c, overlap: parseTags(c.categoryTags).filter(t => creatorTags.includes(t)).length }))
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, 6)
    .map(({ c }) => toDiscoveryCreator(c))

  const discoveryCommission: DiscoveryCreator[] = rawDCommission.slice(0, 6).map(toDiscoveryCreator)

  const discoveryPortfolio: DiscoveryPortfolioItem[] = rawDPortfolioCreators
    .flatMap(c => {
      const items = parsePortfolioItems(c.portfolioItems)
      return items
        .filter((item): item is typeof item & { imageUrl: string } => Boolean(item.isPublic && item.imageUrl))
        .map(item => ({ imageUrl: item.imageUrl, imageTitle: item.title, creatorUsername: c.username, creatorDisplayName: c.displayName, creatorAvatar: c.avatar }))
    })
    .slice(0, 6)

  const discoveryVideos: DiscoveryVideo[] = rawDVideos.slice(0, 6).map(v => ({
    id: v.id, title: v.title, platform: v.platform, embedId: v.embedId, url: v.url,
    creatorUsername: v.creator.username, creatorDisplayName: v.creator.displayName, creatorAvatar: v.creator.avatar ?? null,
  }))

  const discoverySupport: DiscoveryCreator[] = rawDSupportCreators.slice(0, 6).map(toDiscoveryCreator)

  // Suspended account gate
  if (creator.isSuspended) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-10 max-w-md">
          <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive mx-auto">
            <svg className="size-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            </svg>
          </div>
          <h1 className="mb-2 text-xl font-bold text-foreground">Account Suspended</h1>
          <p className="text-sm text-muted-foreground">This creator account has been suspended and is not available.</p>
          <Link
            href="/explore"
            className="mt-6 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
          >
            Browse other creators
          </Link>
        </div>
      </div>
    )
  }

  // IDLE / FLAGGED gate — block storefront entirely
  if (creator.storeStatus === 'FLAGGED' || creator.storeStatus === 'IDLE') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-10 max-w-md">
          <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive mx-auto">
            <svg className="size-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h1 className="mb-2 text-xl font-bold text-foreground">Store Unavailable</h1>
          <p className="text-sm text-muted-foreground">This store is temporarily unavailable.</p>
          <Link
            href="/creators"
            className="mt-6 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
          >
            Browse other creators
          </Link>
        </div>
      </div>
    )
  }

  // Fetch creator recommendations (fans also bought from)
  const creatorProductIds = creator.products.map(p => p.id)
  const creatorRecs = creatorProductIds.length > 0
    ? await prisma.productRecommendation.findMany({
        where: { sourceProductId: { in: creatorProductIds } },
        orderBy: { score: 'desc' },
        take: 50,
        select: {
          score: true,
          recommendedProduct: {
            select: {
              creatorId: true,
              creator: { select: { id: true, username: true, displayName: true, avatar: true, isVerified: true } },
            },
          },
        },
      })
    : []

  // Deduplicate by creatorId, average score, exclude this creator, take top 4
  const otherCreatorMap = new Map<string, { score: number; count: number; creator: { username: string; displayName: string; avatar: string | null; isVerified: boolean } }>()
  for (const rec of creatorRecs) {
    const rCreatorId = rec.recommendedProduct.creatorId
    if (rCreatorId === creator.id) continue
    const existing = otherCreatorMap.get(rCreatorId)
    if (existing) {
      existing.score += rec.score
      existing.count += 1
    } else {
      otherCreatorMap.set(rCreatorId, { score: rec.score, count: 1, creator: rec.recommendedProduct.creator })
    }
  }
  const relatedCreators = [...otherCreatorMap.values()]
    .map(v => ({ ...v.creator, avgScore: v.score / v.count }))
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, 4)

  const session = await auth()
  const isLoggedIn = Boolean(session?.user)
  const sessionUserId: string | null = (session?.user as any)?.id ?? null

  // Guestbook entries (approved + visible)
  const guestbookEntries = creator.id
    ? await prisma.creatorGuestbook.findMany({
        where: { creatorProfileId: creator.id, status: 'APPROVED', isVisible: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, content: true, rating: true, createdAt: true, author: { select: { name: true, avatar: true } } },
      })
    : []

  // Follower count + current-user follow state
  const [followerCount, initialFollowing] = await Promise.all([
    prisma.creatorFollow.count({ where: { creatorId: creator.id } }),
    session?.user
      ? prisma.creatorFollow.findUnique({
          where: { buyerId_creatorId: { buyerId: (session.user as any).id, creatorId: creator.id } },
          select: { buyerId: true },
        }).then((r) => Boolean(r))
      : Promise.resolve(false),
  ])

  // Parse fields
  const tags              = parseTags(creator.categoryTags)
  const socialLinks       = parseSocialLinks(creator.socialLinks)
  const badges            = parseBadges(creator.badges)
  const allPortfolioItems = parsePortfolioItems(creator.portfolioItems)
  const publicPortfolio   = allPortfolioItems.filter((item) => item.isPublic)
  const commissionPricing = parsePricingTiers(creator.commissionPricing)
  const commissionInfo    = COMMISSION_STATUS[creator.commissionStatus] ?? COMMISSION_STATUS.OPEN

  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const productsWithCreator = creator.products.map((product) => ({
    ...product,
    isNew: product.createdAt >= sevenDaysAgo,
    creator: {
      username:    creator.username,
      displayName: creator.displayName,
      avatar:      creator.avatar,
      isVerified:  creator.isVerified,
      isTopCreator: creator.isTopCreator,
    },
  }))

  const joinDate = creator.user?.createdAt ? new Date(creator.user.createdAt).toISOString() : new Date().toISOString()

  const personSchema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: creator.displayName,
    alternateName: '@' + creator.username,
    url: `https://noizu.direct/creator/${creator.username}`,
    image: creator.avatar || undefined,
    description: creator.bio || undefined,
    knowsAbout: parseTags(creator.categoryTags),
    sameAs: Object.values(parseSocialLinks(creator.socialLinks || '{}')).filter((v) => v && v.startsWith('http')),
    worksFor: { '@type': 'Organization', name: 'noizu.direct', url: 'https://noizu.direct' },
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://noizu.direct' },
      { '@type': 'ListItem', position: 2, name: 'Creators', item: 'https://noizu.direct/creators' },
      { '@type': 'ListItem', position: 3, name: creator.displayName, item: `https://noizu.direct/creator/${creator.username}` },
    ],
  }

  return (
    <div className="min-h-screen bg-background">
      <JsonLd data={[personSchema, breadcrumbSchema]} />

      {/* ── Hiatus banner ──────────────────────────────────────────────────── */}
      {creator.storeStatus === 'HIATUS' && (
        <div className="w-full bg-amber-500/10 border-b border-amber-500/30 px-4 py-3 text-center text-sm text-amber-400">
          This store is currently on hiatus. The creator may return soon.
        </div>
      )}

      {/* ── Hero Banner — persistent, full bleed ───────────────────────────── */}
      {/* 200px mobile → 400px desktop */}
      <div className="relative h-[200px] w-full overflow-hidden sm:h-[400px]">
        {creator.bannerImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={creator.bannerImage}
            alt={`${creator.displayName} — creator banner on noizu.direct`}
            className="h-full w-full object-cover object-center"
            style={{ objectPosition: 'center top' }}
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary/40 via-surface to-secondary/30" />
        )}

        {/* Gradient fade — transparent → background, fully opaque before avatar overlap point */}
        <div
          className="absolute inset-x-0 bottom-0 h-2/5"
          style={{ background: 'linear-gradient(to bottom, transparent 60%, var(--background) 85%)' }}
        />

        {/* Creator logo badge — bottom-left of banner */}
        {creator.logoImage && (
          <div className="absolute bottom-4 left-4 sm:left-8 size-16 sm:size-20 overflow-hidden rounded-xl border-2 border-card bg-card shadow-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={creator.logoImage}
              alt={`${creator.displayName} logo`}
              className="h-full w-full object-cover"
            />
          </div>
        )}
      </div>

      {/* ── Profile hero ───────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">

        {/* Avatar + message button — top half over banner, bottom half below */}
        <div className="-mt-3 flex items-end justify-between">
          <div className="relative z-10 flex items-end gap-4">
            {creator.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={creator.avatar}
                alt={creator.displayName}
                className="size-20 rounded-full border-4 border-background object-cover sm:size-24"
              />
            ) : (
              <div className="flex size-20 items-center justify-center rounded-full border-4 border-background bg-gradient-to-br from-primary to-secondary text-xl font-bold text-white sm:size-24 sm:text-2xl">
                {getInitials(creator.displayName)}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <FollowButton
              creatorId={creator.id}
              initialFollowing={initialFollowing}
              isLoggedIn={isLoggedIn}
              creatorUsername={creator.username}
            />
            <Link
              href={isLoggedIn ? `/account/messages?to=${creator.username}` : `/login?callbackUrl=/creator/${creator.username}`}
              className="mb-2 rounded-xl border border-primary px-4 py-2 text-sm font-semibold text-primary transition-all hover:bg-primary/10 sm:px-5 sm:py-2.5"
            >
              Message
            </Link>
          </div>
        </div>

        {/* Name + badges */}
        <div className="mt-3 flex flex-wrap items-center gap-2 sm:mt-4">
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">{creator.displayName}</h1>

          {creator.isVerified && (
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary/10 px-2.5 py-0.5 text-xs font-semibold text-secondary border border-secondary/30">
              <svg className="size-3" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zm3.646 5.146a.5.5 0 0 0-.707 0L6.5 9.586 5.061 8.146a.5.5 0 1 0-.707.708l1.793 1.793a.5.5 0 0 0 .707 0l4.793-4.793a.5.5 0 0 0 0-.708z" />
              </svg>
              Verified
            </span>
          )}

          {creator.isTopCreator && (
            <span className="rounded-full bg-warning px-2.5 py-0.5 text-xs font-bold text-background uppercase tracking-wide">
              Top Creator
            </span>
          )}

          {badges.map((badge) => (
            <span
              key={badge}
              className="rounded-full bg-primary/20 px-2.5 py-0.5 text-xs font-semibold text-primary border border-primary/30"
            >
              {badge}
            </span>
          ))}

          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${commissionInfo.className}`}>
            {commissionInfo.label}
          </span>
        </div>

        {/* Username */}
        <p className="mt-1 text-sm text-muted-foreground">@{creator.username}</p>

        {/* Bio — truncated to 2 lines in header; full bio is in About tab */}
        {creator.bio && (
          <p className="mt-2 max-w-2xl line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {creator.bio}
          </p>
        )}

        {/* Category tags */}
        {tags.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-secondary/10 px-3 py-1 text-xs font-medium text-secondary border border-secondary/20"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Stats row */}
        <div className="mt-3 flex gap-5">
          <div>
            <span className="block text-base font-bold text-foreground sm:text-lg">{creator.products.length}</span>
            <span className="text-xs text-muted-foreground">Products</span>
          </div>
          <div>
            <span className="block text-base font-bold text-foreground sm:text-lg">{followerCount}</span>
            <span className="text-xs text-muted-foreground">Followers</span>
          </div>
          <div>
            <span className="block text-base font-bold text-foreground sm:text-lg">{creator.totalSales}</span>
            <span className="text-xs text-muted-foreground">Sales</span>
          </div>
          {publicPortfolio.length > 0 && (
            <div>
              <span className="block text-base font-bold text-foreground sm:text-lg">{publicPortfolio.length}</span>
              <span className="text-xs text-muted-foreground">Portfolio</span>
            </div>
          )}
        </div>

        {/* Social links — compact text pills */}
        {Object.keys(socialLinks).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(socialLinks).map(([platform, url]) => {
              if (!url) return null
              return (
                <a
                  key={platform}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-card border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
                >
                  {SOCIAL_LABELS[platform] ?? platform}
                </a>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Announcement bar ───────────────────────────────────────────────── */}
      {creator.announcementActive && creator.announcementText && (
        <div className="mx-auto mt-5 max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-xl bg-primary/10 border border-primary/30 px-4 py-3 text-sm text-primary">
            <span className="font-semibold">Announcement:</span> {creator.announcementText}
          </div>
        </div>
      )}

      {/* ── Tabbed content (client component) ─────────────────────────────── */}
      <div>
        <CreatorPageTabs
          products={productsWithCreator}
          portfolioItems={publicPortfolio}
          commissionSlots={creator.commissionSlots ?? null}
          commissionTerms={creator.commissionTerms ?? null}
          commissionPricing={commissionPricing}
          commissionStatus={creator.commissionStatus}
          commissionDescription={creator.commissionDescription ?? null}
          creatorUsername={creator.username}
          displayName={creator.displayName}
          bio={creator.bio ?? null}
          socialLinks={socialLinks}
          joinDate={joinDate}
          videos={creator.videos.map(v => ({
            id: v.id, title: v.title, platform: v.platform,
            url: v.url, embedId: v.embedId, description: v.description ?? null,
          }))}
          supportTiers={creator.supportTiers.map(t => ({
            id: t.id, name: t.name, priceUsd: t.priceUsd,
            description: t.description ?? null,
            perks: (() => { try { return JSON.parse(t.perks) } catch { return [] } })(),
            subscriberCount: t.subscriberCount,
          }))}
          supportGoals={creator.supportGoals.map(g => ({
            id: g.id, title: g.title, description: g.description ?? null,
            targetAmountUsd: g.targetAmountUsd, currentAmountUsd: g.currentAmountUsd,
            deadline: g.deadline ? new Date(g.deadline).toISOString() : null, status: g.status,
            coverImage: g.coverImage ?? null,
          }))}
          supportGift={creator.supportGift ? {
            isActive: creator.supportGift.isActive,
            presetAmounts: (() => { try { return JSON.parse(creator.supportGift.presetAmounts) } catch { return [3,5,10,25] } })(),
            thankYouMessage: creator.supportGift.thankYouMessage,
            giftCount: creator.supportGift.giftCount,
            monthlyGiftCount: creator.supportGift.monthlyGiftCount,
            monthlyGifterCount: creator.supportGift.monthlyGifterCount,
          } : null}
          podProviders={(creator.podProviders ?? []).map(p => ({
            id: p.id, name: p.name, customName: p.customName ?? null,
            storeUrl: p.storeUrl ?? null, notes: p.notes ?? null,
            isDefault: p.isDefault, defaultProductionDays: p.defaultProductionDays,
            shippingMY: p.shippingMY, shippingSG: p.shippingSG,
            shippingPH: p.shippingPH, shippingIntl: p.shippingIntl,
          }))}
          guestbookEntries={guestbookEntries.map(e => ({
            id: e.id,
            content: e.content,
            rating: e.rating ?? null,
            createdAt: e.createdAt.toISOString(),
            authorName: e.author.name,
            authorAvatar: e.author.avatar ?? null,
          }))}
          creatorAvatar={creator.avatar ?? null}
          userRole={(session?.user as any)?.role ?? null}
          creatorUserId={creator.user?.id ?? ''}
          sessionUserId={sessionUserId}
          discoveryProducts={discoveryProducts}
          discoveryCreators={discoveryCreators}
          discoveryCommission={discoveryCommission}
          discoveryPortfolio={discoveryPortfolio}
          discoveryVideos={discoveryVideos}
          discoverySupport={discoverySupport}
        />
      </div>

      {relatedCreators.length >= 2 && (
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
          <h2 className="text-lg font-bold text-foreground mb-5">Fans of this store also love</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {relatedCreators.map(c => (
              <a key={c.username} href={`/creator/${c.username}`} className="group flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border hover:border-primary/40 transition-colors text-center">
                {c.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.avatar} alt={c.displayName} className="size-14 rounded-full object-cover border-2 border-border group-hover:border-primary transition-colors" />
                ) : (
                  <div className="size-14 rounded-full bg-primary/20 flex items-center justify-center text-xl font-bold text-primary">
                    {c.displayName.slice(0, 1)}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                    {c.displayName}{c.isVerified && <span className="ml-1 text-xs text-secondary">✓</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">@{c.username}</p>
                </div>
                <span className="mt-auto text-xs font-medium text-primary border border-primary/30 rounded-lg px-3 py-1 group-hover:bg-primary/10 transition-colors">
                  View Store
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Creator popup — only when popupEnabled */}
      {creator.popupEnabled && creator.popupTitle && creator.popupCtaText && creator.popupCtaLink && (
        <CreatorPopup
          username={creator.username}
          displayName={creator.displayName}
          avatar={creator.avatar ?? null}
          popupTitle={creator.popupTitle}
          popupDescription={creator.popupDescription ?? null}
          popupImageUrl={(creator as any).popupImageUrl ?? null}
          popupCtaText={creator.popupCtaText}
          popupCtaLink={creator.popupCtaLink}
          popupBadgeText={creator.popupBadgeText ?? null}
        />
      )}
    </div>
  )
}
