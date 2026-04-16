const DAY_MS = 1000 * 60 * 60 * 24

// Prototype timing constants — tighten these for production:
// PHYSICAL_MIN_DAYS: 3, PHYSICAL_MAX_DAYS: 14
// POD_MIN_DAYS: 7, POD_MAX_DAYS: 21
const PHYSICAL_MIN_DAYS = 1
const PHYSICAL_MAX_DAYS = 365
const POD_MIN_DAYS = 1
const POD_MAX_DAYS = 365

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
  dispute: { id: string } | null
}): EligibilityResult {
  if (order.dispute) return { status: 'has_dispute', disputeId: order.dispute.id }

  // Terminal statuses are never disputable
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
    if (orderAge < PHYSICAL_MIN_DAYS) {
      return { status: 'not_yet', availableInDays: Math.ceil(PHYSICAL_MIN_DAYS - orderAge) }
    }
    const refDate = order.trackingAddedAt
      ? new Date(order.trackingAddedAt)
      : new Date(order.createdAt)
    const refAge = (now - refDate.getTime()) / DAY_MS
    return refAge > PHYSICAL_MAX_DAYS ? { status: 'expired' } : { status: 'eligible' }
  }

  if (type === 'POD') {
    if (orderAge < POD_MIN_DAYS) {
      return { status: 'not_yet', availableInDays: Math.ceil(POD_MIN_DAYS - orderAge) }
    }
    const refDate = order.trackingAddedAt
      ? new Date(order.trackingAddedAt)
      : new Date(order.createdAt)
    const refAge = (now - refDate.getTime()) / DAY_MS
    return refAge > POD_MAX_DAYS ? { status: 'expired' } : { status: 'eligible' }
  }

  return { status: 'expired' }
}
