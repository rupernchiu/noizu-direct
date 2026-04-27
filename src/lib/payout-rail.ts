// Phase 1.5 — SWIFT corridor for tier-3 creators.
//
// Tier-3 SEA countries (Vietnam, Cambodia, Myanmar, Laos) cannot reliably
// receive Airwallex local rails — payouts there must use SWIFT. The fee
// (typically USD 25-40, varies by intermediary banks) is passed through to
// the creator rather than absorbed by the platform, which would otherwise
// turn small payouts into a loss.
//
// We also raise the payout minimum to USD 100 for SWIFT to keep the
// fee-to-payout ratio sensible (a USD 10 payout with a USD 30 SWIFT fee
// would net the creator nothing).
//
// 2026-04-27: country list now derived from src/lib/countries.ts (any
// country with payoutRail === 'SWIFT'). The Set shape is preserved so
// existing call-sites don't break.

import { COUNTRIES } from '@/lib/countries'

export const SWIFT_COUNTRIES: Set<string> = new Set(
  Object.values(COUNTRIES)
    .filter((c) => c.payoutRail === 'SWIFT')
    .map((c) => c.iso2),
)

export type PayoutRail = 'LOCAL' | 'SWIFT'

export function rateForCountry(country: string | null | undefined): PayoutRail {
  if (!country) return 'LOCAL'
  return SWIFT_COUNTRIES.has(country.toUpperCase()) ? 'SWIFT' : 'LOCAL'
}

// Minimum payout in USD cents per rail.
//   LOCAL → USD 10  (cron sweep threshold)
//   SWIFT → USD 100 (offsets typical USD 25-40 intermediary fee)
export function minimumPayoutUsdCents(rail: PayoutRail): number {
  return rail === 'SWIFT' ? 10_000 : 1_000
}

// Estimated SWIFT intermediary fee passed through to the creator. Real fee
// is settled by Airwallex and recorded post-transfer; this is the value we
// surface in the dashboard so creators can see what they'll net before
// requesting. CreatorProfile.swiftIntermediaryFeeUsd overrides this when
// set (e.g., admin recording an actual observed fee for that corridor).
export const DEFAULT_SWIFT_FEE_USD_CENTS = 3_500

export function swiftFeeUsdCents(profileFee: number | null | undefined): number {
  return profileFee && profileFee > 0 ? profileFee : DEFAULT_SWIFT_FEE_USD_CENTS
}
