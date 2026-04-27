/**
 * SEA tax registration thresholds + per-country VAT/GST/SST rates.
 *
 * Thresholds are *destination* values — when annual GMV from buyers in country
 * X crosses the threshold, the platform must register and collect that
 * country's marketplace facilitator tax on subsequent sales to that country.
 *
 * Amounts are in local currency cents (e.g. RM 500,000.00 → 500_000_00).
 *
 * 2026-04-27: country list + base rates now derived from src/lib/countries.ts.
 * Filing-specific metadata (currency, approxLocalPerUsd, filingFormHint, notes,
 * local-currency threshold) lives here because it's only needed by the admin
 * tax dashboard. Public API (TAX_JURISDICTIONS, jurisdictionFor, thresholdStatus)
 * is preserved.
 */

import { COUNTRIES, type CountryRecord } from '@/lib/countries'

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

interface FilingMetadata {
  currency: string
  thresholdLocalCents: number
  approxLocalPerUsd: number
  filingFormHint: string
  notes: string
}

// Filing-specific metadata that doesn't live in CountryRecord.
// Keyed by ISO-2 country code; only populated for jurisdictions where the
// platform is (or may become) a deemed supplier — i.e. those with a
// destinationTax block in COUNTRIES.
const FILING_METADATA: Record<string, FilingMetadata> = {
  MY: {
    currency: 'MYR',
    thresholdLocalCents: 500_000_00,
    approxLocalPerUsd: 4.7,
    filingFormHint: 'SST-02 (Royal Malaysian Customs)',
    notes: 'Marketplace facilitator scope; service tax (digital) at 8%.',
  },
  SG: {
    currency: 'SGD',
    thresholdLocalCents: 100_000_00,
    approxLocalPerUsd: 1.34,
    filingFormHint: 'GST F5 (IRAS)',
    notes: 'Overseas Vendor Registration regime for B2C digital services.',
  },
  ID: {
    currency: 'IDR',
    // 600,000,000.00 IDR — Rupiah is 2 decimal places officially but we store
    // cents the same way. Approximation only used for dashboard display.
    thresholdLocalCents: 600_000_000_00,
    approxLocalPerUsd: 16500,
    filingFormHint: 'PPN PMSE return (DJP)',
    notes: 'PMSE regime — non-resident digital sellers above turnover/users thresholds.',
  },
  TH: {
    currency: 'THB',
    thresholdLocalCents: 1_800_000_00,
    approxLocalPerUsd: 36.5,
    filingFormHint: 'VAT return (Revenue Department)',
    notes: 'Non-resident e-service VAT registration above THB 1.8M.',
  },
  PH: {
    currency: 'PHP',
    thresholdLocalCents: 3_000_000_00,
    approxLocalPerUsd: 57,
    filingFormHint: 'BIR Form 2550M/2550Q',
    notes: 'Digital services tax effective 2024 — non-resident DSPs.',
  },
}

// Iteration order matches the historical TAX_JURISDICTIONS literal: MY, SG, ID, TH, PH.
const JURISDICTION_ORDER = ['MY', 'SG', 'ID', 'TH', 'PH'] as const

function buildJurisdiction(c: CountryRecord, m: FilingMetadata): TaxJurisdiction {
  // destinationTax is guaranteed non-null for entries that have FILING_METADATA
  // entries, but TS doesn't know that — handle defensively.
  const tax = c.destinationTax!
  return {
    country: c.iso2,
    countryName: c.name,
    taxLabel: tax.label,
    currency: m.currency,
    thresholdLocalCents: m.thresholdLocalCents,
    ratePercent: Math.round(tax.rate * 100 * 1000) / 1000, // strip FP noise
    approxLocalPerUsd: m.approxLocalPerUsd,
    filingFormHint: m.filingFormHint,
    notes: m.notes,
  }
}

export const TAX_JURISDICTIONS: TaxJurisdiction[] = JURISDICTION_ORDER
  .map((code) => {
    const c = COUNTRIES[code]
    const m = FILING_METADATA[code]
    if (!c || !c.destinationTax || !m) return null
    return buildJurisdiction(c, m)
  })
  .filter((x): x is TaxJurisdiction => x !== null)

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
