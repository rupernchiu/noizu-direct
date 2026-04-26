// Release one milestone's escrow slice. Used by buyer approval, admin override, and
// the escrow-processor cron (auto-release after the 14-day window).
//
// Bookkeeping mirrors the non-milestone commission release:
//   - write an EscrowTransaction (type=MILESTONE_RELEASE, linked to milestoneId)
//   - write a COMPLETED Transaction for the creator-amount portion (ratio of fee)
//   - mark the milestone releasedAt + COMPLETED
//   - when the LAST milestone releases, also flip the Order to RELEASED/COMPLETED

import { prisma } from '@/lib/prisma'
import { getProcessingFeeRate, feeFromGross } from '@/lib/platform-fees'
import { breakdownFromOrderSnapshot } from '@/lib/fees'
import { createNotification } from '@/lib/notifications'

export async function releaseMilestone(milestoneId: string, performedBy?: string, note?: string) {
  const milestone = await prisma.commissionMilestone.findUniqueOrThrow({
    where: { id: milestoneId },
    include: {
      orderRef: {
        select: {
          id: true, buyerId: true, creatorId: true, amountUsd: true,
          paymentRail: true, subtotalUsd: true, buyerFeeUsd: true,
          creatorCommissionUsd: true, creatorTaxAmountUsd: true,
          creatorTaxRatePercent: true,
          transactions: { where: { status: 'ESCROW' }, take: 1 },
        },
      },
    },
  })
  if (!milestone.orderRef) throw new Error('Milestone has no order')
  if (milestone.releasedAt) return // idempotent

  const order = milestone.orderRef
  const escrowTx = order.transactions[0] // aggregate ESCROW tx created in webhook
  const now = new Date()

  // Proportional fee/creator-amount split — mirrors escrow-processor's partial-release math.
  //
  // Three resolution strategies, most-trusted first:
  //   1. ESCROW transaction exists → take its fee/creator split and apportion
  //      this milestone's share by amount ratio. Always preferred when present
  //      because those numbers are what the buyer was actually charged.
  //   2. No ESCROW tx but the order has the rail-aware snapshot → derive the
  //      milestone slice from the snapshotted commission %. Keeps payouts on
  //      the 5/8 model even when the webhook hasn't materialised the tx yet.
  //   3. Neither: legacy 2.5% feeFromGross.
  let processingFeePortion = 0
  let creatorAmountPortion = milestone.amountUsd
  if (escrowTx) {
    const ratio = milestone.amountUsd / escrowTx.grossAmountUsd
    processingFeePortion = Math.round(escrowTx.processingFee * ratio)
    creatorAmountPortion = Math.round(escrowTx.creatorAmount * ratio)
  } else {
    const snapshot = breakdownFromOrderSnapshot(order)
    if (snapshot && snapshot.grossUsdCents > 0) {
      const ratio = milestone.amountUsd / snapshot.grossUsdCents
      processingFeePortion = Math.round(snapshot.buyerFeeUsdCents * ratio)
      const commissionPortion = Math.round(snapshot.creatorCommissionUsdCents * ratio)
      const taxPortion = Math.round(snapshot.creatorTaxUsdCents * ratio)
      const subtotalPortion = Math.round(snapshot.subtotalUsdCents * ratio)
      creatorAmountPortion = subtotalPortion - commissionPortion - taxPortion
    } else {
      const feeRate = await getProcessingFeeRate()
      processingFeePortion = feeFromGross(milestone.amountUsd, feeRate)
      creatorAmountPortion = milestone.amountUsd - processingFeePortion
    }
  }

  const released = await prisma.$transaction(async (tx) => {
    await tx.commissionMilestone.update({
      where: { id: milestoneId },
      data: { status: 'COMPLETED', approvedAt: now, releasedAt: now },
    })
    await tx.escrowTransaction.create({
      data: {
        id: `et_${Math.random().toString(36).slice(2)}`,
        orderId: order.id,
        milestoneId,
        type: 'MILESTONE_RELEASE',
        amount: milestone.amountUsd,
        note: note ?? 'Milestone released',
        performedBy,
      },
    })
    await tx.transaction.create({
      data: {
        orderId: order.id,
        buyerId: order.buyerId,
        creatorId: order.creatorId,
        grossAmountUsd: milestone.amountUsd,
        processingFee: processingFeePortion,
        platformFee: 0,
        creatorAmount: creatorAmountPortion,
        status: 'COMPLETED',
      },
    })

    // If this was the last unreleased milestone on the order, close the order out
    const stillOpen = await tx.commissionMilestone.count({
      where: { orderId: order.id, releasedAt: null },
    })
    const finalClose = stillOpen === 0
    if (finalClose) {
      await tx.order.update({
        where: { id: order.id },
        data: {
          escrowStatus: 'RELEASED',
          escrowReleasedAt: now,
          status: 'COMPLETED',
          commissionStatus: 'COMPLETED',
        },
      })
    }
    return { finalClose }
  })

  await createNotification(
    order.creatorId,
    'ESCROW_RELEASED',
    released.finalClose ? 'Commission completed — final milestone released' : 'Milestone payment released',
    `USD ${(milestone.amountUsd / 100).toFixed(2)} for "${milestone.title}" has been released to your balance.`,
    order.id,
    '/dashboard/orders',
  )
}
