import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { rateLimit, rateLimitHeaders } from '@/lib/rate-limit'

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

// H12 — DM abuse mitigation.
//  * Reject self-messaging.
//  * Strict Zod schema with 5000 char cap; reject raw angle brackets so
//    HTML can't be embedded in notifications / downstream renderers.
//  * Require a legitimate conversation context: either (a) an existing
//    Conversation or Message thread between the two users, (b) a prior
//    Order where sender/receiver sit on opposite sides of the transaction,
//    or (c) the receiver is a creator that the sender has a product from
//    currently in cart. Otherwise 403.
//  * Rate-limit new conversations at 5/hour/sender; within an existing
//    thread, 50/hour/sender. Fails CLOSED in prod on Redis failure.
const bodySchema = z.object({
  receiverId: z.string().min(1).max(128),
  content: z.string().trim().min(1, 'Message is empty').max(5000, 'Message too long'),
  orderId: z.string().min(1).max(128).optional(),
})

function hasHtml(s: string): boolean {
  return /[<>]/.test(s)
}

async function hasExistingThread(senderId: string, receiverId: string): Promise<boolean> {
  const convo = await prisma.conversation.findFirst({
    where: {
      OR: [
        { buyerId: senderId, creatorId: receiverId },
        { buyerId: receiverId, creatorId: senderId },
      ],
    },
    select: { id: true },
  })
  if (convo) return true
  const msg = await prisma.message.findFirst({
    where: {
      OR: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId },
      ],
    },
    select: { id: true },
  })
  return Boolean(msg)
}

async function hasOrderRelationship(senderId: string, receiverId: string): Promise<boolean> {
  // The sender bought from the receiver's creator profile.
  const receiverCreator = await prisma.creatorProfile.findUnique({
    where: { userId: receiverId },
    select: { id: true },
  })
  if (receiverCreator) {
    const order = await prisma.order.findFirst({
      where: { buyerId: senderId, creatorId: receiverCreator.id },
      select: { id: true },
    })
    if (order) return true
  }
  // The sender is a creator the receiver bought from.
  const senderCreator = await prisma.creatorProfile.findUnique({
    where: { userId: senderId },
    select: { id: true },
  })
  if (senderCreator) {
    const order = await prisma.order.findFirst({
      where: { buyerId: receiverId, creatorId: senderCreator.id },
      select: { id: true },
    })
    if (order) return true
  }
  return false
}

async function hasCartContext(senderId: string, receiverId: string): Promise<boolean> {
  // Sender has a product authored by receiver's creator profile in cart.
  const receiverCreator = await prisma.creatorProfile.findUnique({
    where: { userId: receiverId },
    select: { id: true },
  })
  if (!receiverCreator) return false
  const cartItem = await prisma.cartItem.findFirst({
    where: {
      buyerId: senderId,
      product: { creatorId: receiverCreator.id },
    },
    select: { id: true },
  })
  return Boolean(cartItem)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string

  const json = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }
  const { receiverId, orderId } = parsed.data
  const content = parsed.data.content.trim()

  if (hasHtml(content)) {
    return NextResponse.json({ error: 'HTML not allowed' }, { status: 400 })
  }
  if (receiverId === userId) {
    return NextResponse.json({ error: 'Cannot message yourself' }, { status: 400 })
  }

  // Context gate — decide if a new conversation is legitimate.
  const threadExists = await hasExistingThread(userId, receiverId)
  let allowed = threadExists
  if (!allowed) {
    allowed = await hasOrderRelationship(userId, receiverId)
  }
  if (!allowed) {
    allowed = await hasCartContext(userId, receiverId)
  }
  if (!allowed) {
    return NextResponse.json(
      { error: 'You can only message users you have an existing order, conversation, or cart relationship with.' },
      { status: 403 },
    )
  }

  // Rate-limit: new conversation is more restrictive than continuing a thread.
  const rlLimit = threadExists ? 50 : 5
  const rlScope = threadExists ? 'messages-reply' : 'messages-new'
  const rl = await rateLimit(rlScope, userId, rlLimit, 3600)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many messages. Please try again later.' },
      { status: 429, headers: rateLimitHeaders(rl, rlLimit) },
    )
  }

  const now = new Date()

  const message = await prisma.message.create({
    data: {
      senderId: userId,
      receiverId,
      content,
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

  return NextResponse.json(message, { headers: rateLimitHeaders(rl, rlLimit) })
}
