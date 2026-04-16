import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/guards'

export async function PATCH(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
