import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { markTicketRead } from '@/lib/tickets'

// POST /api/tickets/[id]/read — bump the current user's read marker.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id
  const { id } = await params

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    select: { buyerId: true, creatorId: true },
  })
  if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (ticket.buyerId !== userId && ticket.creatorId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  await markTicketRead(id, userId)
  return NextResponse.json({ ok: true })
}
