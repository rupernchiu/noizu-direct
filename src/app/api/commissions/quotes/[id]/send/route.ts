import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/lib/notifications'
import { COMMISSION_QUOTE_TTL_DAYS } from '@/lib/commissions'

// POST /api/commissions/quotes/[id]/send — creator sends the DRAFT quote to the buyer
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const quote = await prisma.commissionQuote.findUnique({
    where: { id },
    include: {
      creator: { select: { userId: true, user: { select: { name: true } } } },
      milestones: true,
    },
  })
  if (!quote) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (quote.creator.userId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (quote.status !== 'DRAFT') return NextResponse.json({ error: 'Only DRAFT quotes can be sent' }, { status: 400 })
  if (quote.isMilestoneBased && quote.milestones.length < 2) {
    return NextResponse.json({ error: 'Milestone-based quote needs at least 2 milestones' }, { status: 400 })
  }

  const now = new Date()
  const expiresAt = new Date(now.getTime() + COMMISSION_QUOTE_TTL_DAYS * 24 * 60 * 60 * 1000)

  await prisma.$transaction(async (tx) => {
    await tx.commissionQuote.update({
      where: { id },
      data: { status: 'SENT', sentAt: now, expiresAt },
    })
    if (quote.requestId) {
      await tx.commissionRequest.update({
        where: { id: quote.requestId },
        data: { status: 'QUOTED', creatorResponseAt: now },
      })
    }
  })

  const creatorName = quote.creator.user.name ?? 'A creator'
  await createNotification(
    quote.buyerId,
    'NEW_MESSAGE',
    'New commission quote',
    `${creatorName} sent you a quote for "${quote.title}" — USD ${(quote.amountUsd / 100).toFixed(2)}. Review within ${COMMISSION_QUOTE_TTL_DAYS} days.`,
    undefined,
    `/account/commissions/quotes/${quote.id}`,
  )

  return NextResponse.json({ ok: true })
}
