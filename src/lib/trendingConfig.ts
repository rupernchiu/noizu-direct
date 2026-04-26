export const TRENDING_CONFIG = {
  version: 4,
  weights: {
    orders:   0.40,
    wishlist: 0.25,
    cart:     0.15,
    views:    0.15,
    reviews:  0.05,
  },
  decayFactor: 0.95,
  windowDays: 7,
  // Sprint shipping-1: small additive boost for products that qualify for free
  // shipping at checkout (creator or product has set a free-ship threshold).
  // Intentionally NOT part of `weights` because (a) it's a binary signal, not a
  // 0–1 ratio, and (b) the weights-sum-to-1 invariant must hold.
  freeShipBoost: 5,
} as const

// Sanity-check that weights sum to 1 (floating-point tolerance)
const _weightSum = Object.values(TRENDING_CONFIG.weights).reduce((a, b) => a + b, 0)
if (Math.abs(_weightSum - 1) > 1e-9) {
  throw new Error(`TRENDING_CONFIG weights sum to ${_weightSum}, expected 1`)
}
