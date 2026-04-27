/**
 * Layer 1 — Creator origin tax (withholding).
 *
 * Pure computation: given a creator country, an order's USD-cent revenue base,
 * and the listing type, returns the rate / amount / label that should be
 * withheld from the creator's payout and remitted by the platform to the
 * creator's tax authority.
 *
 * **Active at launch:** Indonesia only — PPh Final 0.5% on every payout
 * (any listing type, no individual threshold). All other countries return $0.
 *
 * **Tax base:** caller passes USD cents of the seller's revenue from the sale
 * (typically the post-discount item subtotal). Shipping is NOT included —
 * shipping is a pass-through on noizu.direct (creator-fulfilled, platform
 * takes no fee on it) and excluded from the PPh tax base.
 *
 * Snapshotting and reserve accrual happen at the call sites:
 *  - `src/app/api/airwallex/payment-intent/route.ts` snapshots per-order at
 *    intent-creation time into `Order.creatorTaxAmountUsd` / `creatorTaxRatePercent`.
 *  - `src/app/api/airwallex/webhook/route.ts` deducts the snapshot from the
 *    creator's payout when the Transaction is created and accrues to the
 *    `TAX_ORIGIN/{country}` PlatformReserve.
 *
 * Country definitions (rates, labels, application scope) live in
 * `src/lib/countries.ts` — single source of truth.
 */
import { countryFor } from './countries'

export interface OriginTaxResult {
  rate: number          // decimal, e.g. 0.005 for 0.5%
  amountUsd: number     // USD cents withheld from creator
  label: string | null  // e.g. "PPh Final" — null when no tax applies
}

export type OriginTaxListingType = 'PHYSICAL' | 'POD' | 'DIGITAL' | 'COMMISSION'

/**
 * Compute the Layer 1 origin-tax withholding for a single order.
 *
 * Returns `{ rate: 0, amountUsd: 0, label: null }` when:
 *   - creator country is unknown / not in the COUNTRIES table
 *   - country has no `creatorOriginTax` rule (everywhere except ID at launch)
 *   - rule's `appliesTo` is `ROYALTY_OR_SERVICES` and the listing is physical
 *     goods (future cross-border WHT scaffold; not active at launch)
 *   - order amount is zero or negative
 */
export function computeOriginTax(
  creatorCountry: string | null | undefined,
  orderAmountUsdCents: number,
  listingType: OriginTaxListingType,
): OriginTaxResult {
  if (!creatorCountry || orderAmountUsdCents <= 0) {
    return { rate: 0, amountUsd: 0, label: null }
  }

  const country = countryFor(creatorCountry)
  if (!country?.creatorOriginTax) {
    return { rate: 0, amountUsd: 0, label: null }
  }

  const { rate, label, appliesTo } = country.creatorOriginTax

  // ROYALTY_OR_SERVICES path excludes physical-goods sales (future cross-border
  // WHT regimes typically apply only to royalties/services). Not active at launch.
  if (appliesTo === 'ROYALTY_OR_SERVICES' && (listingType === 'PHYSICAL' || listingType === 'POD')) {
    return { rate: 0, amountUsd: 0, label }
  }

  // ALL_PAYOUTS path (ID PPh Final) — applies to every listing type.
  return {
    rate,
    amountUsd: Math.round(orderAmountUsdCents * rate),
    label,
  }
}
