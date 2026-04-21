import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUserQuota, getAvailablePlans } from '@/lib/storage-quota'

/**
 * Lightweight usage endpoint — returns user's plan, quota, usage, and subscription
 * status. Heavier breakdown lives at /api/creator/storage.
 */
export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as { id: string }).id

  const [quota, sub, plans] = await Promise.all([
    getUserQuota(userId),
    prisma.storageSubscription.findUnique({
      where: { userId },
      select: {
        plan: true,
        status: true,
        priceCents: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
        cancelAtPeriodEnd: true,
        nextRetryAt: true,
        failedChargeCount: true,
      },
    }),
    getAvailablePlans(),
  ])

  return NextResponse.json({
    plan: quota.plan,
    baseBytes: quota.baseBytes,
    bonusBytes: quota.bonusBytes,
    quotaBytes: quota.quotaBytes,
    usedBytes: quota.usedBytes,
    hardLimitBytes: quota.hardLimitBytes,
    overagePercent: quota.overagePercent,
    isOverSoft: quota.isOverSoft,
    isOverHard: quota.isOverHard,
    subscription: sub,
    availablePlans: plans,
  })
}
