import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { releaseMilestone } from '@/lib/milestone-release'

// POST /api/commissions/milestones/[id]/approve
// Buyer approves a DELIVERED milestone → releases that milestone's escrow slice.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const milestone = await prisma.commissionMilestone.findUnique({
    where: { id },
    include: { orderRef: { select: { id: true, buyerId: true } } },
  })
  if (!milestone) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!milestone.orderRef) return NextResponse.json({ error: 'Milestone not yet tied to an order' }, { status: 400 })
  if (milestone.orderRef.buyerId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (milestone.status !== 'DELIVERED') {
    return NextResponse.json({ error: 'Milestone is not awaiting approval' }, { status: 400 })
  }

  await releaseMilestone(milestone.id, session.user.id, 'Buyer approved milestone')
  return NextResponse.json({ ok: true })
}
