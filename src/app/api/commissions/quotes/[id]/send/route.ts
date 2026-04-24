import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/lib/notifications'
import { COMMISSION_QUOTE_TTL_DAYS } from '@/lib/commissions'
import { openOrAttachTicket, TicketBlockedError } from '@/lib/tickets'

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

  try {
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

        // Promote the request's ticket to include the quote link.
        const existing = await tx.ticket.findUnique({
          where: { commissionRequestId: quote.requestId },
          select: { id: true, commissionQuoteId: true },
        })
        if (existing && !existing.commissionQuoteId) {
          await tx.ticket.update({
            where: { id: existing.id },
            data: {
              commissionQuoteId: quote.id,
              kind: 'QUOTE',
              lastMessageAt: now,
              lastCreatorMessageAt: now,
            },
          })
          await tx.ticketMessage.create({
            data: {
              ticketId: existing.id,
              senderId: quote.creator.userId,
              body: `Quote sent: USD ${(quote.amountUsd / 100).toFixed(2)}.`,
              systemKind: 'OPENED',
              createdAt: now,
            },
          })
        }
      } else {
        // Standalone quote (no prior request) — open a fresh ticket.
        await openOrAttachTicket(
          {
            kind: 'QUOTE',
            buyerId: quote.buyerId,
            creatorId: quote.creator.userId,
            subject: `Quote: ${quote.title}`,
            openedById: quote.creator.userId,
            openedAutoSource: 'QUOTE',
            link: { commissionQuoteId: quote.id },
          },
          tx,
        )
      }
    })
  } catch (err) {
    if (err instanceof TicketBlockedError) {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    throw err
  }

  const creatorName = quote.creator.user.name ?? 'A creator'
  await createNotification(
    quote.buyerId,
    'TICKET_OPENED',
    'New commission quote',
    `${creatorName} sent you a quote for "${quote.title}" — USD ${(quote.amountUsd / 100).toFixed(2)}. Review within ${COMMISSION_QUOTE_TTL_DAYS} days.`,
    undefined,
    `/account/commissions/quotes/${quote.id}`,
  )

  return NextResponse.json({ ok: true })
}
