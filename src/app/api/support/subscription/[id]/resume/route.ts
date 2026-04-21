import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * Undo a pending cancellation — only works while status is still ACTIVE
 * and cancelAtPeriodEnd is true (i.e. before the period actually ends).
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as { id: string }).id
  const { id } = await params

  const sub = await prisma.supportSubscription.findUnique({ where: { id } })
  if (!sub) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (sub.supporterId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (sub.status !== 'ACTIVE' || !sub.cancelAtPeriodEnd) {
    return NextResponse.json({ error: 'Nothing to resume' }, { status: 400 })
  }

  await prisma.supportSubscription.update({
    where: { id },
    data: { cancelAtPeriodEnd: false },
  })
  return NextResponse.json({ ok: true })
}
