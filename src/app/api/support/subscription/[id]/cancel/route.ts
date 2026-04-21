import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * Cancel a subscription. Two modes:
 *   - immediate=true → status CANCELED now, no more charges
 *   - default        → sets cancelAtPeriodEnd; stays ACTIVE until currentPeriodEnd,
 *                      cron skips it at next run, flips to CANCELED
 * Standard SaaS cadence: fans keep perks through what they already paid for.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as { id: string }).id
  const { id } = await params

  const body = await req.json().catch(() => ({})) as { immediate?: boolean }

  const sub = await prisma.supportSubscription.findUnique({ where: { id } })
  if (!sub) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (sub.supporterId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (sub.status === 'CANCELED') {
    return NextResponse.json({ error: 'Already canceled' }, { status: 400 })
  }

  if (body.immediate) {
    await prisma.supportSubscription.update({
      where: { id },
      data: { status: 'CANCELED', canceledAt: new Date(), cancelAtPeriodEnd: false },
    })
    return NextResponse.json({ ok: true, effective: 'immediate' })
  }

  await prisma.supportSubscription.update({
    where: { id },
    data: { cancelAtPeriodEnd: true },
  })
  return NextResponse.json({
    ok: true,
    effective: 'period_end',
    currentPeriodEnd: sub.currentPeriodEnd,
  })
}
