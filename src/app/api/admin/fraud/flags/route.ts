import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/guards'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') ?? 'OPEN'
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1') || 1)
  const perPage = 25

  const where: any = {}
  if (status) where.status = status

  const [total, items] = await Promise.all([
    prisma.fraudFlag.count({ where }),
    prisma.fraudFlag.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
  ])

  return NextResponse.json({ total, page, perPage, items })
}

// H15: the previous implementation took `userId`/`orderId` as free
// strings and wrote them verbatim, creating dangling references that
// broke downstream admin UIs and let a compromised admin (or any authZ
// bug) inject arbitrary IDs. We now require Zod-validated input, verify
// both references exist, and refuse the create on mismatch. At least
// one of `userId`/`orderId` must be supplied so a flag is always
// anchored to a real entity.
const createFlagSchema = z
  .object({
    type: z.enum(['VELOCITY', 'AMOUNT_THRESHOLD', 'CHARGEBACK_PATTERN', 'MANUAL']).default('MANUAL'),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
    description: z.string().min(1).max(2000),
    orderId: z.string().min(1).max(128).optional(),
    userId: z.string().min(1).max(128).optional(),
  })
  .refine((v) => v.orderId || v.userId, {
    message: 'Either orderId or userId must be provided',
    path: ['userId'],
  })

export async function POST(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = createFlagSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', issues: parsed.error.flatten() },
      { status: 400 },
    )
  }
  const { type, severity, description, orderId, userId } = parsed.data

  // Existence checks in parallel — refuse the insert if either reference
  // doesn't resolve. Using findUnique with `select: { id: true }` keeps
  // the round-trip minimal.
  const [userRow, orderRow] = await Promise.all([
    userId
      ? prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
      : Promise.resolve(null),
    orderId
      ? prisma.order.findUnique({ where: { id: orderId }, select: { id: true } })
      : Promise.resolve(null),
  ])

  if (userId && !userRow) {
    return NextResponse.json({ error: 'Referenced user does not exist' }, { status: 400 })
  }
  if (orderId && !orderRow) {
    return NextResponse.json({ error: 'Referenced order does not exist' }, { status: 400 })
  }

  const flag = await prisma.fraudFlag.create({
    data: {
      type,
      severity,
      description,
      orderId: orderId ?? null,
      userId: userId ?? null,
    },
  })

  return NextResponse.json(flag)
}
