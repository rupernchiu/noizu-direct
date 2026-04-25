/**
 * SEA tax registration thresholds + per-country VAT/GST/SST rates.
 *
 * Thresholds are *destination* values — when annual GMV from buyers in country
 * X crosses the threshold, the platform must register and collect that
 * country's marketplace facilitator tax on subsequent sales to that country.
 *
 * Amounts are in local currency cents (e.g. RM 500,000.00 → 500_000_00).
 */
export type TaxJurisdiction = {
  country: string // ISO-3166-1 alpha-2
  countryName: string
  taxLabel: string // e.g. "MY SST", "SG GST"
  currency: string // local currency code
  thresholdLocalCents: number
  ratePercent: number
  // Approximate local-currency-per-USD rate for rough threshold display.
  // Exact filings always use the daily Airwallex FX rate, this is dashboard-only.
  approxLocalPerUsd: number
  filingFormHint: string
  notes: string
}

export const TAX_JURISDICTIONS: TaxJurisdiction[] = [
  {
    country: 'MY',
    countryName: 'Malaysia',
    taxLabel: 'SST',
    currency: 'MYR',
    thresholdLocalCents: 500_000_00,
    ratePercent: 8,
    approxLocalPerUsd: 4.7,
    filingFormHint: 'SST-02 (Royal Malaysian Customs)',
    notes: 'Marketplace facilitator scope; service tax (digital) at 8%.',
  },
  {
    country: 'SG',
    countryName: 'Singapore',
    taxLabel: 'GST',
    currency: 'SGD',
    thresholdLocalCents: 100_000_00,
    ratePercent: 9,
    approxLocalPerUsd: 1.34,
    filingFormHint: 'GST F5 (IRAS)',
    notes: 'Overseas Vendor Registration regime for B2C digital services.',
  },
  {
    country: 'ID',
    countryName: 'Indonesia',
    taxLabel: 'PPN',
    currency: 'IDR',
    // 600,000,000.00 IDR — Rupiah is 2 decimal places officially but we store
    // cents the same way. Approximation only used for dashboard display.
    thresholdLocalCents: 600_000_000_00,
    ratePercent: 11,
    approxLocalPerUsd: 16500,
    filingFormHint: 'PPN PMSE return (DJP)',
    notes: 'PMSE regime — non-resident digital sellers above turnover/users thresholds.',
  },
  {
    country: 'TH',
    countryName: 'Thailand',
    taxLabel: 'VAT',
    currency: 'THB',
    thresholdLocalCents: 1_800_000_00,
    ratePercent: 7,
    approxLocalPerUsd: 36.5,
    filingFormHint: 'VAT return (Revenue Department)',
    notes: 'Non-resident e-service VAT registration above THB 1.8M.',
  },
  {
    country: 'PH',
    countryName: 'Philippines',
    taxLabel: 'VAT',
    currency: 'PHP',
    thresholdLocalCents: 3_000_000_00,
    ratePercent: 12,
    approxLocalPerUsd: 57,
    filingFormHint: 'BIR Form 2550M/2550Q',
    notes: 'Digital services tax effective 2024 — non-resident DSPs.',
  },
]

export function jurisdictionFor(country: string | null | undefined): TaxJurisdiction | null {
  if (!country) return null
  return TAX_JURISDICTIONS.find((j) => j.country === country.toUpperCase()) ?? null
}

/**
 * Compute threshold-crossed status for a given USD GMV figure.
 * Returns null if country is unknown.
 */
export function thresholdStatus(country: string, gmvUsdCents: number) {
  const j = jurisdictionFor(country)
  if (!j) return null
  const gmvLocalCents = Math.round(gmvUsdCents * j.approxLocalPerUsd)
  const ratio = gmvLocalCents / j.thresholdLocalCents
  let status: 'TRACKING' | 'WARNING_70' | 'URGENT_90' | 'CROSSED' = 'TRACKING'
  if (ratio >= 1) status = 'CROSSED'
  else if (ratio >= 0.9) status = 'URGENT_90'
  else if (ratio >= 0.7) status = 'WARNING_70'
  return {
    jurisdiction: j,
    gmvUsdCents,
    gmvLocalCents,
    ratio,
    status,
  }
}
