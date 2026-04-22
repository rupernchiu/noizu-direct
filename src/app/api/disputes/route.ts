import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/lib/notifications'
import { getDisputeEligibility } from '@/lib/dispute-eligibility'

// M15: previously `'d' + Math.random().toString(36).slice(2, 27)` — a
// predictable PRNG source for IDs that appear in admin-visible email
// subjects and dispute URLs. Switched to crypto.randomUUID() for an
// unguessable 128-bit identifier. The `d-` prefix is retained so the
// value is still visibly a dispute ID in logs.
function disputeId(): string {
  return 'd-' + randomUUID()
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    orderId: string
    reason: string
    description: string
    evidence?: string[]
  }

  if (!body.orderId || !body.reason || !body.description) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (body.description.length < 50) {
    return NextResponse.json({ error: 'Description must be at least 50 characters' }, { status: 400 })
  }

  const order = await prisma.order.findUnique({
    where: { id: body.orderId },
    include: {
      product: { select: { type: true, title: true } },
      dispute: { select: { id: true } },
    },
  })

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  if (order.buyerId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (order.dispute) {
    return NextResponse.json(
      { error: 'A dispute already exists for this order', disputeId: order.dispute.id },
      { status: 409 },
    )
  }

  const eligibility = getDisputeEligibility(order)
  if (eligibility.status !== 'eligible') {
    return NextResponse.json(
      { error: 'This order is not eligible for a dispute at this time' },
      { status: 422 },
    )
  }

  const dispute = await prisma.$transaction(async (tx) => {
    const d = await tx.dispute.create({
      data: {
        id: disputeId(),
        orderId: body.orderId,
        raisedBy: session.user!.id!,
        reason: body.reason,
        description: body.description,
        evidence: JSON.stringify(body.evidence ?? []),
      },
    })
    await tx.order.update({ where: { id: body.orderId }, data: { escrowStatus: 'DISPUTED' } })
    return d
  })

  // Notify creator
  await createNotification(
    order.creatorId,
    'DISPUTE_RAISED',
    'Dispute raised on your order',
    `A buyer has raised a dispute for "${order.product.title}". Please respond within 48 hours.`,
    body.orderId,
    `/dashboard/orders/${body.orderId}`,
  )

  // Notify buyer (confirmation)
  await createNotification(
    session.user!.id!,
    'DISPUTE_RAISED',
    'Dispute submitted successfully',
    `Your dispute for "${order.product.title}" has been submitted. We'll review within 2 business days.`,
    body.orderId,
    `/account/disputes/${dispute.id}`,
  )

  // Notify admin
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
  if (admin) {
    await createNotification(
      admin.id,
      'DISPUTE_RAISED',
      'New dispute filed',
      `A buyer filed a dispute for order #${body.orderId.slice(-8).toUpperCase()}: ${body.reason.replace(/_/g, ' ')}.`,
      body.orderId,
      `/admin/disputes/${dispute.id}`,
    )
  }

  return NextResponse.json({ ok: true, disputeId: dispute.id })
}
