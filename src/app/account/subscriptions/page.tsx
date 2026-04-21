import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { SubscriptionsClient } from './SubscriptionsClient'

/**
 * Fan view of their recurring support — tiers + monthly gifts.
 * Shows next charge date, status badge, and lets them cancel/resume.
 * Historical one-time gifts and goal contributions live under /account/orders
 * instead (they're just transactions, no state to manage).
 */
export default async function AccountSubscriptionsPage() {
  const session = await auth()
  if (!session) redirect('/login')
  const userId = (session.user as { id: string }).id

  const subscriptions = await prisma.supportSubscription.findMany({
    where: { supporterId: userId },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    include: {
      creator: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatar: true,
        },
      },
      tier: {
        select: {
          id: true,
          name: true,
          description: true,
          perks: true,
        },
      },
    },
  })

  const serializable = subscriptions.map(s => ({
    id: s.id,
    type: s.type,
    status: s.status,
    amountUsd: s.amountUsd,
    currency: s.currency,
    cancelAtPeriodEnd: s.cancelAtPeriodEnd,
    currentPeriodStart: s.currentPeriodStart?.toISOString() ?? null,
    currentPeriodEnd: s.currentPeriodEnd?.toISOString() ?? null,
    canceledAt: s.canceledAt?.toISOString() ?? null,
    failedChargeCount: s.failedChargeCount,
    nextRetryAt: s.nextRetryAt?.toISOString() ?? null,
    createdAt: s.createdAt.toISOString(),
    creator: s.creator,
    tier: s.tier ? {
      id: s.tier.id,
      name: s.tier.name,
      description: s.tier.description ?? null,
      perks: (() => { try { return JSON.parse(s.tier.perks) as string[] } catch { return [] } })(),
    } : null,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Subscriptions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your monthly support — {subscriptions.filter(s => s.status === 'ACTIVE').length} active
        </p>
      </div>

      <SubscriptionsClient subscriptions={serializable} />
    </div>
  )
}
