import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id as string

  const raw = req.nextUrl.searchParams.get('creatorIds') ?? ''
  const creatorIds = raw.split(',').map((s) => s.trim()).filter(Boolean)

  if (creatorIds.length === 0) return NextResponse.json({})

  try {
    const items = await prisma.creatorFollow.findMany({
      where: { buyerId: userId, creatorId: { in: creatorIds } },
      select: { creatorId: true },
    })
    const followed = new Set(items.map((i) => i.creatorId))
    const result: Record<string, boolean> = {}
    for (const id of creatorIds) result[id] = followed.has(id)
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
