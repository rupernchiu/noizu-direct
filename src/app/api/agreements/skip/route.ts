import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const MAX_SKIPS = 3

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { agreementSkipCount: true },
  })

  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (user.agreementSkipCount >= MAX_SKIPS) {
    return NextResponse.json({ error: 'Skip limit reached', skipCount: user.agreementSkipCount }, { status: 403 })
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: { agreementSkipCount: { increment: 1 } },
    select: { agreementSkipCount: true },
  })

  return NextResponse.json({ ok: true, skipCount: updated.agreementSkipCount })
}
