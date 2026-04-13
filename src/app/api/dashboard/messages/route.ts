import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'CREATOR') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const userId = (session.user as any).id as string

  const conversations = await prisma.conversation.findMany({
    where: { creatorId: userId },
    orderBy: { lastMessageAt: 'desc' },
    include: {
      buyer: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  const augmented = await Promise.all(
    conversations.map(async (convo) => {
      const unreadCount = await prisma.message.count({
        where: {
          senderId: convo.buyerId,
          receiverId: userId,
          isRead: false,
        },
      })
      const lastMessage = await prisma.message.findFirst({
        where: {
          OR: [
            { senderId: userId, receiverId: convo.buyerId },
            { senderId: convo.buyerId, receiverId: userId },
          ],
        },
        orderBy: { createdAt: 'desc' },
        select: { content: true, createdAt: true, senderId: true },
      })
      return { ...convo, unreadCount, lastMessage }
    })
  )

  return NextResponse.json(augmented)
}
