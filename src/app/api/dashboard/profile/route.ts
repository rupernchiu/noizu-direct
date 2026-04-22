import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireCreator } from '@/lib/guards'
import { prisma } from '@/lib/prisma'
import { invalidateCache, CACHE_KEYS } from '@/lib/redis'
import { rateLimit, rateLimitHeaders } from '@/lib/rate-limit'

const USERNAME_REGEX = /^[a-z0-9_]{3,30}$/

// H13 — mass-assignment mitigation. We previously spread the body into
// prisma.update, which meant any future non-user-writable field added to
// CreatorProfile (boostMultiplier, isVerified, isSuspended, payoutDetails…)
// would silently become attacker-controlled. Define a strict allow-list
// here; any field not listed is ignored.
//
// URL-bearing fields (socialLinks values, portfolioItems.imageUrl) are
// validated with z.string().url() and a `^https?://` refinement so that
// `javascript:` / `data:` URIs can't be persisted and later rendered as
// href={userInput} on the creator page (H17 server-side).

const httpUrl = z
  .string()
  .trim()
  .url('Must be a valid URL')
  .refine((u) => /^https?:\/\//i.test(u), 'URL must start with http:// or https://')
  .max(2048)

const socialLinksSchema = z
  .record(z.string().max(32), z.union([httpUrl, z.literal('')]))

const portfolioItemSchema = z.object({
  id: z.string().max(128),
  title: z.string().max(200),
  description: z.string().max(2000),
  category: z.string().max(100),
  imageUrl: z.union([httpUrl, z.literal('')]),
  isPublic: z.boolean(),
})

const commissionPricingItemSchema = z.object({
  tier: z.string().max(100),
  price: z.number().int().nonnegative(),
  description: z.string().max(1000),
})

const sectionOrderItemSchema = z.object({
  name: z.string().max(64),
  visible: z.boolean(),
})

const updateSchema = z.object({
  displayName: z.string().trim().min(1).max(60).optional(),
  bio: z.string().max(2000).optional(),
  commissionStatus: z.enum(['OPEN', 'CLOSED', 'LIMITED']).optional(),
  announcementText: z.string().max(500).optional(),
  announcementActive: z.boolean().optional(),
  absorbProcessingFee: z.boolean().optional(),
  avatar: z.string().max(2048).optional(),
  bannerImage: z.string().max(2048).optional(),
  logoImage: z.string().max(2048).optional(),
  categoryTags: z.array(z.string().max(64)).max(30).optional(),
  socialLinks: socialLinksSchema.optional(),
  portfolioItems: z.array(portfolioItemSchema).max(60).optional(),
  commissionSlots: z.number().int().nonnegative().nullable().optional(),
  commissionDescription: z.string().max(5000).nullable().optional(),
  commissionTerms: z.string().max(5000).nullable().optional(),
  commissionPricing: z.array(commissionPricingItemSchema).max(20).optional(),
  username: z.string().min(3).max(30).optional(),
  themeColor: z.string().max(32).nullable().optional(),
  notifPrefs: z.record(z.string().max(64), z.unknown()).optional(),
  sectionOrder: z.array(sectionOrderItemSchema).max(30).optional(),
  featuredProductIds: z.array(z.string().max(128)).max(30).optional(),
}).strict()

export async function PATCH(req: Request) {
  const session = await requireCreator()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string

  // M11 — username enumeration. We keep the 409 response (the form's
  // realtime uniqueness UX depends on it) but throttle profile updates so
  // an attacker can't walk the username space via this endpoint.
  const rl = await rateLimit('dashboard-profile', userId, 10, 3600)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many profile updates. Please try again later.' },
      { status: 429, headers: rateLimitHeaders(rl, 10) },
    )
  }

  const profile = await prisma.creatorProfile.findUnique({ where: { userId } })
  if (!profile) return NextResponse.json({ error: 'No creator profile' }, { status: 404 })

  const json = await req.json().catch(() => null)
  const parsed = updateSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', issues: parsed.error.flatten() },
      { status: 400 },
    )
  }
  const body = parsed.data

  // Validate username if changing
  if (body.username !== undefined) {
    if (!USERNAME_REGEX.test(body.username)) {
      return NextResponse.json(
        { error: 'Username must be 3–30 characters: lowercase letters, numbers, underscores only' },
        { status: 400 }
      )
    }
    const existing = await prisma.creatorProfile.findFirst({ where: { username: body.username } })
    if (existing && existing.userId !== userId) {
      return NextResponse.json({ error: 'Username is already taken' }, { status: 409 })
    }
  }

  const updated = await prisma.creatorProfile.update({
    where: { id: profile.id },
    data: {
      ...(body.displayName !== undefined && { displayName: body.displayName }),
      ...(body.bio !== undefined && { bio: body.bio }),
      ...(body.commissionStatus !== undefined && { commissionStatus: body.commissionStatus }),
      ...(body.announcementText !== undefined && { announcementText: body.announcementText }),
      ...(body.announcementActive !== undefined && { announcementActive: body.announcementActive }),
      ...(body.absorbProcessingFee !== undefined && { absorbProcessingFee: body.absorbProcessingFee }),
      ...(body.avatar !== undefined && { avatar: body.avatar }),
      ...(body.bannerImage !== undefined && { bannerImage: body.bannerImage }),
      ...(body.logoImage !== undefined && { logoImage: body.logoImage }),
      ...(body.categoryTags !== undefined && { categoryTags: JSON.stringify(body.categoryTags) }),
      ...(body.socialLinks !== undefined && { socialLinks: JSON.stringify(body.socialLinks) }),
      ...(body.portfolioItems !== undefined && { portfolioItems: JSON.stringify(body.portfolioItems) }),
      ...(body.commissionSlots !== undefined && { commissionSlots: body.commissionSlots }),
      ...(body.commissionDescription !== undefined && { commissionDescription: body.commissionDescription }),
      ...(body.commissionTerms !== undefined && { commissionTerms: body.commissionTerms }),
      ...(body.commissionPricing !== undefined && { commissionPricing: JSON.stringify(body.commissionPricing) }),
      ...(body.username !== undefined && { username: body.username }),
      ...(body.themeColor !== undefined && { themeColor: body.themeColor }),
      ...(body.notifPrefs !== undefined && { notifPrefs: JSON.stringify(body.notifPrefs) }),
      ...(body.sectionOrder !== undefined && { sectionOrder: JSON.stringify(body.sectionOrder) }),
      ...(body.featuredProductIds !== undefined && { featuredProductIds: JSON.stringify(body.featuredProductIds) }),
    },
  })

  await invalidateCache(CACHE_KEYS.creator(updated.username))
  return NextResponse.json(updated, { headers: rateLimitHeaders(rl, 10) })
}
