import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { validateQuote } from '@/lib/commissions'

// GET /api/commissions/quotes/[id] — view a quote (creator, buyer, or admin)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id
  const role = (session.user as { role?: string }).role
  const { id } = await params

  const quote = await prisma.commissionQuote.findUnique({
    where: { id },
    include: {
      creator: {
        select: {
          id: true, userId: true, username: true,
          user: { select: { name: true, avatar: true } },
        },
      },
      buyer: { select: { id: true, name: true, email: true, avatar: true } },
      request: { select: { id: true, title: true, briefText: true, referenceImages: true } },
      milestones: { orderBy: { order: 'asc' } },
      order: { select: { id: true, status: true, escrowStatus: true, commissionStatus: true } },
    },
  })
  if (!quote) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isBuyer = quote.buyerId === userId
  const isCreator = quote.creator.userId === userId
  const isAdmin = role === 'ADMIN'
  // Buyers cannot view DRAFT quotes — they don't exist to them yet
  if (quote.status === 'DRAFT' && !isCreator && !isAdmin) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (!isBuyer && !isCreator && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({ quote })
}

// PATCH /api/commissions/quotes/[id] — creator updates a DRAFT quote
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const quote = await prisma.commissionQuote.findUnique({
    where: { id },
    include: { creator: { select: { userId: true } } },
  })
  if (!quote) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (quote.creator.userId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (quote.status !== 'DRAFT') return NextResponse.json({ error: 'Only DRAFT quotes can be edited' }, { status: 400 })

  const body = await req.json() as {
    title?: string
    description?: string
    amountUsd?: number
    depositPercent?: number
    revisionsIncluded?: number
    turnaroundDays?: number
    termsText?: string | null
    isMilestoneBased?: boolean
    milestones?: { title: string; description?: string; amountUsd: number }[]
  }

  const merged = {
    amountUsd:          body.amountUsd          ?? quote.amountUsd,
    depositPercent:     body.depositPercent     ?? quote.depositPercent,
    revisionsIncluded:  body.revisionsIncluded  ?? quote.revisionsIncluded,
    turnaroundDays:     body.turnaroundDays     ?? quote.turnaroundDays,
    isMilestoneBased:   body.isMilestoneBased   ?? quote.isMilestoneBased,
    milestones:         body.milestones,
  }
  const err = validateQuote(merged)
  if (err) return NextResponse.json({ error: err }, { status: 400 })

  await prisma.$transaction(async (tx) => {
    await tx.commissionQuote.update({
      where: { id },
      data: {
        ...(body.title !== undefined ? { title: body.title.trim() } : {}),
        ...(body.description !== undefined ? { description: body.description.trim() } : {}),
        ...(body.amountUsd !== undefined ? { amountUsd: body.amountUsd } : {}),
        ...(body.depositPercent !== undefined ? { depositPercent: body.depositPercent } : {}),
        ...(body.revisionsIncluded !== undefined ? { revisionsIncluded: body.revisionsIncluded } : {}),
        ...(body.turnaroundDays !== undefined ? { turnaroundDays: body.turnaroundDays } : {}),
        ...(body.termsText !== undefined ? { termsText: body.termsText?.trim() || null } : {}),
        ...(body.isMilestoneBased !== undefined ? { isMilestoneBased: body.isMilestoneBased } : {}),
      },
    })
    if (body.milestones !== undefined) {
      await tx.commissionMilestone.deleteMany({ where: { quoteId: id } })
      if (merged.isMilestoneBased) {
        for (let i = 0; i < body.milestones.length; i++) {
          const m = body.milestones[i]
          await tx.commissionMilestone.create({
            data: {
              quoteId: id,
              order: i,
              title: m.title.trim(),
              description: m.description?.trim() || null,
              amountUsd: m.amountUsd,
              revisionsAllowed: 1,
            },
          })
        }
      }
    }
  })

  return NextResponse.json({ ok: true })
}

// DELETE /api/commissions/quotes/[id] — creator withdraws a DRAFT or SENT quote
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const quote = await prisma.commissionQuote.findUnique({
    where: { id },
    include: { creator: { select: { userId: true } } },
  })
  if (!quote) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (quote.creator.userId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!['DRAFT', 'SENT'].includes(quote.status)) {
    return NextResponse.json({ error: 'Quote can no longer be withdrawn' }, { status: 400 })
  }

  if (quote.status === 'DRAFT') {
    await prisma.commissionQuote.delete({ where: { id } })
  } else {
    await prisma.commissionQuote.update({ where: { id }, data: { status: 'WITHDRAWN' } })
  }
  return NextResponse.json({ ok: true })
}
