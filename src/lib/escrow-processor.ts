import { prisma } from '@/lib/prisma'
import { createNotification } from '@/lib/notifications'

const DAY_MS = 24 * 60 * 60 * 1000

/** Called by POST /api/cron/escrow-processor — auto-release + cancellations */
export async function runEscrowProcessor() {
  const now = new Date()
  const results = { released: 0, cancelled: 0, errors: 0 }

  // ── 1. Auto-release shipped orders past their release date ──────────────────
  const releasable = await prisma.order.findMany({
    where: {
      escrowStatus: 'TRACKING_ADDED',
      escrowAutoReleaseAt: { lte: now },
    },
    include: { product: true },
  })

  for (const order of releasable) {
    // Skip if open dispute exists
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

  // ── 2. Cancel overdue unfulfilled orders ────────────────────────────────────
  const overdue = await prisma.order.findMany({
    where: {
      escrowStatus: 'HELD',
      fulfillmentDeadline: { lte: now },
      trackingNumber: null,
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
        // Increment creator warning count
        await tx.user.update({
          where: { id: order.creatorId },
          data: { warningCount: { increment: 1 } },
        })
      })
      // Check if creator now has 3+ warnings (flag for review)
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
    where: { escrowStatus: 'HELD', trackingNumber: null, fulfillmentDeadline: { gt: now } },
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
      FULFILLMENT_WARNING:        '⚠️ Tracking required soon',
      FULFILLMENT_FINAL_WARNING:  '🚨 Final warning: add tracking now',
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
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } })
  const now = new Date()

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: { escrowStatus: 'RELEASED', escrowReleasedAt: now, status: 'COMPLETED', buyerConfirmedAt: performedBy ? now : undefined },
    })
    await tx.escrowTransaction.create({
      data: {
        id: `et_${Math.random().toString(36).slice(2)}`,
        orderId,
        type: performedBy ? 'RELEASE' : 'ADMIN_RELEASE',
        amount: order.amountUsd,
        note: note ?? 'Released by buyer confirmation',
        performedBy,
      },
    })
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

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: { escrowStatus: isPartial ? 'PARTIALLY_REFUNDED' : 'REFUNDED', status: isPartial ? 'COMPLETED' : 'CANCELLED' },
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
          status: isPartial ? 'RESOLVED_REFUND' : 'RESOLVED_REFUND',
          resolvedBy: performedBy,
          resolvedAt: now,
          refundAmount: amount,
        },
      })
    }
  })

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
