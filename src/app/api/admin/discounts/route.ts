import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/guards'
import { prisma } from '@/lib/prisma'

// Admin discount-code manager — list + create on behalf of any creator.
// Creator-side endpoint at /api/dashboard/discount-codes is scoped to the
// authenticated creator; this admin one is unrestricted and returns the
// creator displayName + product title alongside each row.

export async function GET(req: Request) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const creatorId = url.searchParams.get('creatorId') ?? undefined
  const status = url.searchParams.get('status') ?? '' // ACTIVE | INACTIVE | EXPIRED | MAXED
  const q = url.searchParams.get('q')?.trim() ?? ''

  const where: any = {}
  if (creatorId) where.creatorId = creatorId
  if (q) where.code = { contains: q.toUpperCase() }
  if (status === 'ACTIVE') where.isActive = true
  if (status === 'INACTIVE') where.isActive = false

  const codes = await prisma.discountCode.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      creator: { select: { id: true, displayName: true } },
      product: { select: { id: true, title: true } },
    },
    take: 200,
  })

  // Post-filter EXPIRED / MAXED in JS — these aren't single columns we can
  // filter on cleanly without raw SQL, and the result set is bounded above.
  const now = new Date()
  const filtered = codes.filter(c => {
    const expired = c.expiresAt !== null && c.expiresAt < now
    const maxed = c.maxUses !== null && c.usedCount >= c.maxUses
    if (status === 'EXPIRED') return expired
    if (status === 'MAXED') return maxed
    return true
  })

  return NextResponse.json({ codes: filtered })
}

export async function POST(req: Request) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await req.json()) as {
    code?: string
    type?: string
    value?: number
    creatorId?: string
    productId?: string
    minimumOrderAmount?: number | null
    maxUses?: number | null
    expiresAt?: string | null
  }

  const code = body.code?.trim().toUpperCase()
  const type = body.type
  const value = body.value
  const creatorId = body.creatorId

  if (!code) return NextResponse.json({ error: 'Code is required' }, { status: 400 })
  if (type !== 'PERCENTAGE' && type !== 'FIXED_AMOUNT') {
    return NextResponse.json({ error: 'Type must be PERCENTAGE or FIXED_AMOUNT' }, { status: 400 })
  }
  if (typeof value !== 'number' || value <= 0) {
    return NextResponse.json({ error: 'Value must be a positive number' }, { status: 400 })
  }
  if (type === 'PERCENTAGE' && value > 100) {
    return NextResponse.json({ error: 'Percentage cannot exceed 100' }, { status: 400 })
  }
  if (!creatorId) return NextResponse.json({ error: 'creatorId is required' }, { status: 400 })

  const creator = await prisma.creatorProfile.findUnique({ where: { id: creatorId }, select: { id: true } })
  if (!creator) return NextResponse.json({ error: 'Creator not found' }, { status: 404 })

  if (body.productId) {
    const product = await prisma.product.findFirst({
      where: { id: body.productId, creatorId: creator.id },
      select: { id: true },
    })
    if (!product) return NextResponse.json({ error: 'Product does not belong to that creator' }, { status: 400 })
  }

  try {
    const created = await prisma.discountCode.create({
      data: {
        code,
        type,
        value,
        creatorId: creator.id,
        productId: body.productId ?? null,
        minimumOrderAmount: body.minimumOrderAmount ?? null,
        maxUses: body.maxUses ?? null,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      },
    })
    return NextResponse.json({ discountCode: created }, { status: 201 })
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return NextResponse.json({ error: 'A code with that name already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create discount code' }, { status: 500 })
  }
}
