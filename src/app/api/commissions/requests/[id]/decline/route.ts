import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/lib/notifications'

// POST /api/commissions/requests/[id]/decline — creator declines a request with optional reason
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const body = await req.json().catch(() => ({})) as { reason?: string }
  const reason = (body.reason ?? '').trim().slice(0, 500)

  const request = await prisma.commissionRequest.findUnique({
    where: { id },
    include: { creator: { select: { userId: true } } },
  })
  if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (request.creator.userId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (request.status !== 'PENDING') {
    return NextResponse.json({ error: 'Request is not in a declinable state' }, { status: 400 })
  }

  await prisma.commissionRequest.update({
    where: { id },
    data: {
      status: 'DECLINED',
      declineReason: reason || null,
      creatorResponseAt: new Date(),
    },
  })

  await createNotification(
    request.buyerId,
    'ORDER_CANCELLED',
    'Commission request declined',
    reason
      ? `Your request "${request.title}" was declined. Reason: ${reason}`
      : `Your request "${request.title}" was declined.`,
    undefined,
    `/account/commissions/requests/${request.id}`,
  )

  return NextResponse.json({ ok: true })
}
