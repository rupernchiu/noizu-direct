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
  if (typeof body.boostMultiplier === 'number' && body.boostMultiplier >= 0 && body.boostMultiplier <= 10) {
    allowed.boostMultiplier = body.boostMultiplier
  }
  if (Array.isArray(body.badges) && body.badges.every((b: unknown) => typeof b === 'string')) {
    allowed.badges = JSON.stringify(body.badges)
  }
  // Health status actions
  const validStatuses = ['ACTIVE', 'IDLE', 'HIATUS', 'FLAGGED']
  if (typeof body.storeStatus === 'string' && validStatuses.includes(body.storeStatus)) {
    allowed.storeStatus = body.storeStatus
    allowed.storeStatusReason = body.storeStatusReason ?? null
    allowed.storeStatusUpdatedAt = new Date()
  }

  const creator = await prisma.creatorProfile.update({
    where: { id },
    data: allowed,
    select: { id: true, username: true, userId: true },
  })

  // Update legalFullName on the User record
  if (typeof body.legalFullName === 'string' && body.legalFullName.trim()) {
    await prisma.user.update({
      where: { id: creator.userId },
      data: { legalFullName: body.legalFullName.trim() },
    })
  }

  // Audit log for health status changes (best-effort)
  if (allowed.storeStatus) {
    const adminEmail = (session.user as any).email as string
    await prisma.auditEvent.create({
      data: {
        actorId: null,
        actorName: `Admin:${adminEmail}`,
        action: 'creator.health_status_change',
        entityType: 'Creator',
        entityId: id,
        entityLabel: creator.username,
        reason: (allowed.storeStatusReason as string | null) ?? undefined,
      },
    }).catch(() => {})
  }

  return NextResponse.json(creator)
}
