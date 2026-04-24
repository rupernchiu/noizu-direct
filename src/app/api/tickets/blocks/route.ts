import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Creator-only block list: which buyers I've blocked from opening tickets with me.

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const blocks = await prisma.userBlock.findMany({
    where: { blockerId: session.user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      blocked: { select: { id: true, name: true, avatar: true, email: true } },
    },
  })
  return NextResponse.json({
    blocks: blocks.map((b) => ({
      id: b.id,
      reason: b.reason,
      createdAt: b.createdAt,
      user: b.blocked,
    })),
  })
}

const schema = z.object({
  userId: z.string().min(1).max(128),
  reason: z.string().trim().max(300).optional(),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const blockerId = session.user.id

  const json = await req.json().catch(() => null)
  const parsed = schema.safeParse(json)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  if (parsed.data.userId === blockerId) {
    return NextResponse.json({ error: 'Cannot block yourself.' }, { status: 400 })
  }

  const target = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: { id: true },
  })
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const block = await prisma.userBlock.upsert({
    where: { blockerId_blockedId: { blockerId, blockedId: parsed.data.userId } },
    update: { reason: parsed.data.reason ?? null },
    create: { blockerId, blockedId: parsed.data.userId, reason: parsed.data.reason ?? null },
  })

  return NextResponse.json({ block })
}
