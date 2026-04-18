import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any).id as string
  const userRole = (session.user as any).role as string

  if (userRole !== 'BUYER') {
    return NextResponse.json({ error: 'Only members can send messages' }, { status: 403 })
  }

  const { username } = await params
  const { content } = await req.json() as { content: string }

  if (!content?.trim()) {
    return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 })
  }

  const creator = await prisma.creatorProfile.findUnique({
    where: { username },
    select: { userId: true },
  })

  if (!creator) return NextResponse.json({ error: 'Creator not found' }, { status: 404 })

  if (creator.userId === userId) {
    return NextResponse.json({ error: 'Cannot message yourself' }, { status: 400 })
  }

  const now = new Date()

  const message = await prisma.message.create({
    data: {
      senderId: userId,
      receiverId: creator.userId,
      content: content.trim(),
      createdAt: now,
    },
  })

  await prisma.conversation.upsert({
    where: { buyerId_creatorId: { buyerId: userId, creatorId: creator.userId } },
    update: { lastMessageAt: now },
    create: { buyerId: userId, creatorId: creator.userId, lastMessageAt: now },
  })

  return NextResponse.json(message, { status: 201 })
}
