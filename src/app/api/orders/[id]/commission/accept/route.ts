import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/lib/notifications'
import { getNewCreatorExtraDays } from '@/lib/creator-trust'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const order = await prisma.order.findUnique({ where: { id } })
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (order.creatorId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (order.commissionStatus !== 'PENDING_ACCEPTANCE') {
    return NextResponse.json({ error: 'Commission is not awaiting acceptance' }, { status: 400 })
  }
  if (order.commissionAcceptDeadlineAt && order.commissionAcceptDeadlineAt < new Date()) {
    return NextResponse.json({ error: 'Acceptance window has expired' }, { status: 400 })
  }

  const now = new Date()
  const settings = await prisma.platformSettings.findFirst()
  const baseDays = settings?.commissionEscrowDays ?? 30
  const digitalHours = settings?.digitalEscrowHours ?? 48
  const extraDays = await getNewCreatorExtraDays(order.creatorId)

  // Balance escrow: 30 days after delivery (set when creator delivers, not here)
  // Deposit escrow: 48h after acceptance + new creator modifier (same treatment as digital)
  const depositReleaseMs = (digitalHours * 60 * 60 * 1000) + (extraDays * 24 * 60 * 60 * 1000)
  const depositAutoReleaseAt = new Date(now.getTime() + depositReleaseMs)

  // Balance auto-release is calculated from delivery date — store the base days for later use
  // escrowAutoReleaseAt will be set when creator delivers
  void baseDays

  await prisma.order.update({
    where: { id },
    data: {
      commissionStatus: 'ACCEPTED',
      commissionAcceptedAt: now,
      commissionDepositAutoReleaseAt: depositAutoReleaseAt,
      status: 'PROCESSING',
    },
  })

  await createNotification(
    order.buyerId, 'ORDER_CONFIRMED',
    'Commission accepted',
    `The creator has accepted your commission #${id.slice(-8).toUpperCase()} and will begin work now.`,
    id, `/account/orders/${id}`,
  )

  return NextResponse.json({ ok: true, depositAutoReleaseAt })
}
