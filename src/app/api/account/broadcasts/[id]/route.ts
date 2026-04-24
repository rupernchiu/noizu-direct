import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// PATCH /api/account/broadcasts/[id]
// Marks the buyer's own BroadcastNotification row as read. `id` is the
// BroadcastNotification.id (not the Broadcast.id) — ownership is enforced by
// matching recipientId against the session user, so we never leak or mutate
// another user's row.
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string
  const { id } = await params

  const res = await prisma.broadcastNotification.updateMany({
    where: { id, recipientId: userId, readAt: null },
    data: { readAt: new Date() },
  })
  return NextResponse.json({ updated: res.count })
}

// DELETE /api/account/broadcasts/[id]
// Soft delete — hides the buyer's own copy. The Broadcast and other buyers'
// copies are untouched. Retention cron eventually prunes deletedAt rows.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string
  const { id } = await params

  const res = await prisma.broadcastNotification.updateMany({
    where: { id, recipientId: userId, deletedAt: null },
    data: { deletedAt: new Date() },
  })
  return NextResponse.json({ hidden: res.count })
}
