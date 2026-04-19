const DAY_MS = 1000 * 60 * 60 * 24

const PHYSICAL_DISPUTE_DAYS = 14
const POD_DISPUTE_DAYS = 30
const COMMISSION_DISPUTE_DAYS = 30

export type EligibilityResult =
  | { status: 'eligible' }
  | { status: 'not_yet'; availableInDays: number }
  | { status: 'expired' }
  | { status: 'has_dispute'; disputeId: string }

export function getDisputeEligibility(order: {
  product: { type: string }
  status: string
  createdAt: Date | string
  trackingAddedAt: Date | string | null
  commissionDeliveredAt?: Date | string | null
  dispute: { id: string } | null
}): EligibilityResult {
  if (order.dispute) return { status: 'has_dispute', disputeId: order.dispute.id }

  if (['COMPLETED', 'CANCELLED', 'REFUNDED'].includes(order.status)) {
    return { status: 'expired' }
  }

  const now = Date.now()
  const orderAge = (now - new Date(order.createdAt).getTime()) / DAY_MS
  const type = order.product.type

  if (type === 'DIGITAL') {
    if (order.status !== 'PAID') return { status: 'expired' }
    return orderAge <= 7 ? { status: 'eligible' } : { status: 'expired' }
  }

  if (type === 'PHYSICAL') {
    if (orderAge < 1) {
      return { status: 'not_yet', availableInDays: 1 }
    }
    const refDate = order.trackingAddedAt
      ? new Date(order.trackingAddedAt)
      : new Date(order.createdAt)
    const refAge = (now - refDate.getTime()) / DAY_MS
    return refAge > PHYSICAL_DISPUTE_DAYS ? { status: 'expired' } : { status: 'eligible' }
  }

  if (type === 'POD') {
    if (orderAge < 3) {
      return { status: 'not_yet', availableInDays: Math.ceil(3 - orderAge) }
    }
    const refDate = order.trackingAddedAt
      ? new Date(order.trackingAddedAt)
      : new Date(order.createdAt)
    const refAge = (now - refDate.getTime()) / DAY_MS
    return refAge > POD_DISPUTE_DAYS ? { status: 'expired' } : { status: 'eligible' }
  }

  if (type === 'COMMISSION') {
    // Dispute window opens after first delivery, expires 30 days after delivery
    const refDate = order.commissionDeliveredAt
      ? new Date(order.commissionDeliveredAt)
      : null
    if (!refDate) return { status: 'not_yet', availableInDays: 0 }
    const refAge = (now - refDate.getTime()) / DAY_MS
    return refAge > COMMISSION_DISPUTE_DAYS ? { status: 'expired' } : { status: 'eligible' }
  }

  return { status: 'expired' }
}
