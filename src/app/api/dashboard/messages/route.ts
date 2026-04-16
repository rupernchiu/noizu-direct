import { requireCreator } from '@/lib/guards'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await requireCreator()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
