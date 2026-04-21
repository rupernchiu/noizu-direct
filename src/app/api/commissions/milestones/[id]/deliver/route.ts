import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/lib/notifications'
import { MILESTONE_AUTO_RELEASE_DAYS } from '@/lib/commissions'

// POST /api/commissions/milestones/[id]/deliver
// Creator marks a milestone as DELIVERED; starts the 14-day buyer acceptance window.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const body = await req.json() as {
    deliveryNote?: string
    deliveryFiles?: { key: string; filename: string; size: number; mime: string }[]
  }

  const milestone = await prisma.commissionMilestone.findUnique({
    where: { id },
    include: {
      orderRef: { select: { id: true, buyerId: true, creatorId: true, commissionStatus: true } },
      quote: { select: { title: true } },
    },
  })
  if (!milestone) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!milestone.orderRef) return NextResponse.json({ error: 'Milestone not yet tied to an order' }, { status: 400 })
  if (milestone.orderRef.creatorId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (milestone.orderRef.commissionStatus === 'COMPLETED') {
    return NextResponse.json({ error: 'Order is already completed' }, { status: 400 })
  }
  if (!['PENDING', 'IN_PROGRESS', 'REVISION_REQUESTED'].includes(milestone.status)) {
    return NextResponse.json({ error: 'Milestone is not in a deliverable state' }, { status: 400 })
  }

  const now = new Date()
  const autoReleaseAt = new Date(now.getTime() + MILESTONE_AUTO_RELEASE_DAYS * 24 * 60 * 60 * 1000)

  await prisma.commissionMilestone.update({
    where: { id },
    data: {
      status: 'DELIVERED',
      deliveredAt: now,
      deliveryNote: body.deliveryNote?.trim() || null,
      deliveryFiles: JSON.stringify(body.deliveryFiles ?? []),
      autoReleaseAt,
    },
  })

  await createNotification(
    milestone.orderRef.buyerId,
    'ORDER_SHIPPED',
    'Milestone delivered',
    `"${milestone.title}" has been delivered. You have ${MILESTONE_AUTO_RELEASE_DAYS} days to review or it will auto-release.`,
    milestone.orderRef.id,
    `/account/orders/${milestone.orderRef.id}`,
  )

  return NextResponse.json({ ok: true, autoReleaseAt })
}
