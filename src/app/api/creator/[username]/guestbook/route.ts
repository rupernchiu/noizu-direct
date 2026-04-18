import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type Ctx = { params: Promise<{ username: string }> }

export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any).id as string
  const userRole = (session.user as any).role as string

  if (userRole === 'ADMIN') {
    return NextResponse.json({ error: 'Admins cannot post fan messages' }, { status: 403 })
  }

  const { username } = await params

  const creator = await prisma.creatorProfile.findUnique({
    where: { username },
    include: { user: { select: { id: true } } },
  })

  if (!creator) return NextResponse.json({ error: 'Creator not found' }, { status: 404 })

  if (userId === creator.user.id) {
    return NextResponse.json({ error: 'Cannot post on your own storefront' }, { status: 400 })
  }

  const existing = await prisma.creatorGuestbook.findFirst({
    where: { creatorProfileId: creator.id, authorId: userId },
  })

  if (existing) {
    return NextResponse.json({ error: 'You have already posted a fan message on this storefront' }, { status: 409 })
  }

  const { content, rating } = await req.json() as { content: string; rating?: number }

  if (!content?.trim()) {
    return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 })
  }

  if (content.trim().length > 280) {
    return NextResponse.json({ error: 'Message cannot exceed 280 characters' }, { status: 400 })
  }

  if (rating !== undefined && (typeof rating !== 'number' || rating < 1 || rating > 5 || !Number.isInteger(rating))) {
    return NextResponse.json({ error: 'Rating must be an integer between 1 and 5' }, { status: 400 })
  }

  await prisma.creatorGuestbook.create({
    data: {
      creatorProfileId: creator.id,
      authorId: userId,
      content: content.trim(),
      rating: rating ?? null,
      status: 'PENDING',
      isVisible: false,
    },
  })

  // Notify creator
  await prisma.notification.create({
    data: {
      userId: creator.user.id,
      type: 'NEW_FAN_MESSAGE',
      title: 'New fan message pending approval',
      message: 'A member posted a fan message on your storefront awaiting approval.',
      actionUrl: '/dashboard/reviews/messages',
    },
  })

  return NextResponse.json({ ok: true }, { status: 201 })
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { username } = await params

  const creator = await prisma.creatorProfile.findUnique({
    where: { username },
    select: { id: true },
  })

  if (!creator) return NextResponse.json({ error: 'Creator not found' }, { status: 404 })

  const entries = await prisma.creatorGuestbook.findMany({
    where: { creatorProfileId: creator.id, status: 'APPROVED', isVisible: true },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      content: true,
      rating: true,
      createdAt: true,
      author: { select: { name: true, avatar: true } },
    },
  })

  return NextResponse.json(entries)
}
