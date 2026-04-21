import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/lib/notifications'
import { COMMISSION_REQUEST_TTL_DAYS } from '@/lib/commissions'

// POST /api/commissions/requests — buyer creates a new request targeted at a creator
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const buyerId = session.user.id

  const body = await req.json() as {
    creatorProfileId: string
    title: string
    briefText: string
    referenceImages?: string[]
    budgetMinUsd?: number
    budgetMaxUsd?: number
    deadlineAt?: string // ISO
  }

  if (!body.creatorProfileId || !body.title?.trim() || !body.briefText?.trim()) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (body.briefText.length < 30) {
    return NextResponse.json({ error: 'Brief must be at least 30 characters' }, { status: 400 })
  }
  if (body.title.length > 140) {
    return NextResponse.json({ error: 'Title is too long' }, { status: 400 })
  }
  if (body.budgetMinUsd !== undefined && body.budgetMaxUsd !== undefined && body.budgetMinUsd > body.budgetMaxUsd) {
    return NextResponse.json({ error: 'Budget min must be ≤ max' }, { status: 400 })
  }

  const creatorProfile = await prisma.creatorProfile.findUnique({
    where: { id: body.creatorProfileId },
    select: { id: true, userId: true, isSuspended: true, commissionStatus: true, user: { select: { name: true } } },
  })
  if (!creatorProfile) return NextResponse.json({ error: 'Creator not found' }, { status: 404 })
  if (creatorProfile.isSuspended) return NextResponse.json({ error: 'Creator is not available' }, { status: 400 })
  if (creatorProfile.userId === buyerId) return NextResponse.json({ error: 'You cannot request from yourself' }, { status: 400 })

  const expiresAt = new Date(Date.now() + COMMISSION_REQUEST_TTL_DAYS * 24 * 60 * 60 * 1000)

  const request = await prisma.commissionRequest.create({
    data: {
      buyerId,
      creatorId: creatorProfile.id,
      title: body.title.trim(),
      briefText: body.briefText.trim(),
      referenceImages: JSON.stringify(body.referenceImages ?? []),
      budgetMinUsd: body.budgetMinUsd ?? null,
      budgetMaxUsd: body.budgetMaxUsd ?? null,
      deadlineAt: body.deadlineAt ? new Date(body.deadlineAt) : null,
      expiresAt,
    },
  })

  await createNotification(
    creatorProfile.userId,
    'NEW_ORDER',
    'New commission request',
    `You have a new commission request: "${request.title}". Respond within ${COMMISSION_REQUEST_TTL_DAYS} days.`,
    undefined,
    `/dashboard/commissions/requests/${request.id}`,
  )

  return NextResponse.json({ ok: true, requestId: request.id })
}

// GET /api/commissions/requests — list requests (role-aware)
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  const url = new URL(req.url)
  const statusFilter = url.searchParams.get('status') ?? undefined
  const view = url.searchParams.get('view') ?? 'buyer' // 'buyer' | 'creator'

  if (view === 'creator') {
    const profile = await prisma.creatorProfile.findUnique({ where: { userId }, select: { id: true } })
    if (!profile) return NextResponse.json({ requests: [] })
    const requests = await prisma.commissionRequest.findMany({
      where: { creatorId: profile.id, ...(statusFilter ? { status: statusFilter } : {}) },
      orderBy: { createdAt: 'desc' },
      include: {
        buyer: { select: { id: true, name: true, avatar: true } },
        quotes: { select: { id: true, status: true, amountUsd: true, sentAt: true } },
      },
    })
    return NextResponse.json({ requests })
  }

  const requests = await prisma.commissionRequest.findMany({
    where: { buyerId: userId, ...(statusFilter ? { status: statusFilter } : {}) },
    orderBy: { createdAt: 'desc' },
    include: {
      creator: { select: { id: true, username: true, user: { select: { name: true, avatar: true } } } },
      quotes: { select: { id: true, status: true, amountUsd: true, sentAt: true } },
    },
  })
  return NextResponse.json({ requests })
}
