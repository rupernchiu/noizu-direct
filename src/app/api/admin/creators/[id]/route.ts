import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/guards'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  // Only allow safe fields
  const allowed: Record<string, unknown> = {}
  if (typeof body.isVerified === 'boolean') allowed.isVerified = body.isVerified
  if (typeof body.isTopCreator === 'boolean') allowed.isTopCreator = body.isTopCreator
  if (typeof body.isSuspended === 'boolean') allowed.isSuspended = body.isSuspended
  if (Array.isArray(body.badges) && body.badges.every((b: unknown) => typeof b === 'string')) {
    allowed.badges = JSON.stringify(body.badges)
  }

  const creator = await prisma.creatorProfile.update({
    where: { id },
    data: allowed,
  })

  return NextResponse.json(creator)
}
