import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireCreator } from '@/lib/guards'
import { Prisma } from '@/generated/prisma/client'
import { invalidateCache, invalidatePattern, CACHE_KEYS } from '@/lib/redis'
import { auth } from '@/lib/auth'
import { rankProducts, deriveCategoryAffinity, type ScoredProduct } from '@/lib/discovery'
import { isCreatorOwnedDigitalKey } from '@/lib/upload-validators'

// Strict shape for a creator-supplied digital deliverable. The `.key` field
// MUST live under the caller's own digital/<profileId>/ prefix — this is
// enforced at route level below because the schema can't see profileId.
const digitalFileSchema = z.object({
  key: z.string().min(1),
  filename: z.string().min(1).max(512),
  size: z.number().int().nonnegative(),
  mime: z.string().min(1).max(255),
}).strict()

const DISCOVERY_POOL = 500

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl

  const category = searchParams.get('category') ?? 'ALL'
  const type = searchParams.get('type') ?? ''
  const sort = searchParams.get('sort') ?? 'DISCOVERY'
  const search = searchParams.get('search') ?? ''
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)))

  // Build where clause
  const where: Prisma.ProductWhereInput = {
    isActive: true,
    creator: { storeStatus: 'ACTIVE' },
  }

  if (category && category !== 'ALL') where.category = category
  if (type && type !== 'ALL') where.type = type
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { description: { contains: search } },
    ]
  }

  // DISCOVERY sort: fetch a large pool, score in-memory with user relevance
  if (sort === 'DISCOVERY') {
    const session = await auth()
    const userId = (session?.user as any)?.id as string | undefined

    let userCategories: string[] = []
    if (userId) {
      const recentViews = await prisma.productView.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: { product: { select: { category: true } } },
      })
      userCategories = deriveCategoryAffinity(recentViews)
    }

    const pool = await prisma.product.findMany({
      where,
      take: DISCOVERY_POOL,
      orderBy: [{ isTrendingSuppressed: 'asc' }, { trendingScore: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        title: true,
        description: true,
        price: true,
        category: true,
        type: true,
        images: true,
        stock: true,
        isPinned: true,
        isTrendingSuppressed: true,
        trendingScore: true,
        manualBoost: true,
        createdAt: true,
        creator: {
          select: {
            username: true,
            displayName: true,
            avatar: true,
            isVerified: true,
            isTopCreator: true,
          },
        },
      },
    })

    const { items, total } = rankProducts(pool as ScoredProduct[], userCategories, page, limit)
    return NextResponse.json({ products: items, total, page, totalPages: Math.ceil(total / limit) })
  }

  // Standard sorts — DB-level ordering
  let orderBy: Prisma.ProductOrderByWithRelationInput | Prisma.ProductOrderByWithRelationInput[]
  switch (sort) {
    case 'PRICE_ASC':   orderBy = { price: 'asc' }; break
    case 'PRICE_DESC':  orderBy = { price: 'desc' }; break
    case 'POPULAR':     orderBy = [{ isPinned: 'desc' }, { order: 'asc' }, { createdAt: 'desc' }]; break
    case 'TRENDING':    orderBy = [{ isTrendingSuppressed: 'asc' }, { trendingScore: 'desc' }, { createdAt: 'desc' }]; break
    case 'NEWEST':
    default:            orderBy = { createdAt: 'desc' }; break
  }

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        title: true,
        description: true,
        price: true,
        category: true,
        type: true,
        images: true,
        stock: true,
        isPinned: true,
        createdAt: true,
        creator: {
          select: {
            username: true,
            displayName: true,
            avatar: true,
            isVerified: true,
            isTopCreator: true,
          },
        },
      },
    }),
  ])

  return NextResponse.json({ products, total, page, totalPages: Math.ceil(total / limit) })
}

export async function POST(req: Request) {
  const session = await requireCreator()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string

  const profile = await prisma.creatorProfile.findUnique({ where: { userId } })
  if (!profile) return NextResponse.json({ error: 'No creator profile' }, { status: 400 })

  const body = await req.json() as {
    title: string
    description: string
    price: number
    category: string
    type: string
    images?: string[]
    digitalFiles?: { key: string; filename: string; size: number; mime: string }[]
    stock?: number
    // POD
    podProviderId?: string | null
    baseCost?: number | null
    productionDays?: number | null
    shippingMY?: number | null
    shippingSG?: number | null
    shippingPH?: number | null
    shippingIntl?: number | null
    showProviderPublic?: boolean
    podExternalUrl?: string | null
    // Commission
    commissionDepositPercent?: number | null
    commissionRevisionsIncluded?: number | null
    commissionTurnaroundDays?: number | null
  }

  if (body.type === 'DIGITAL' && (!body.digitalFiles || body.digitalFiles.length === 0)) {
    return NextResponse.json({ error: 'At least one digital file is required' }, { status: 400 })
  }

  // ── C1 (Critical) ─────────────────────────────────────────────────────────
  // Every creator-supplied `digitalFiles[].key` MUST live under this creator's
  // own `digital/<creatorProfile.id>/` prefix. Without this check a creator
  // can list `private/identity/<victim>.webp` as a paid deliverable and the
  // download route will happily sign it.
  if (body.type === 'DIGITAL' && body.digitalFiles) {
    const parsed = z.array(digitalFileSchema).min(1).safeParse(body.digitalFiles)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid digital files payload' }, { status: 400 })
    }
    for (const f of parsed.data) {
      if (!isCreatorOwnedDigitalKey(f.key, profile.id)) {
        return NextResponse.json(
          { error: 'digitalFiles[].key must live under your own digital/<profile>/ prefix' },
          { status: 400 },
        )
      }
    }
  }

  if (body.type === 'POD' && !body.podProviderId) {
    return NextResponse.json({ error: 'A POD provider is required' }, { status: 400 })
  }

  if (body.podProviderId) {
    const provider = await prisma.creatorPodProvider.findFirst({
      where: { id: body.podProviderId, creatorId: profile.id },
    })
    if (!provider) {
      return NextResponse.json({ error: 'Invalid POD provider' }, { status: 400 })
    }
  }

  await Promise.all([
    invalidatePattern('marketplace:*'),
    invalidateCache(CACHE_KEYS.trending, CACHE_KEYS.creator(profile.username)),
  ])

  const toCents = (v: number | null | undefined) =>
    v == null ? null : Math.round(v * 100)

  const product = await prisma.product.create({
    data: {
      creatorId: profile.id,
      title: body.title,
      description: body.description,
      price: Math.round(body.price * 100),
      category: body.category,
      type: body.type,
      images: JSON.stringify(body.images ?? []),
      digitalFiles: body.type === 'DIGITAL' ? JSON.stringify(body.digitalFiles ?? []) : null,
      stock: body.stock ?? null,
      isActive: true,
      // POD
      podProviderId: body.type === 'POD' ? (body.podProviderId ?? null) : null,
      baseCost: body.type === 'POD' ? toCents(body.baseCost) : null,
      productionDays: body.type === 'POD' ? (body.productionDays ?? null) : null,
      shippingMY: body.type === 'POD' ? toCents(body.shippingMY) : null,
      shippingSG: body.type === 'POD' ? toCents(body.shippingSG) : null,
      shippingPH: body.type === 'POD' ? toCents(body.shippingPH) : null,
      shippingIntl: body.type === 'POD' ? toCents(body.shippingIntl) : null,
      showProviderPublic: body.type === 'POD' ? (body.showProviderPublic ?? false) : false,
      podExternalUrl: body.type === 'POD' ? (body.podExternalUrl ?? null) : null,
      // Commission
      commissionDepositPercent:
        body.type === 'COMMISSION' ? (body.commissionDepositPercent ?? 50) : null,
      commissionRevisionsIncluded:
        body.type === 'COMMISSION' ? (body.commissionRevisionsIncluded ?? 2) : null,
      commissionTurnaroundDays:
        body.type === 'COMMISSION' ? (body.commissionTurnaroundDays ?? 14) : null,
    },
  })

  return NextResponse.json(product, { status: 201 })
}
