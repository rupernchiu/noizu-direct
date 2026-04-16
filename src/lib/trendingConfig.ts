export const TRENDING_CONFIG = {
  version: 2,
  weights: {
    orders:   0.40,
    wishlist: 0.25,
    cart:     0.15,
    views:    0.20,
  },
  decayFactor: 0.95,
  windowDays: 7,
} as const

// Sanity-check that weights sum to 1 (floating-point tolerance)
const _weightSum = Object.values(TRENDING_CONFIG.weights).reduce((a, b) => a + b, 0)
if (Math.abs(_weightSum - 1) > 1e-9) {
  throw new Error(`TRENDING_CONFIG weights sum to ${_weightSum}, expected 1`)
}
