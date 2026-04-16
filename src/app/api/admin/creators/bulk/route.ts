import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/guards'

export async function POST(req: Request) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    action: 'verify' | 'suspend' | 'unsuspend' | 'archive'
    ids: string[]
  }

  if (!Array.isArray(body.ids) || body.ids.length === 0) {
    return NextResponse.json({ error: 'ids must be a non-empty array' }, { status: 400 })
  }

  const actionMap: Record<string, Record<string, unknown>> = {
    verify:  { isVerified: true },
    suspend: { isSuspended: true },
    unsuspend: { isSuspended: false },
    archive: { storeStatus: 'HIATUS', storeStatusReason: 'Archived by admin', storeStatusUpdatedAt: new Date() },
  }

  const data = actionMap[body.action]
  if (!data) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const result = await prisma.creatorProfile.updateMany({
    where: { id: { in: body.ids } },
    data,
  })

  return NextResponse.json({ updated: result.count })
}
