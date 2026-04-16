import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ isNewlyApproved: false })
    if ((session.user as any).role !== 'CREATOR') return NextResponse.json({ isNewlyApproved: false })

    const userId = (session.user as any).id as string
    const profile = await prisma.creatorProfile.findUnique({
      where: { userId },
      select: { createdAt: true },
    })

    if (!profile) return NextResponse.json({ isNewlyApproved: false })

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const isNewlyApproved = profile.createdAt > thirtyDaysAgo

    return NextResponse.json({ isNewlyApproved, createdAt: profile.createdAt.toISOString() })
  } catch {
    return NextResponse.json({ isNewlyApproved: false })
  }
}
