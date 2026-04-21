import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * Cancel the user's storage plan. Default: cancelAtPeriodEnd (user keeps plan
 * until currentPeriodEnd, then downgrades to FREE). If the caller passes
 * { immediate: true }, we cancel right now — but only allow this before the
 * first charge has gone through (PENDING subscriptions that never activated).
 */
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as { id: string }).id

  const body = await req.json().catch(() => ({})) as { immediate?: boolean }

  const sub = await prisma.storageSubscription.findUnique({ where: { userId } })
  if (!sub) return NextResponse.json({ error: 'No active storage subscription' }, { status: 404 })
  if (sub.status === 'CANCELED') return NextResponse.json({ error: 'Already canceled' }, { status: 400 })

  if (body.immediate && sub.status === 'PENDING') {
    await prisma.storageSubscription.update({
      where: { userId },
      data: { status: 'CANCELED', canceledAt: new Date() },
    })
    return NextResponse.json({ ok: true, status: 'CANCELED' })
  }

  await prisma.storageSubscription.update({
    where: { userId },
    data: { cancelAtPeriodEnd: true },
  })
  return NextResponse.json({
    ok: true,
    status: sub.status,
    cancelAtPeriodEnd: true,
    currentPeriodEnd: sub.currentPeriodEnd,
  })
}
