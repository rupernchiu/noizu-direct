/**
 * Discovery scoring — weighted formula mixing base quality, freshness,
 * rotation (lastFeaturedAt), admin boost, and per-user category relevance.
 *
 * All four layers run every request; no background jobs required.
 */

export interface ScoredCreator {
  id: string
  username: string
  displayName: string
  bio: string | null
  avatar: string | null
  bannerImage: string | null
  categoryTags: string
  isVerified: boolean
  isTopCreator: boolean
  totalSales: number
  commissionStatus: string
  boostMultiplier: number
  lastFeaturedAt: Date | null
  createdAt: Date
  _score?: number
}

export interface ScoredProduct {
  id: string
  title: string
  description: string
  price: number
  category: string
  type: string
  images: string
  trendingScore: number
  manualBoost: number
  isPinned: boolean
  isTrendingSuppressed: boolean
  createdAt: Date
  creator: {
    username: string
    displayName: string
    avatar: string | null
    isVerified: boolean
    isTopCreator: boolean
  }
  _score?: number
}

function parseTags(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as string[]) : []
  } catch {
    return []
  }
}

const MS_PER_DAY = 86_400_000

/**
 * Score a single creator.
 * userCategories: categories the logged-in buyer has recently browsed (empty for guests).
 */
export function scoreCreator(creator: ScoredCreator, userCategories: string[], now: Date): number {
  const nowMs = now.getTime()

  // Layer 1 — base quality
  const base =
    (creator.isTopCreator ? 1000 : 0) +
    (creator.isVerified ? 200 : 0) +
    Math.min(creator.totalSales * 0.5, 500) +   // cap at 500 so new creators aren't buried
    (creator.avatar ? 50 : 0) +
    (creator.bannerImage ? 30 : 0)

  // Layer 2 — freshness: new creators (< 90 days) get up to +300
  const ageInDays = (nowMs - new Date(creator.createdAt).getTime()) / MS_PER_DAY
  const freshBoost = Math.max(0, 300 * (1 - ageInDays / 90))

  // Layer 3 — rotation: creators not featured recently get up to +200
  const daysSinceShown = creator.lastFeaturedAt
    ? (nowMs - new Date(creator.lastFeaturedAt).getTime()) / MS_PER_DAY
    : 999
  const rotationBoost = Math.min(200, daysSinceShown * 10)

  // Layer 4 — relevance: boost if tags overlap with user's browsed categories
  const tags = parseTags(creator.categoryTags)
  const relevanceBoost = userCategories.length > 0 && tags.some(t => userCategories.includes(t)) ? 150 : 0

  return (base + freshBoost + rotationBoost + relevanceBoost) * creator.boostMultiplier
}

/**
 * Score a single product.
 * Wraps the existing trendingScore and adds relevance on top.
 */
export function scoreProduct(product: ScoredProduct, userCategories: string[], now: Date): number {
  if (product.isTrendingSuppressed) return -1

  const nowMs = now.getTime()

  // Pinned products always float to the top
  const pinnedBoost = product.isPinned ? 5000 : 0

  // Layer 1 — trending score (already computed by existing cron/algo)
  const trending = product.trendingScore

  // Layer 2 — admin manual boost
  const adminBoost = product.manualBoost

  // Layer 3 — freshness for products < 14 days old
  const ageInDays = (nowMs - new Date(product.createdAt).getTime()) / MS_PER_DAY
  const freshBoost = Math.max(0, 200 * (1 - ageInDays / 14))

  // Layer 4 — relevance
  const relevanceBoost = userCategories.includes(product.category) ? 150 : 0

  return pinnedBoost + trending + adminBoost + freshBoost + relevanceBoost
}

/**
 * Sort creators by discovery score, return a paginated slice.
 * Also returns the IDs of page-1 creators so the caller can update lastFeaturedAt.
 */
export function rankCreators(
  creators: ScoredCreator[],
  userCategories: string[],
  page: number,
  pageSize: number,
): { items: ScoredCreator[]; total: number; page1Ids: string[] } {
  const now = new Date()
  const scored = creators.map(c => ({ ...c, _score: scoreCreator(c, userCategories, now) }))
  scored.sort((a, b) => (b._score ?? 0) - (a._score ?? 0))

  const page1Ids = scored.slice(0, pageSize).map(c => c.id)
  const items = scored.slice((page - 1) * pageSize, page * pageSize)

  return { items, total: creators.length, page1Ids }
}

/**
 * Sort products by discovery score, return a paginated slice.
 */
export function rankProducts(
  products: ScoredProduct[],
  userCategories: string[],
  page: number,
  pageSize: number,
): { items: ScoredProduct[]; total: number } {
  const now = new Date()
  const scored = products.map(p => ({ ...p, _score: scoreProduct(p, userCategories, now) }))
  scored.sort((a, b) => (b._score ?? 0) - (a._score ?? 0))
  const items = scored.slice((page - 1) * pageSize, page * pageSize)
  return { items, total: products.length }
}

/**
 * Derive a user's top category preferences from their recent ProductView records.
 * Returns category strings sorted by view frequency, top 5.
 */
export function deriveCategoryAffinity(
  views: { product: { category: string } }[]
): string[] {
  const counts: Record<string, number> = {}
  for (const v of views) {
    counts[v.product.category] = (counts[v.product.category] ?? 0) + 1
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cat]) => cat)
}
