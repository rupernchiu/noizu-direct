import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/commissions/requests/[id] — view a request (buyer, assigned creator, or admin)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id
  const role = (session.user as { role?: string }).role
  const { id } = await params

  const request = await prisma.commissionRequest.findUnique({
    where: { id },
    include: {
      buyer: { select: { id: true, name: true, email: true, avatar: true } },
      creator: {
        select: {
          id: true, userId: true, username: true,
          user: { select: { name: true, avatar: true } },
        },
      },
      quotes: {
        orderBy: { createdAt: 'desc' },
        include: { milestones: { orderBy: { order: 'asc' } } },
      },
    },
  })
  if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isBuyer = request.buyerId === userId
  const isCreator = request.creator.userId === userId
  const isAdmin = role === 'ADMIN'
  if (!isBuyer && !isCreator && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({ request })
}

// DELETE /api/commissions/requests/[id] — buyer withdraws a still-open request
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const request = await prisma.commissionRequest.findUnique({ where: { id } })
  if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (request.buyerId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!['PENDING', 'QUOTED'].includes(request.status)) {
    return NextResponse.json({ error: 'Request can no longer be withdrawn' }, { status: 400 })
  }

  await prisma.commissionRequest.update({
    where: { id },
    data: { status: 'WITHDRAWN' },
  })
  // Draft/sent quotes linked to this request are left as-is; creator can see request was withdrawn.

  return NextResponse.json({ ok: true })
}
