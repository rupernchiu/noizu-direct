import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ status: 'NONE', reason: null })

    const userId = (session.user as any).id as string
    const application = await prisma.creatorApplication.findFirst({
      where: { userId, status: 'REJECTED' },
      select: { rejectionReason: true, updatedAt: true },
      orderBy: { createdAt: 'desc' },
    })

    if (!application) return NextResponse.json({ status: 'NONE', reason: null })

    return NextResponse.json({
      status: 'REJECTED',
      reason: application.rejectionReason ?? null,
    })
  } catch {
    return NextResponse.json({ status: 'NONE', reason: null })
  }
}
