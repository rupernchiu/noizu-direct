import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id

  const conversations = await prisma.conversation.findMany({
    where: { buyerId: userId },
    orderBy: { lastMessageAt: 'desc' },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          creatorProfile: { select: { username: true, displayName: true, avatar: true } },
        },
      },
    },
  })

  // Augment with unread count and last message
  const augmented = await Promise.all(
    conversations.map(async (convo) => {
      const unreadCount = await prisma.message.count({
        where: {
          senderId: convo.creatorId,
          receiverId: userId,
          isRead: false,
        },
      })
      const lastMessage = await prisma.message.findFirst({
        where: {
          OR: [
            { senderId: userId, receiverId: convo.creatorId },
            { senderId: convo.creatorId, receiverId: userId },
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

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id

  const { receiverId, content, orderId } = await req.json() as {
    receiverId: string
    content: string
    orderId?: string
  }

  if (!receiverId || !content?.trim()) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const now = new Date()

  const message = await prisma.message.create({
    data: {
      senderId: userId,
      receiverId,
      content: content.trim(),
      orderId: orderId ?? null,
      createdAt: now,
    },
  })

  // Upsert conversation
  await prisma.conversation.upsert({
    where: { buyerId_creatorId: { buyerId: userId, creatorId: receiverId } },
    update: { lastMessageAt: now },
    create: { buyerId: userId, creatorId: receiverId, lastMessageAt: now },
  })

  return NextResponse.json(message)
}
