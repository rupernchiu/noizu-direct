import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id

  const { conversationId } = await params

  const convo = await prisma.conversation.findUnique({
    where: { id: conversationId },
  })

  if (!convo) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (convo.buyerId !== userId && convo.creatorId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const otherUserId = convo.buyerId === userId ? convo.creatorId : convo.buyerId

  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId },
      ],
    },
    orderBy: { createdAt: 'asc' },
  })

  // Mark messages as read
  await prisma.message.updateMany({
    where: { receiverId: userId, senderId: otherUserId, isRead: false },
    data: { isRead: true },
  })

  return NextResponse.json({ messages, otherUserId, convo })
}
