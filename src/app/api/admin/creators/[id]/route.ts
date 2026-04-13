import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()

  // Only allow safe fields
  const allowed: Record<string, unknown> = {}
  if (typeof body.isVerified === 'boolean') allowed.isVerified = body.isVerified
  if (typeof body.isTopCreator === 'boolean') allowed.isTopCreator = body.isTopCreator

  const creator = await prisma.creatorProfile.update({
    where: { id },
    data: allowed,
  })

  return NextResponse.json(creator)
}
