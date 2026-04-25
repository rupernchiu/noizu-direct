import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { validateQuote, COMMISSION_QUOTE_TTL_DAYS } from '@/lib/commissions'

// POST /api/commissions/quotes — creator creates a DRAFT quote (standalone or against a request)
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  const profile = await prisma.creatorProfile.findUnique({
    where: { userId },
    select: { id: true, isSuspended: true, commissionStatus: true },
  })
  if (!profile) return NextResponse.json({ error: 'Only creators can issue quotes' }, { status: 403 })
  if (profile.isSuspended) return NextResponse.json({ error: 'Account suspended' }, { status: 403 })

  const body = await req.json() as {
    requestId?: string
    buyerId?: string
    buyerEmail?: string // alternative to buyerId for standalone quotes
    title: string
    description: string
    amountUsd: number
    depositPercent: number
    revisionsIncluded: number
    turnaroundDays: number
    termsText?: string
    isMilestoneBased?: boolean
    milestones?: { title: string; description?: string; amountUsd: number }[]
  }

  if (!body.title?.trim() || !body.description?.trim()) {
    return NextResponse.json({ error: 'Title and description required' }, { status: 400 })
  }

  let buyerId = body.buyerId
  if (body.requestId) {
    const request = await prisma.commissionRequest.findUnique({ where: { id: body.requestId } })
    if (!request) return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    if (request.creatorId !== profile.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (!['PENDING', 'QUOTED'].includes(request.status)) {
      return NextResponse.json({ error: 'Request is no longer open' }, { status: 400 })
    }
    if (request.expiresAt && request.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Request has expired — buyer must resubmit' }, { status: 400 })
    }
    buyerId = request.buyerId
  } else if (!buyerId && body.buyerEmail?.trim()) {
    const email = body.buyerEmail.trim().toLowerCase()
    const found = await prisma.user.findUnique({ where: { email }, select: { id: true } })
    if (!found) return NextResponse.json({ error: 'Buyer not found — check the email address' }, { status: 404 })
    buyerId = found.id
  }
  if (!buyerId) return NextResponse.json({ error: 'Buyer email or request required' }, { status: 400 })

  const buyer = await prisma.user.findUnique({ where: { id: buyerId }, select: { id: true } })
  if (!buyer) return NextResponse.json({ error: 'Buyer not found' }, { status: 404 })

  const err = validateQuote({
    amountUsd: body.amountUsd,
    depositPercent: body.depositPercent,
    revisionsIncluded: body.revisionsIncluded,
    turnaroundDays: body.turnaroundDays,
    isMilestoneBased: !!body.isMilestoneBased,
    milestones: body.milestones,
  })
  if (err) return NextResponse.json({ error: err }, { status: 400 })

  const quote = await prisma.$transaction(async (tx) => {
    const q = await tx.commissionQuote.create({
      data: {
        requestId: body.requestId ?? null,
        creatorId: profile.id,
        buyerId: buyerId!,
        title: body.title.trim(),
        description: body.description.trim(),
        amountUsd: body.amountUsd,
        depositPercent: body.depositPercent,
        revisionsIncluded: body.revisionsIncluded,
        turnaroundDays: body.turnaroundDays,
        termsText: body.termsText?.trim() || null,
        isMilestoneBased: !!body.isMilestoneBased,
        status: 'DRAFT',
        expiresAt: new Date(Date.now() + COMMISSION_QUOTE_TTL_DAYS * 24 * 60 * 60 * 1000),
      },
    })
    if (body.isMilestoneBased && body.milestones) {
      for (let i = 0; i < body.milestones.length; i++) {
        const m = body.milestones[i]
        await tx.commissionMilestone.create({
          data: {
            quoteId: q.id,
            order: i,
            title: m.title.trim(),
            description: m.description?.trim() || null,
            amountUsd: m.amountUsd,
            revisionsAllowed: 1,
          },
        })
      }
    }
    return q
  })

  return NextResponse.json({ ok: true, quoteId: quote.id })
}

// GET /api/commissions/quotes — list quotes (role-aware)
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  const url = new URL(req.url)
  const statusFilter = url.searchParams.get('status') ?? undefined
  const view = url.searchParams.get('view') ?? 'buyer'

  // Sweep: any SENT quote past its expiresAt is flipped to EXPIRED before we list.
  // Cheap idempotent updateMany; avoids stale "live" rows in the buyer/creator view.
  await prisma.commissionQuote.updateMany({
    where: { status: 'SENT', expiresAt: { lt: new Date() } },
    data: { status: 'EXPIRED' },
  })

  if (view === 'creator') {
    const profile = await prisma.creatorProfile.findUnique({ where: { userId }, select: { id: true } })
    if (!profile) return NextResponse.json({ quotes: [] })
    const quotes = await prisma.commissionQuote.findMany({
      where: { creatorId: profile.id, ...(statusFilter ? { status: statusFilter } : {}) },
      orderBy: { createdAt: 'desc' },
      include: {
        buyer: { select: { id: true, name: true, avatar: true } },
        milestones: { orderBy: { order: 'asc' } },
      },
    })
    return NextResponse.json({ quotes })
  }

  const quotes = await prisma.commissionQuote.findMany({
    where: {
      buyerId: userId,
      status: { notIn: ['DRAFT'] }, // buyers never see drafts
      ...(statusFilter ? { status: statusFilter } : {}),
    },
    orderBy: { createdAt: 'desc' },
    include: {
      creator: { select: { id: true, username: true, user: { select: { name: true, avatar: true } } } },
      milestones: { orderBy: { order: 'asc' } },
    },
  })
  return NextResponse.json({ quotes })
}
