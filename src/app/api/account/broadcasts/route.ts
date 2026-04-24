import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/account/broadcasts
// Buyer's feed — returns BroadcastNotification rows joined with the underlying
// Broadcast, newest first. Excludes soft-deleted rows (buyer hid them).
//
// Pagination: cursor-based on notification.createdAt,id for stability under
// concurrent inserts.
export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string

  const url = new URL(req.url)
  const take = Math.min(Math.max(Number(url.searchParams.get('take') ?? 20) || 20, 1), 50)
  const cursor = url.searchParams.get('cursor')

  const rows = await prisma.broadcastNotification.findMany({
    where: { recipientId: userId, deletedAt: null },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      readAt: true,
      createdAt: true,
      broadcast: {
        select: {
          id: true,
          title: true,
          body: true,
          template: true,
          audience: true,
          imageKey: true,
          ctaText: true,
          ctaUrl: true,
          createdAt: true,
          creator: {
            select: {
              username: true,
              displayName: true,
              avatar: true,
            },
          },
        },
      },
    },
  })

  const hasMore = rows.length > take
  const page = hasMore ? rows.slice(0, take) : rows
  const nextCursor = hasMore ? page[page.length - 1]?.id ?? null : null

  return NextResponse.json({
    items: page.map(r => ({
      notificationId: r.id,
      readAt: r.readAt,
      createdAt: r.createdAt,
      broadcast: r.broadcast,
    })),
    nextCursor,
  })
}
