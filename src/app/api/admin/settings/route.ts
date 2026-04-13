import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()

  const allowed: Record<string, unknown> = {}
  if (typeof body.processingFeePercent === 'number') allowed.processingFeePercent = body.processingFeePercent
  if (typeof body.platformFeePercent === 'number') allowed.platformFeePercent = body.platformFeePercent
  if (typeof body.withdrawalFeePercent === 'number') allowed.withdrawalFeePercent = body.withdrawalFeePercent
  if (typeof body.topCreatorThreshold === 'number') allowed.topCreatorThreshold = Math.round(body.topCreatorThreshold)

  await prisma.platformSettings.updateMany({ data: allowed })

  const settings = await prisma.platformSettings.findFirst()
  return NextResponse.json(settings)
}
