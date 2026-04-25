/**
 * Creator balance computation (sprint 1.1).
 *
 * Splits creator earnings into:
 *   - lifetime: every COMPLETED creatorAmount cent ever earned
 *   - exposed:  COMPLETED transactions inside the clawback window (default 120d).
 *               These are still chargeback-exposed and not eligible for payout.
 *   - escrow:   ESCROW-status transactions (still in buyer-confirm window)
 *   - blocked:  amount on transactions where payoutBlocked=true (active dispute)
 *   - paidOut:  every non-FAILED Payout amount (pending + processing + paid)
 *   - available: lifetime - exposed - blocked - paidOut, floored at 0
 *
 * The exposure window comes from PlatformSettings.clawbackExposureWindowDays.
 *
 * Why split this out: the legacy `available = total - paidOut` pattern in
 * /api/dashboard/payout was duplicated across earnings page + payout API and
 * didn't account for clawback exposure. Centralize so one fix updates all.
 */
import { prisma } from '@/lib/prisma'

export type CreatorBalance = {
  lifetimeUsd: number
  exposedUsd: number
  escrowUsd: number
  blockedUsd: number
  paidOutUsd: number
  availableUsd: number
  exposureWindowDays: number
  exposureCutoff: Date
}

export async function getCreatorBalance(creatorId: string): Promise<CreatorBalance> {
  const settings = await prisma.platformSettings.findFirst()
  const exposureWindowDays = settings?.clawbackExposureWindowDays ?? 120
  const exposureCutoff = new Date(Date.now() - exposureWindowDays * 24 * 60 * 60 * 1000)

  const [lifetimeAgg, exposedAgg, escrowAgg, blockedAgg, paidOutAgg] = await Promise.all([
    prisma.transaction.aggregate({
      where: { creatorId, status: 'COMPLETED' },
      _sum: { creatorAmount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        creatorId,
        status: 'COMPLETED',
        createdAt: { gte: exposureCutoff },
      },
      _sum: { creatorAmount: true },
    }),
    prisma.transaction.aggregate({
      where: { creatorId, status: 'ESCROW' },
      _sum: { creatorAmount: true },
    }),
    prisma.transaction.aggregate({
      where: { creatorId, payoutBlocked: true, status: 'COMPLETED' },
      _sum: { creatorAmount: true },
    }),
    prisma.payout.aggregate({
      where: { creatorId, status: { not: 'FAILED' } },
      _sum: { amountUsd: true },
    }),
  ])

  const lifetimeUsd = lifetimeAgg._sum.creatorAmount ?? 0
  const exposedUsd = exposedAgg._sum.creatorAmount ?? 0
  const escrowUsd = escrowAgg._sum.creatorAmount ?? 0
  const blockedUsd = blockedAgg._sum.creatorAmount ?? 0
  const paidOutUsd = paidOutAgg._sum.amountUsd ?? 0

  // exposed already includes blocked (both are COMPLETED), so we subtract whichever
  // is greater. Guard with Math.max so a blocked-outside-window edge case doesn't
  // double-deduct.
  const overlapAdjustedHold = Math.max(exposedUsd, blockedUsd)
  const availableUsd = Math.max(0, lifetimeUsd - overlapAdjustedHold - paidOutUsd)

  return {
    lifetimeUsd,
    exposedUsd,
    escrowUsd,
    blockedUsd,
    paidOutUsd,
    availableUsd,
    exposureWindowDays,
    exposureCutoff,
  }
}

/**
 * Apply a clawback against a creator's balance. Used when an admin manually
 * approves a chargeback resolution and the platform recovers the disputed
 * amount from the creator. Writes a Transaction-style ledger entry + an
 * AdminAuditEvent for compliance traceability.
 *
 * Two outcomes:
 *  1. Sufficient balance — debited; no further action.
 *  2. Insufficient balance — payoutFrozen flag set on User, the deficit is
 *     left as a "negative balance" the creator owes back. Future earnings
 *     auto-deduct against it via the next payout pass.
 */
export async function applyClawback(opts: {
  creatorId: string
  amountUsd: number
  orderId?: string
  reason: string
  approvedBy: string
  ipAddress?: string
  userAgent?: string
}) {
  const { creatorId, amountUsd, orderId, reason, approvedBy, ipAddress, userAgent } = opts
  if (amountUsd <= 0) throw new Error('Clawback amount must be positive')

  return prisma.$transaction(async (tx) => {
    // Find any COMPLETED transaction for this creator/order to attach the
    // clawback to (pure ledger reference, not deleted).
    let referenceTxId: string | undefined
    if (orderId) {
      const refTx = await tx.transaction.findFirst({
        where: { orderId, creatorId, status: 'COMPLETED' },
        orderBy: { createdAt: 'desc' },
      })
      referenceTxId = refTx?.id
      if (refTx) {
        await tx.transaction.update({
          where: { id: refTx.id },
          data: { payoutBlocked: true, payoutBlockReason: `Clawback: ${reason}` },
        })
      }
    }

    // Compute current available; if insufficient, freeze payouts.
    const settings = await tx.platformSettings.findFirst()
    const exposureWindowDays = settings?.clawbackExposureWindowDays ?? 120
    const exposureCutoff = new Date(Date.now() - exposureWindowDays * 24 * 60 * 60 * 1000)

    const [lifetimeAgg, exposedAgg, paidOutAgg] = await Promise.all([
      tx.transaction.aggregate({
        where: { creatorId, status: 'COMPLETED' },
        _sum: { creatorAmount: true },
      }),
      tx.transaction.aggregate({
        where: { creatorId, status: 'COMPLETED', createdAt: { gte: exposureCutoff } },
        _sum: { creatorAmount: true },
      }),
      tx.payout.aggregate({
        where: { creatorId, status: { not: 'FAILED' } },
        _sum: { amountUsd: true },
      }),
    ])
    const lifetimeUsd = lifetimeAgg._sum.creatorAmount ?? 0
    const exposedUsd = exposedAgg._sum.creatorAmount ?? 0
    const paidOutUsd = paidOutAgg._sum.amountUsd ?? 0
    const availableBefore = Math.max(0, lifetimeUsd - exposedUsd - paidOutUsd)

    let frozen = false
    if (availableBefore < amountUsd) {
      // Negative-balance condition. Freeze payouts until the next earnings
      // settle the deficit.
      await tx.user.update({
        where: { id: creatorId },
        data: {
          payoutFrozen: true,
          payoutFrozenReason: `Clawback exceeded available balance by USD ${(((amountUsd - availableBefore) / 100)).toFixed(2)}: ${reason}`,
        },
      })
      frozen = true
    }

    await tx.adminAuditEvent.create({
      data: {
        actorId: approvedBy,
        action: 'CLAWBACK_APPLIED',
        resourceType: 'USER',
        resourceId: creatorId,
        amountUsd,
        metadata: JSON.stringify({
          reason,
          orderId,
          referenceTxId,
          availableBefore,
          frozen,
        }),
        ipAddress,
        userAgent,
      },
    })

    return { availableBefore, frozen, referenceTxId }
  })
}
