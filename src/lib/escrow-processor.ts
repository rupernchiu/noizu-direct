import { prisma } from '@/lib/prisma'
import { createNotification } from '@/lib/notifications'
import { releaseMilestone } from '@/lib/milestone-release'
import { createRefund } from '@/lib/airwallex'

const DAY_MS = 24 * 60 * 60 * 1000

/** Called by POST /api/cron/escrow-processor — auto-release + cancellations */
export async function runEscrowProcessor() {
  const now = new Date()
  const results = { released: 0, cancelled: 0, errors: 0 }

  // ── 1. Auto-release physical/POD shipped orders past their release date ──────
  const releasable = await prisma.order.findMany({
    where: {
      escrowStatus: 'TRACKING_ADDED',
      escrowAutoReleaseAt: { lte: now },
    },
    include: { product: true },
  })

  for (const order of releasable) {
    const dispute = await prisma.dispute.findUnique({ where: { orderId: order.id } })
    if (dispute && ['OPEN', 'UNDER_REVIEW'].includes(dispute.status)) continue

    try {
      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: { escrowStatus: 'RELEASED', escrowReleasedAt: now, status: 'COMPLETED' },
        })
        await tx.escrowTransaction.create({
          data: {
            id: `et_${Math.random().toString(36).slice(2)}`,
            orderId: order.id,
            type: 'RELEASE',
            amount: order.amountUsd,
            note: 'Auto-released after tracking window expired',
          },
        })
      })
      await createNotification(
        order.creatorId, 'ESCROW_RELEASED',
        'Payment released',
        `USD ${(order.amountUsd / 100).toFixed(2)} for order #${order.id.slice(-8).toUpperCase()} has been released to your balance.`,
        order.id, '/dashboard/orders',
      )
      results.released++
    } catch (e) {
      console.error('[escrow] release error', order.id, e)
      results.errors++
    }
  }

  // ── 2. Auto-release digital orders past their escrow hold ────────────────────
  const digitalReleasable = await prisma.order.findMany({
    where: {
      escrowStatus: 'HELD',
      escrowAutoReleaseAt: { lte: now },
      fulfillmentDeadline: null,
      commissionStatus: null,
    },
    include: { product: true },
  })

  for (const order of digitalReleasable) {
    if (order.product.type !== 'DIGITAL') continue
    try {
      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: { escrowStatus: 'RELEASED', escrowReleasedAt: now, status: 'COMPLETED' },
        })
        await tx.escrowTransaction.create({
          data: {
            id: `et_${Math.random().toString(36).slice(2)}`,
            orderId: order.id,
            type: 'RELEASE',
            amount: order.amountUsd,
            note: 'Auto-released after digital escrow hold',
          },
        })
      })
      await createNotification(
        order.creatorId, 'ESCROW_RELEASED',
        'Payment released',
        `USD ${(order.amountUsd / 100).toFixed(2)} for order #${order.id.slice(-8).toUpperCase()} has been released to your balance.`,
        order.id, '/dashboard/orders',
      )
      results.released++
    } catch (e) {
      console.error('[escrow] digital release error', order.id, e)
      results.errors++
    }
  }

  // ── 3. Auto-release commission orders past their 30-day window ───────────────
  // Milestone-based orders are released per-milestone (section 5b), not here.
  const commissionReleasable = await prisma.order.findMany({
    where: {
      commissionStatus: 'DELIVERED',
      commissionIsMilestoneBased: false,
      escrowAutoReleaseAt: { lte: now },
    },
    include: { transactions: { where: { status: 'ESCROW' } } },
  })

  for (const order of commissionReleasable) {
    const dispute = await prisma.dispute.findUnique({ where: { orderId: order.id } })
    if (dispute && ['OPEN', 'UNDER_REVIEW'].includes(dispute.status)) continue

    const depositReleased = order.commissionDepositReleasedAt != null
    const depositAmount = order.commissionDepositAmount ?? 0
    const balanceAmount = depositReleased ? order.amountUsd - depositAmount : order.amountUsd
    const escrowTx = order.transactions[0]

    try {
      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: {
            escrowStatus: 'RELEASED',
            escrowReleasedAt: now,
            status: 'COMPLETED',
            commissionStatus: 'COMPLETED',
          },
        })
        await tx.escrowTransaction.create({
          data: {
            id: `et_${Math.random().toString(36).slice(2)}`,
            orderId: order.id,
            type: 'RELEASE',
            amount: balanceAmount,
            note: 'Auto-released after commission 30-day acceptance window',
          },
        })
        if (escrowTx) {
          const ratio = balanceAmount / escrowTx.grossAmountUsd
          await tx.transaction.create({
            data: {
              orderId: order.id,
              buyerId: order.buyerId,
              creatorId: order.creatorId,
              grossAmountUsd: balanceAmount,
              processingFee: Math.round(escrowTx.processingFee * ratio),
              platformFee: 0,
              creatorAmount: Math.round(escrowTx.creatorAmount * ratio),
              status: 'COMPLETED',
            },
          })
        }
      })
      await createNotification(
        order.creatorId, 'ESCROW_RELEASED',
        'Commission payment released',
        `USD ${(order.amountUsd / 100).toFixed(2)} for commission order #${order.id.slice(-8).toUpperCase()} has been released to your balance.`,
        order.id, '/dashboard/orders',
      )
      results.released++
    } catch (e) {
      console.error('[escrow] commission release error', order.id, e)
      results.errors++
    }
  }

  // ── 4. Auto-cancel commissions where creator didn't accept within 48h ────────
  const expiredCommissions = await prisma.order.findMany({
    where: {
      commissionStatus: 'PENDING_ACCEPTANCE',
      commissionAcceptDeadlineAt: { lte: now },
    },
  })

  for (const order of expiredCommissions) {
    try {
      const cancelAt = new Date()
      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: {
            escrowStatus: 'REFUNDED',
            status: 'CANCELLED',
            commissionStatus: 'COMPLETED',
            refundStatus: 'PENDING',
            refundRequestedAt: cancelAt,
          },
        })
        await tx.escrowTransaction.create({
          data: {
            id: `et_${Math.random().toString(36).slice(2)}`,
            orderId: order.id,
            type: 'REFUND',
            amount: order.amountUsd,
            note: 'Auto-cancelled: creator did not accept commission within 48 hours',
          },
        })
      })

      // Fire the Airwallex refund. Same conservative pattern as refundEscrow:
      // a missing intent or API failure falls through to refundStatus=FAILED
      // so an admin can retry from the dispute/refund UI.
      if (order.airwallexIntentId) {
        try {
          const refund = await createRefund({
            paymentIntentId: order.airwallexIntentId,
            amount: order.amountUsd,
            currency: 'USD',
            requestId: `refund_${order.id}_${cancelAt.getTime()}`,
            reason: 'Commission auto-cancelled — creator did not accept within 48h',
            metadata: { orderId: order.id, autoCancel: true },
          })
          await prisma.order.update({
            where: { id: order.id },
            data: { airwallexRefundId: refund.id },
          })
        } catch (refundErr) {
          const message = refundErr instanceof Error ? refundErr.message : String(refundErr)
          await prisma.order.update({
            where: { id: order.id },
            data: { refundStatus: 'FAILED', refundFailureReason: message.slice(0, 500) },
          })
          console.error('[escrow] commission auto-cancel refund failed', { orderId: order.id, err: message })
        }
      } else {
        await prisma.order.update({
          where: { id: order.id },
          data: {
            refundStatus: 'FAILED',
            refundFailureReason: 'No Airwallex payment intent on order — manual refund required',
          },
        })
      }

      await Promise.all([
        createNotification(
          order.creatorId, 'ORDER_CANCELLED',
          'Commission auto-cancelled',
          `Commission order #${order.id.slice(-8).toUpperCase()} was cancelled because you did not accept it within 48 hours.`,
          order.id, '/dashboard/orders',
        ),
        createNotification(
          order.buyerId, 'REFUND_ISSUED',
          'Commission request cancelled',
          `Your commission request #${order.id.slice(-8).toUpperCase()} was cancelled — the creator did not respond within 48 hours. A full refund of USD ${(order.amountUsd / 100).toFixed(2)} is being returned to you.`,
          order.id, '/account/orders',
        ),
      ])
      results.cancelled++
    } catch (e) {
      console.error('[escrow] commission expire error', order.id, e)
      results.errors++
    }
  }

  // ── 5. Auto-release commission deposit portions ──────────────────────────────
  const depositReleasable = await prisma.order.findMany({
    where: {
      commissionDepositAutoReleaseAt: { lte: now },
      commissionDepositReleasedAt: null,
      commissionStatus: { in: ['ACCEPTED', 'DELIVERED', 'REVISION_REQUESTED'] },
    },
    include: { transactions: { where: { status: 'ESCROW' } } },
  })

  for (const order of depositReleasable) {
    const depositAmount = order.commissionDepositAmount ?? 0
    if (depositAmount === 0) continue
    const escrowTx = order.transactions[0]
    if (!escrowTx) continue

    try {
      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: { commissionDepositReleasedAt: now },
        })
        // Create a COMPLETED Transaction for deposit portion — counts toward creator payout balance
        await tx.transaction.create({
          data: {
            orderId: order.id,
            buyerId: order.buyerId,
            creatorId: order.creatorId,
            grossAmountUsd: depositAmount,
            processingFee: Math.round(depositAmount * (escrowTx.processingFee / escrowTx.grossAmountUsd)),
            platformFee: 0,
            creatorAmount: Math.round(depositAmount * (escrowTx.creatorAmount / escrowTx.grossAmountUsd)),
            status: 'COMPLETED',
          },
        })
        await tx.escrowTransaction.create({
          data: {
            id: `et_${Math.random().toString(36).slice(2)}`,
            orderId: order.id,
            type: 'RELEASE',
            amount: depositAmount,
            note: 'Commission deposit auto-released after acceptance hold',
          },
        })
      })
      await createNotification(
        order.creatorId, 'ESCROW_RELEASED',
        'Commission deposit released',
        `Your deposit of USD ${(depositAmount / 100).toFixed(2)} for commission #${order.id.slice(-8).toUpperCase()} has been released to your balance.`,
        order.id, '/dashboard/orders',
      )
      results.released++
    } catch (e) {
      console.error('[escrow] deposit release error', order.id, e)
      results.errors++
    }
  }

  // ── 5b. Auto-release overdue DELIVERED milestones (14-day buyer window) ──────
  const overdueMilestones = await prisma.commissionMilestone.findMany({
    where: {
      status: 'DELIVERED',
      autoReleaseAt: { lte: now },
      releasedAt: null,
    },
    include: { orderRef: { select: { id: true } } },
  })

  for (const m of overdueMilestones) {
    if (!m.orderRef) continue
    const dispute = await prisma.dispute.findUnique({ where: { orderId: m.orderRef.id } })
    if (dispute && ['OPEN', 'UNDER_REVIEW'].includes(dispute.status)) continue
    try {
      await releaseMilestone(m.id, undefined, 'Auto-released after buyer review window')
      results.released++
    } catch (e) {
      console.error('[escrow] milestone release error', m.id, e)
      results.errors++
    }
  }

  // ── 6. Cancel overdue unfulfilled physical/POD orders ───────────────────────
  const overdue = await prisma.order.findMany({
    where: {
      escrowStatus: 'HELD',
      fulfillmentDeadline: { lte: now },
      trackingNumber: null,
      commissionStatus: null,
    },
  })

  for (const order of overdue) {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: { escrowStatus: 'REFUNDED', status: 'CANCELLED' },
        })
        await tx.escrowTransaction.create({
          data: {
            id: `et_${Math.random().toString(36).slice(2)}`,
            orderId: order.id,
            type: 'REFUND',
            amount: order.amountUsd,
            note: 'Auto-cancelled: fulfillment deadline exceeded',
          },
        })
        await tx.user.update({
          where: { id: order.creatorId },
          data: { warningCount: { increment: 1 } },
        })
      })
      const creator = await prisma.user.findUnique({ where: { id: order.creatorId } })
      if (creator && creator.warningCount >= 3 && !creator.isFlaggedForReview) {
        await prisma.user.update({
          where: { id: order.creatorId },
          data: { isFlaggedForReview: true },
        })
      }
      await Promise.all([
        createNotification(
          order.creatorId, 'ORDER_CANCELLED',
          'Order auto-cancelled',
          `Order #${order.id.slice(-8).toUpperCase()} was cancelled because no tracking was added within 7 days. A warning has been added to your account.`,
          order.id, '/dashboard/orders',
        ),
        createNotification(
          order.buyerId, 'REFUND_ISSUED',
          'Your order has been refunded',
          `Order #${order.id.slice(-8).toUpperCase()} was cancelled and a full refund of USD ${(order.amountUsd / 100).toFixed(2)} will be returned to you.`,
          order.id, '/account/orders',
        ),
      ])
      results.cancelled++
    } catch (e) {
      console.error('[escrow] cancel error', order.id, e)
      results.errors++
    }
  }

  return results
}

/** Called by POST /api/cron/fulfillment-reminders — daily reminders to creators */
export async function runFulfillmentReminders() {
  const now = new Date()
  const results = { sent: 0, errors: 0 }

  const pending = await prisma.order.findMany({
    where: {
      escrowStatus: 'HELD',
      trackingNumber: null,
      fulfillmentDeadline: { gt: now },
      commissionStatus: null,
    },
  })

  for (const order of pending) {
    if (!order.fulfillmentDeadline || !order.escrowHeldAt) continue
    const daysSinceOrder = Math.floor((now.getTime() - order.escrowHeldAt.getTime()) / DAY_MS)
    const daysLeft = Math.ceil((order.fulfillmentDeadline.getTime() - now.getTime()) / DAY_MS)

    let type: 'FULFILLMENT_REMINDER' | 'FULFILLMENT_WARNING' | 'FULFILLMENT_FINAL_WARNING' | null = null
    let warningLevel = 0

    if (daysSinceOrder === 3 && order.fulfillmentWarningsSent < 1) {
      type = 'FULFILLMENT_REMINDER'; warningLevel = 1
    } else if (daysSinceOrder === 5 && order.fulfillmentWarningsSent < 2) {
      type = 'FULFILLMENT_WARNING'; warningLevel = 2
    } else if (daysSinceOrder === 6 && order.fulfillmentWarningsSent < 3) {
      type = 'FULFILLMENT_FINAL_WARNING'; warningLevel = 3
    }

    if (!type) continue

    const titles: Record<string, string> = {
      FULFILLMENT_REMINDER:       'Add tracking for your order',
      FULFILLMENT_WARNING:        'Tracking required soon',
      FULFILLMENT_FINAL_WARNING:  'Final warning: add tracking now',
    }
    const messages: Record<string, string> = {
      FULFILLMENT_REMINDER:       `Order #${order.id.slice(-8).toUpperCase()} needs tracking. ${daysLeft} days left before auto-cancellation.`,
      FULFILLMENT_WARNING:        `Order #${order.id.slice(-8).toUpperCase()} has not been shipped. Only ${daysLeft} days left — add tracking or the order will be cancelled.`,
      FULFILLMENT_FINAL_WARNING:  `Order #${order.id.slice(-8).toUpperCase()} will be auto-cancelled TOMORROW if tracking is not added. Act now.`,
    }

    try {
      await createNotification(order.creatorId, type, titles[type], messages[type], order.id, '/dashboard/orders')
      await prisma.order.update({
        where: { id: order.id },
        data: { fulfillmentWarningsSent: warningLevel },
      })
      results.sent++
    } catch (e) {
      console.error('[reminders] error', order.id, e)
      results.errors++
    }
  }

  return results
}

/** Release escrow immediately (buyer confirmed receipt or admin override) */
export async function releaseEscrow(orderId: string, performedBy?: string, note?: string) {
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { transactions: { where: { status: 'ESCROW' } } },
  })
  const now = new Date()

  // For commission orders, release the balance portion (deposit already handled separately)
  const isCommission = !!order.commissionStatus
  const depositReleased = order.commissionDepositReleasedAt != null
  const depositAmount = order.commissionDepositAmount ?? 0
  const balanceAmount = isCommission && depositReleased
    ? order.amountUsd - depositAmount
    : order.amountUsd
  const escrowTx = order.transactions[0]

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: {
        escrowStatus: 'RELEASED',
        escrowReleasedAt: now,
        status: 'COMPLETED',
        commissionStatus: isCommission ? 'COMPLETED' : undefined,
        buyerConfirmedAt: performedBy ? now : undefined,
      },
    })
    await tx.escrowTransaction.create({
      data: {
        id: `et_${Math.random().toString(36).slice(2)}`,
        orderId,
        type: performedBy ? 'RELEASE' : 'ADMIN_RELEASE',
        amount: balanceAmount,
        note: note ?? 'Released by buyer confirmation',
        performedBy,
      },
    })
    // For commission orders: create COMPLETED Transaction for balance portion
    // The deposit was already released as a separate COMPLETED Transaction
    if (isCommission && escrowTx) {
      const ratio = balanceAmount / escrowTx.grossAmountUsd
      await tx.transaction.create({
        data: {
          orderId,
          buyerId: order.buyerId,
          creatorId: order.creatorId,
          grossAmountUsd: balanceAmount,
          processingFee: Math.round(escrowTx.processingFee * ratio),
          platformFee: 0,
          creatorAmount: Math.round(escrowTx.creatorAmount * ratio),
          status: 'COMPLETED',
        },
      })
    }
  })

  await createNotification(
    order.creatorId, 'ESCROW_RELEASED',
    'Payment released',
    `USD ${(order.amountUsd / 100).toFixed(2)} for order #${orderId.slice(-8).toUpperCase()} has been released.`,
    orderId, '/dashboard/orders',
  )
}

/** Refund escrow (full or partial) */
export async function refundEscrow(orderId: string, amount: number, performedBy: string, note?: string) {
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: { dispute: true } })
  const isPartial = amount < order.amountUsd
  const now = new Date()

  // Update internal escrow + dispute state up-front so the audit trail is
  // captured even if the Airwallex refund call fails. refundStatus tracks
  // the money-side state separately from escrowStatus.
  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: {
        escrowStatus: isPartial ? 'PARTIALLY_REFUNDED' : 'REFUNDED',
        status: isPartial ? 'COMPLETED' : 'CANCELLED',
        refundStatus: 'PENDING',
        refundRequestedAt: now,
      },
    })
    await tx.escrowTransaction.create({
      data: {
        id: `et_${Math.random().toString(36).slice(2)}`,
        orderId,
        type: isPartial ? 'PARTIAL_REFUND' : 'REFUND',
        amount,
        note: note ?? 'Admin refund',
        performedBy,
      },
    })
    if (order.dispute) {
      await tx.dispute.update({
        where: { orderId },
        data: {
          status: 'RESOLVED_REFUND',
          resolvedBy: performedBy,
          resolvedAt: now,
          refundAmount: amount,
        },
      })
    }
  })

  // Fire the Airwallex refund call. We require an intent ID; if missing, mark
  // FAILED with a clear reason so an admin can investigate (typically means
  // the order pre-dates Airwallex integration or the intent ID was lost).
  if (order.airwallexIntentId) {
    try {
      const refund = await createRefund({
        paymentIntentId: order.airwallexIntentId,
        amount,
        currency: 'USD',
        requestId: `refund_${orderId}_${now.getTime()}`,
        reason: note ? note.slice(0, 100) : 'requested_by_customer',
        metadata: { orderId, performedBy, isPartial },
      })
      await prisma.order.update({
        where: { id: orderId },
        data: { airwallexRefundId: refund.id },
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      await prisma.order.update({
        where: { id: orderId },
        data: { refundStatus: 'FAILED', refundFailureReason: message.slice(0, 500) },
      })
      console.error('[escrow-processor] refund create failed', { orderId, err: message })
    }
  } else {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        refundStatus: 'FAILED',
        refundFailureReason: 'No Airwallex payment intent on order — manual refund required',
      },
    })
  }

  await Promise.all([
    createNotification(order.buyerId, 'REFUND_ISSUED',
      'Refund issued',
      `USD ${(amount / 100).toFixed(2)} has been refunded for order #${orderId.slice(-8).toUpperCase()}.`,
      orderId, '/account/orders'),
    createNotification(order.creatorId, 'DISPUTE_RESOLVED',
      'Dispute resolved',
      `The dispute for order #${orderId.slice(-8).toUpperCase()} has been resolved. A refund of USD ${(amount / 100).toFixed(2)} was issued to the buyer.`,
      orderId, '/dashboard/orders'),
  ])
}

/**
 * Cancel a commission after the creator has already accepted (deposit kept by creator,
 * balance refunded to buyer). Used for admin cancellations of in-progress commissions.
 */
export async function cancelCommissionWithSplit(orderId: string, performedBy: string, note?: string) {
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } })
  const now = new Date()

  const depositAmount = order.commissionDepositAmount ?? 0
  const balanceAmount = order.amountUsd - depositAmount

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: {
        escrowStatus: depositAmount > 0 ? 'PARTIALLY_REFUNDED' : 'REFUNDED',
        status: 'CANCELLED',
        commissionStatus: 'COMPLETED',
      },
    })
    // Log the split: deposit to creator, balance refunded
    if (depositAmount > 0) {
      await tx.escrowTransaction.create({
        data: {
          id: `et_${Math.random().toString(36).slice(2)}`,
          orderId,
          type: 'PARTIAL_REFUND',
          amount: balanceAmount,
          note: note ?? `Commission cancelled — deposit of USD ${(depositAmount / 100).toFixed(2)} kept by creator, balance of USD ${(balanceAmount / 100).toFixed(2)} refunded to buyer`,
          performedBy,
        },
      })
    } else {
      await tx.escrowTransaction.create({
        data: {
          id: `et_${Math.random().toString(36).slice(2)}`,
          orderId,
          type: 'REFUND',
          amount: order.amountUsd,
          note: note ?? 'Commission cancelled before work started — full refund',
          performedBy,
        },
      })
    }
  })

  await Promise.all([
    createNotification(order.buyerId, 'REFUND_ISSUED',
      'Commission cancelled',
      depositAmount > 0
        ? `Your commission #${orderId.slice(-8).toUpperCase()} was cancelled. USD ${(balanceAmount / 100).toFixed(2)} has been refunded. The deposit of USD ${(depositAmount / 100).toFixed(2)} is retained by the creator.`
        : `Your commission #${orderId.slice(-8).toUpperCase()} was cancelled. A full refund of USD ${(order.amountUsd / 100).toFixed(2)} will be returned to you.`,
      orderId, '/account/orders'),
    createNotification(order.creatorId, 'ORDER_CANCELLED',
      'Commission cancelled',
      depositAmount > 0
        ? `Commission #${orderId.slice(-8).toUpperCase()} was cancelled. Your deposit of USD ${(depositAmount / 100).toFixed(2)} has been released to your balance.`
        : `Commission #${orderId.slice(-8).toUpperCase()} was cancelled before work started. No deposit was collected.`,
      orderId, '/dashboard/orders'),
  ])
}
