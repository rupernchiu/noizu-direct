import { NextResponse } from 'next/server'
import { requireCreator, unauthorized } from '@/lib/guards'
import { prisma } from '@/lib/prisma'

export async function PATCH() {
  const session = await requireCreator()
  if (!session) return unauthorized()

  const userId = (session.user as any).id as string

  await prisma.creatorProfile.update({
    where: { userId },
    data: { onboardingCompleted: true },
  })

  return NextResponse.json({ ok: true })
}
