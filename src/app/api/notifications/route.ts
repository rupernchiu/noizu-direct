import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const page = parseInt(req.nextUrl.searchParams.get('page') ?? '1')
  const take = 20
  const skip = (page - 1) * take

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    }),
    prisma.notification.count({ where: { userId: session.user.id, isRead: false } }),
  ])

  return NextResponse.json({ notifications, unreadCount, page })
}
