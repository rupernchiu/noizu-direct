/**
 * Idempotent storage subscription period roller.
 *
 * Both the renewals cron and the airwallex webhook can drive a successful
 * payment to "roll" the subscription forward by 30 days. To stop them
 * double-rolling when both fire (e.g., the cron's synchronous confirmation
 * succeeds AND the webhook's payment_intent.succeeded arrives), the period
 * advance is gated by a CAS-style updateMany keyed on the *current*
 * currentPeriodEnd. Whoever lands second sees count=0 and no-ops.
 */
import { prisma } from '@/lib/prisma'

export async function rollStorageRenewalPeriod(
  subId: string,
  now: Date,
): Promise<{ rolled: boolean }> {
  const sub = await prisma.storageSubscription.findUnique({ where: { id: subId } })
  if (!sub) return { rolled: false }
  if (!sub.currentPeriodEnd) return { rolled: false }
  if (sub.currentPeriodEnd > now) return { rolled: false }

  const oldEnd = sub.currentPeriodEnd
  const newEnd = new Date(oldEnd.getTime() + 30 * 24 * 60 * 60 * 1000)

  const result = await prisma.storageSubscription.updateMany({
    where: { id: subId, currentPeriodEnd: oldEnd },
    data: {
      status: 'ACTIVE',
      currentPeriodStart: oldEnd,
      currentPeriodEnd: newEnd,
      lastChargedAt: now,
      failedChargeCount: 0,
      nextRetryAt: null,
    },
  })
  if (result.count === 0) return { rolled: false }

  await prisma.user.update({
    where: { id: sub.userId },
    data: { storagePlan: sub.plan, storagePlanRenewsAt: newEnd },
  })
  return { rolled: true }
}
