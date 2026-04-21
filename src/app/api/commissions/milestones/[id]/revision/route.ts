import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/lib/notifications'

// POST /api/commissions/milestones/[id]/revision
// Buyer requests a revision on a DELIVERED milestone. Fails if revisions exhausted.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const body = await req.json() as { note: string }
  if (!body.note?.trim() || body.note.length < 10) {
    return NextResponse.json({ error: 'Revision note must be at least 10 characters' }, { status: 400 })
  }

  const milestone = await prisma.commissionMilestone.findUnique({
    where: { id },
    include: { orderRef: { select: { id: true, buyerId: true, creatorId: true } } },
  })
  if (!milestone) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!milestone.orderRef) return NextResponse.json({ error: 'Milestone not yet tied to an order' }, { status: 400 })
  if (milestone.orderRef.buyerId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (milestone.status !== 'DELIVERED') {
    return NextResponse.json({ error: 'Milestone is not awaiting review' }, { status: 400 })
  }
  if (milestone.revisionsUsed >= milestone.revisionsAllowed) {
    return NextResponse.json({ error: 'No revisions remaining for this milestone' }, { status: 400 })
  }

  await prisma.commissionMilestone.update({
    where: { id },
    data: {
      status: 'REVISION_REQUESTED',
      revisionsUsed: { increment: 1 },
      revisionNote: body.note.trim().slice(0, 2000),
      // Clear the auto-release clock; creator must re-deliver to restart it
      autoReleaseAt: null,
    },
  })

  await createNotification(
    milestone.orderRef.creatorId,
    'NEW_MESSAGE',
    'Revision requested',
    `Buyer requested a revision on "${milestone.title}". ${milestone.revisionsAllowed - milestone.revisionsUsed - 1} revision(s) remaining.`,
    milestone.orderRef.id,
    `/dashboard/orders/${milestone.orderRef.id}`,
  )

  return NextResponse.json({ ok: true })
}
