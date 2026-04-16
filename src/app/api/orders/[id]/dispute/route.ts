import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/lib/notifications'

function cuid() {
  return 'd' + Math.random().toString(36).slice(2, 27)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json() as { reason: string; description: string; evidence?: string[] }

  const order = await prisma.order.findUnique({ where: { id } })
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (order.buyerId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const existing = await prisma.dispute.findUnique({ where: { orderId: id } })
  if (existing) return NextResponse.json({ error: 'Dispute already exists for this order' }, { status: 409 })

  const dispute = await prisma.$transaction(async (tx) => {
    const d = await tx.dispute.create({
      data: {
        id: cuid(),
        orderId: id,
        raisedBy: session.user!.id!,
        reason: body.reason,
        description: body.description,
        evidence: JSON.stringify(body.evidence ?? []),
      },
    })
    await tx.order.update({ where: { id }, data: { escrowStatus: 'DISPUTED' } })
    return d
  })

  await createNotification(
    order.creatorId, 'DISPUTE_RAISED',
    'A buyer has raised a dispute',
    `A dispute has been raised on order #${id.slice(-8).toUpperCase()}. Please respond within 48 hours.`,
    id, `/dashboard/orders/${id}/dispute`,
  )

  return NextResponse.json({ ok: true, disputeId: dispute.id })
}
