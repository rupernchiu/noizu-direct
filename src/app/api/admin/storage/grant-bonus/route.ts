import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * Admin-only: grant or revoke bonus storage (in MB) for a user.
 * Body: { userId: string, bonusMb: number, reason?: string }
 * If bonusMb is provided as a delta via { deltaMb }, adjust relatively.
 */
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as { role?: string }).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json() as {
    userId: string
    bonusMb?: number
    deltaMb?: number
    reason?: string
  }
  if (!body.userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  if (body.bonusMb == null && body.deltaMb == null) {
    return NextResponse.json({ error: 'bonusMb or deltaMb is required' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { id: body.userId },
    select: { id: true, storageBonusMb: true },
  })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const nextBonus = body.bonusMb != null
    ? Math.max(0, Math.floor(body.bonusMb))
    : Math.max(0, user.storageBonusMb + Math.floor(body.deltaMb!))

  await prisma.user.update({
    where: { id: user.id },
    data: { storageBonusMb: nextBonus },
  })

  await prisma.auditEvent.create({
    data: {
      actorName: session.user.name ?? session.user.email ?? 'admin',
      action: 'storage.grant_bonus',
      entityType: 'User',
      entityId: user.id,
      reason: body.reason ?? (body.bonusMb != null ? `Set bonus to ${nextBonus}MB` : `Adjusted bonus by ${body.deltaMb}MB`),
      entityLabel: `${nextBonus}MB`,
    },
  }).catch(() => {})

  return NextResponse.json({ ok: true, storageBonusMb: nextBonus })
}
