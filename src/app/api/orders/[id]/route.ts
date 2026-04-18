import { requireAuth } from '@/lib/guards'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// Status transitions allowed per role:
// CREATOR: PROCESSING → SHIPPED (only when no dedicated tracking route is used)
// ADMIN: any transition
// BUYER: no status changes — buyers use the confirm-receipt endpoint instead
const CREATOR_ALLOWED_STATUSES = new Set(['PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED'])
const ADMIN_ALLOWED_STATUSES   = new Set(['PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'REFUNDED', 'DISPUTED'])

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as { id: string; role?: string }).id
  const role   = (session.user as { id: string; role?: string }).role
  const { id } = await params
  const { status, trackingNumber } = await req.json() as { status?: string; trackingNumber?: string }

  const order = await prisma.order.findUnique({ where: { id } })
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isAdmin   = role === 'ADMIN'
  const isCreator = order.creatorId === userId
  const isBuyer   = order.buyerId   === userId

  if (!isAdmin && !isCreator && !isBuyer) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Buyers cannot update status or tracking via this endpoint
  if (isBuyer && !isAdmin && !isCreator) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Validate status transition
  if (status !== undefined) {
    if (isAdmin && !ADMIN_ALLOWED_STATUSES.has(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    if (isCreator && !isAdmin && !CREATOR_ALLOWED_STATUSES.has(status)) {
      return NextResponse.json({ error: 'Forbidden: invalid status for creator' }, { status: 403 })
    }
    if (isBuyer && !isAdmin && !isCreator) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  // Only creator or admin can set tracking number
  if (trackingNumber !== undefined && !isCreator && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const updated = await prisma.order.update({
    where: { id },
    data: {
      ...(status        !== undefined && { status }),
      ...(trackingNumber !== undefined && { trackingNumber }),
    },
  })
  return NextResponse.json(updated)
}
