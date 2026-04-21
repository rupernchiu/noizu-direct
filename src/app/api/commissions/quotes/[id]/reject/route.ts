import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/lib/notifications'

// POST /api/commissions/quotes/[id]/reject — buyer rejects a SENT quote
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const body = await req.json().catch(() => ({})) as { reason?: string }
  const reason = (body.reason ?? '').trim().slice(0, 500)

  const quote = await prisma.commissionQuote.findUnique({
    where: { id },
    include: { creator: { select: { userId: true } } },
  })
  if (!quote) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (quote.buyerId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (quote.status !== 'SENT') return NextResponse.json({ error: 'Quote is not rejectable' }, { status: 400 })

  await prisma.commissionQuote.update({
    where: { id },
    data: {
      status: 'REJECTED',
      rejectedAt: new Date(),
      rejectionReason: reason || null,
    },
  })

  await createNotification(
    quote.creator.userId,
    'ORDER_CANCELLED',
    'Quote rejected',
    reason
      ? `Your quote "${quote.title}" was rejected. Reason: ${reason}`
      : `Your quote "${quote.title}" was rejected by the buyer.`,
    undefined,
    `/dashboard/commissions/quotes/${quote.id}`,
  )

  return NextResponse.json({ ok: true })
}
