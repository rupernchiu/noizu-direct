/**
 * Single source of truth for country metadata across noizu.direct.
 *
 * Phase 1 of the tax architecture build (2026-04-27 spec). Replaces the three
 * scattered country lists in `shipping.ts`, `tax-thresholds.ts`, and
 * `payout-rail.ts`. Those files are now consumers — they re-export derived
 * shapes from this module so existing call-sites keep working unchanged.
 *
 * All currency thresholds are stored as USD cents to match the rest of the
 * codebase. Where a jurisdiction officially publishes a local-currency
 * threshold (e.g. RM 500K SST), we convert at the approximate rate noted
 * in `tax-thresholds.ts` for dashboard display. Exact filings always use
 * the daily Airwallex FX rate at the time of the transaction.
 */

export type CreatorTier = 1 | 2 | 3 | null
export type TaxApplication = 'ALL_PAYOUTS' | 'ROYALTY_OR_SERVICES'
export type FeeTaxSide = 'BUYER' | 'CREATOR'

export interface CountryRecord {
  iso2: string
  name: string

  creatorTier: CreatorTier
  creatorOnboardingEnabled: boolean
  payoutRail: 'LOCAL' | 'SWIFT'
  shippingZone: 'domestic-my' | 'sea-tier1' | 'sea-tier2' | 'row'

  destinationTax: {
    rate: number               // decimal (e.g. 0.08 for 8%)
    label: 'SST' | 'GST' | 'VAT' | 'PPN'
    registrationThreshold: number  // USD cents — annual destination GMV threshold
    deemedSupplierB2C: boolean
  } | null

  creatorOriginTax: {
    rate: number
    label: 'PPh Final' | 'WHT'
    appliesTo: TaxApplication
    individualThreshold: number | null  // USD cents; null = no floor
  } | null
}

// Threshold conversions use the approximate local-per-USD rates already
// recorded in tax-thresholds.ts to preserve dashboard parity.
//   MY: RM 500_000 / 4.7 ≈ 106_383 USD → 10_638_298 cents
//   SG: SGD 100_000 / 1.34 ≈ 74_627 USD → 7_462_687 cents
//   ID: IDR 600_000_000 / 16_500 ≈ 36_364 USD → 3_636_364 cents
//   TH: THB 1_800_000 / 36.5 ≈ 49_315 USD → 4_931_507 cents
//   PH: PHP 3_000_000 / 57 ≈ 52_632 USD → 5_263_158 cents

export const COUNTRIES: Record<string, CountryRecord> = {
  // ── Tier 1 — 10 SEA, active for creator signup ────────────────────────────
  MY: {
    iso2: 'MY',
    name: 'Malaysia',
    creatorTier: 1,
    creatorOnboardingEnabled: true,
    payoutRail: 'LOCAL',
    shippingZone: 'domestic-my',
    destinationTax: {
      rate: 0.08,
      label: 'SST',
      registrationThreshold: 10_638_298,
      deemedSupplierB2C: true,
    },
    creatorOriginTax: null,
  },
  SG: {
    iso2: 'SG',
    name: 'Singapore',
    creatorTier: 1,
    creatorOnboardingEnabled: true,
    payoutRail: 'LOCAL',
    shippingZone: 'sea-tier1',
    destinationTax: {
      rate: 0.09,
      label: 'GST',
      registrationThreshold: 7_462_687,
      deemedSupplierB2C: true,
    },
    creatorOriginTax: null,
  },
  ID: {
    iso2: 'ID',
    name: 'Indonesia',
    creatorTier: 1,
    creatorOnboardingEnabled: true,
    payoutRail: 'LOCAL',
    shippingZone: 'sea-tier1',
    destinationTax: {
      rate: 0.11,
      label: 'PPN',
      registrationThreshold: 3_636_364,
      deemedSupplierB2C: true,
    },
    creatorOriginTax: {
      rate: 0.005,
      label: 'PPh Final',
      appliesTo: 'ALL_PAYOUTS',
      individualThreshold: null,
    },
  },
  TH: {
    iso2: 'TH',
    name: 'Thailand',
    creatorTier: 1,
    creatorOnboardingEnabled: true,
    payoutRail: 'LOCAL',
    shippingZone: 'sea-tier1',
    destinationTax: {
      rate: 0.07,
      label: 'VAT',
      registrationThreshold: 4_931_507,
      deemedSupplierB2C: true,
    },
    creatorOriginTax: null,
  },
  PH: {
    iso2: 'PH',
    name: 'Philippines',
    creatorTier: 1,
    creatorOnboardingEnabled: true,
    payoutRail: 'LOCAL',
    shippingZone: 'sea-tier1',
    destinationTax: {
      rate: 0.12,
      label: 'VAT',
      registrationThreshold: 5_263_158,
      deemedSupplierB2C: true,
    },
    creatorOriginTax: null,
  },
  VN: {
    iso2: 'VN',
    name: 'Vietnam',
    creatorTier: 1,
    creatorOnboardingEnabled: true,
    payoutRail: 'SWIFT',
    shippingZone: 'sea-tier2',
    destinationTax: null,
    creatorOriginTax: null,
  },
  KH: {
    iso2: 'KH',
    name: 'Cambodia',
    creatorTier: 1,
    creatorOnboardingEnabled: true,
    payoutRail: 'SWIFT',
    shippingZone: 'sea-tier2',
    destinationTax: null,
    creatorOriginTax: null,
  },
  MM: {
    iso2: 'MM',
    name: 'Myanmar',
    creatorTier: 1,
    creatorOnboardingEnabled: true,
    payoutRail: 'SWIFT',
    shippingZone: 'sea-tier2',
    destinationTax: null,
    creatorOriginTax: null,
  },
  LA: {
    iso2: 'LA',
    name: 'Laos',
    creatorTier: 1,
    creatorOnboardingEnabled: true,
    payoutRail: 'SWIFT',
    shippingZone: 'sea-tier2',
    destinationTax: null,
    creatorOriginTax: null,
  },
  BN: {
    iso2: 'BN',
    name: 'Brunei',
    creatorTier: 1,
    creatorOnboardingEnabled: true,
    payoutRail: 'LOCAL',
    shippingZone: 'sea-tier1',
    destinationTax: null,
    creatorOriginTax: null,
  },

  // ── Tier 2 — defined, disabled (waitlist only) ────────────────────────────
  GB: {
    iso2: 'GB',
    name: 'United Kingdom',
    creatorTier: 2,
    creatorOnboardingEnabled: false,
    payoutRail: 'SWIFT',
    shippingZone: 'row',
    destinationTax: null,
    creatorOriginTax: null,
  },
  AU: {
    iso2: 'AU',
    name: 'Australia',
    creatorTier: 2,
    creatorOnboardingEnabled: false,
    payoutRail: 'SWIFT',
    shippingZone: 'row',
    destinationTax: null,
    creatorOriginTax: null,
  },
  NZ: {
    iso2: 'NZ',
    name: 'New Zealand',
    creatorTier: 2,
    creatorOnboardingEnabled: false,
    payoutRail: 'SWIFT',
    shippingZone: 'row',
    destinationTax: null,
    creatorOriginTax: null,
  },
  JP: {
    iso2: 'JP',
    name: 'Japan',
    creatorTier: 2,
    creatorOnboardingEnabled: false,
    payoutRail: 'SWIFT',
    shippingZone: 'row',
    destinationTax: null,
    creatorOriginTax: null,
  },
  KR: {
    iso2: 'KR',
    name: 'South Korea',
    creatorTier: 2,
    creatorOnboardingEnabled: false,
    payoutRail: 'SWIFT',
    shippingZone: 'row',
    destinationTax: null,
    creatorOriginTax: null,
  },
  CA: {
    iso2: 'CA',
    name: 'Canada',
    creatorTier: 2,
    creatorOnboardingEnabled: false,
    payoutRail: 'SWIFT',
    shippingZone: 'row',
    destinationTax: null,
    creatorOriginTax: null,
  },
  HK: {
    iso2: 'HK',
    name: 'Hong Kong',
    creatorTier: 2,
    creatorOnboardingEnabled: false,
    payoutRail: 'SWIFT',
    shippingZone: 'row',
    destinationTax: null,
    creatorOriginTax: null,
  },
  TW: {
    iso2: 'TW',
    name: 'Taiwan',
    creatorTier: 2,
    creatorOnboardingEnabled: false,
    payoutRail: 'SWIFT',
    shippingZone: 'row',
    destinationTax: null,
    creatorOriginTax: null,
  },

  // ── Tier 3 — US + selected EU member states (defined, disabled) ───────────
  US: {
    iso2: 'US',
    name: 'United States',
    creatorTier: 3,
    creatorOnboardingEnabled: false,
    payoutRail: 'SWIFT',
    shippingZone: 'row',
    destinationTax: null,
    creatorOriginTax: null,
  },
  DE: {
    iso2: 'DE',
    name: 'Germany',
    creatorTier: 3,
    creatorOnboardingEnabled: false,
    payoutRail: 'SWIFT',
    shippingZone: 'row',
    destinationTax: null,
    creatorOriginTax: null,
  },
  FR: {
    iso2: 'FR',
    name: 'France',
    creatorTier: 3,
    creatorOnboardingEnabled: false,
    payoutRail: 'SWIFT',
    shippingZone: 'row',
    destinationTax: null,
    creatorOriginTax: null,
  },
  IT: {
    iso2: 'IT',
    name: 'Italy',
    creatorTier: 3,
    creatorOnboardingEnabled: false,
    payoutRail: 'SWIFT',
    shippingZone: 'row',
    destinationTax: null,
    creatorOriginTax: null,
  },
  ES: {
    iso2: 'ES',
    name: 'Spain',
    creatorTier: 3,
    creatorOnboardingEnabled: false,
    payoutRail: 'SWIFT',
    shippingZone: 'row',
    destinationTax: null,
    creatorOriginTax: null,
  },
  NL: {
    iso2: 'NL',
    name: 'Netherlands',
    creatorTier: 3,
    creatorOnboardingEnabled: false,
    payoutRail: 'SWIFT',
    shippingZone: 'row',
    destinationTax: null,
    creatorOriginTax: null,
  },
  SE: {
    iso2: 'SE',
    name: 'Sweden',
    creatorTier: 3,
    creatorOnboardingEnabled: false,
    payoutRail: 'SWIFT',
    shippingZone: 'row',
    destinationTax: null,
    creatorOriginTax: null,
  },
  IE: {
    iso2: 'IE',
    name: 'Ireland',
    creatorTier: 3,
    creatorOnboardingEnabled: false,
    payoutRail: 'SWIFT',
    shippingZone: 'row',
    destinationTax: null,
    creatorOriginTax: null,
  },
}

// ── Helpers ─────────────────────────────────────────────────────────────────

export function countryFor(iso2: string | null | undefined): CountryRecord | null {
  if (!iso2) return null
  return COUNTRIES[iso2.toUpperCase()] ?? null
}

export function isCreatorCountrySupported(iso2: string | null | undefined): boolean {
  const c = countryFor(iso2)
  return !!c && c.creatorOnboardingEnabled
}

export function originTaxRate(creatorCountry: string | null | undefined): number {
  const c = countryFor(creatorCountry)
  return c?.creatorOriginTax?.rate ?? 0
}

export function tier1Countries(): CountryRecord[] {
  return Object.values(COUNTRIES).filter((c) => c.creatorTier === 1)
}

export function enabledCreatorCountries(): CountryRecord[] {
  return Object.values(COUNTRIES).filter((c) => c.creatorOnboardingEnabled)
}
