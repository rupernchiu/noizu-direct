'use client'

/**
 * Client component for the creator tax & earnings statement.
 *
 * - Period preset dropdown ("This year", "Last year", "This quarter",
 *   "This month", "Last month", "Custom") + explicit month/year selects.
 * - Conditional sections per spec §3.4: zero-amount sections do NOT render.
 * - "Print PDF" hits the export endpoint with the same filters.
 * - "Download PPh certificate" only visible if creator is ID and a withheld
 *   order exists in the resolved year.
 */
import { useCallback, useMemo, useState } from 'react'
import { Download, FileText, Printer, RefreshCw } from 'lucide-react'

// Local mirror of the API response — keeping it inline avoids importing types
// from a route file (which Next.js disallows).
interface SalesByCountry {
  country: string
  countryName: string
  orderCount: number
  grossUsd: number
  netUsd: number
}

interface TaxStatement {
  period: { from: string; to: string; month: number | null; year: number | null; label: string }
  creator: {
    name: string
    legalFullName: string | null
    country: string | null
    countryName: string | null
    classification: string | null
    hasOriginTax: boolean
    originTaxLabel: string | null
    canDownloadPphCertificate: boolean
  }
  earnings: {
    grossUsd: number
    commissionUsd: number
    commissionTaxUsd: number
    withheldPphUsd: number
    netUsd: number
    orderCount: number
  }
  withheldAtPayout: {
    totalUsd: number
    label: string
    country: string
    countryName: string
  } | null
  collectedFromBuyers: {
    totalUsd: number
    label: string
    orderCount: number
  } | null
  collectedByPlatform: {
    destinationTax: { country: string; countryName: string; label: string; totalUsd: number }[]
    serviceFeeTax: number
    hasAny: boolean
  }
  salesByCountry: SalesByCountry[]
}

type Preset = 'thisYear' | 'lastYear' | 'thisQuarter' | 'thisMonth' | 'lastMonth' | 'custom'

const PRESET_OPTIONS: { value: Preset; label: string }[] = [
  { value: 'thisYear', label: 'This year' },
  { value: 'lastYear', label: 'Last year' },
  { value: 'thisQuarter', label: 'This quarter' },
  { value: 'thisMonth', label: 'This month' },
  { value: 'lastMonth', label: 'Last month' },
  { value: 'custom', label: 'Custom…' },
]

const MONTH_OPTIONS = [
  { v: 0, label: 'Any month' },
  { v: 1, label: 'January' },
  { v: 2, label: 'February' },
  { v: 3, label: 'March' },
  { v: 4, label: 'April' },
  { v: 5, label: 'May' },
  { v: 6, label: 'June' },
  { v: 7, label: 'July' },
  { v: 8, label: 'August' },
  { v: 9, label: 'September' },
  { v: 10, label: 'October' },
  { v: 11, label: 'November' },
  { v: 12, label: 'December' },
]

function fmt(cents: number): string {
  const sign = cents < 0 ? '-' : ''
  const abs = Math.abs(cents)
  return `${sign}$${(abs / 100).toFixed(2)}`
}

interface FilterState {
  preset: Preset
  /** 0 = any */
  month: number
  /** 0 = use preset */
  year: number
  /** ISO yyyy-mm-dd, only when preset = custom */
  from: string
  to: string
}

function defaultFilterState(): FilterState {
  return { preset: 'thisYear', month: 0, year: 0, from: '', to: '' }
}

function buildQueryString(f: FilterState): string {
  const params = new URLSearchParams()

  // If user explicitly picked month + year, those win.
  if (f.month > 0 && f.year > 0) {
    params.set('month', String(f.month))
    params.set('year', String(f.year))
    return params.toString()
  }

  // If only year, send year.
  if (f.year > 0 && f.month === 0) {
    params.set('year', String(f.year))
    return params.toString()
  }

  // Otherwise resolve preset.
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth() // 0-11
  if (f.preset === 'thisYear') {
    params.set('year', String(y))
  } else if (f.preset === 'lastYear') {
    params.set('year', String(y - 1))
  } else if (f.preset === 'thisMonth') {
    params.set('month', String(m + 1))
    params.set('year', String(y))
  } else if (f.preset === 'lastMonth') {
    const lm = m === 0 ? 12 : m
    const ly = m === 0 ? y - 1 : y
    params.set('month', String(lm))
    params.set('year', String(ly))
  } else if (f.preset === 'thisQuarter') {
    const qStartMonth = Math.floor(m / 3) * 3
    const from = new Date(Date.UTC(y, qStartMonth, 1)).toISOString()
    const to = new Date(Date.UTC(y, qStartMonth + 3, 1)).toISOString()
    params.set('from', from)
    params.set('to', to)
  } else if (f.preset === 'custom') {
    if (f.from) params.set('from', f.from)
    if (f.to) params.set('to', f.to)
  }
  return params.toString()
}

export function TaxStatementClient({ initial }: { initial: TaxStatement }) {
  const [data, setData] = useState<TaxStatement>(initial)
  const [filters, setFilters] = useState<FilterState>(defaultFilterState())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const yearOptions = useMemo(() => {
    const cur = new Date().getUTCFullYear()
    const arr: { v: number; label: string }[] = [{ v: 0, label: 'Any year' }]
    for (let y = cur; y >= cur - 5; y--) arr.push({ v: y, label: String(y) })
    return arr
  }, [])

  const apply = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const qs = buildQueryString(filters)
      const res = await fetch(`/api/dashboard/finance/tax?${qs}`, { cache: 'no-store' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error ?? 'Failed to load statement')
      }
      const next = (await res.json()) as TaxStatement
      setData(next)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load statement')
    } finally {
      setLoading(false)
    }
  }, [filters])

  const exportPdf = useCallback(() => {
    const qs = buildQueryString(filters)
    window.location.href = `/api/dashboard/finance/tax/export?${qs}`
  }, [filters])

  const downloadPph = useCallback(() => {
    const year = data.period.year ?? new Date().getUTCFullYear()
    window.location.href = `/api/dashboard/finance/tax/pph-certificate?year=${year}`
  }, [data.period.year])

  return (
    <div className="space-y-6">
      {/* Filter bar */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Period</label>
            <select
              value={filters.preset}
              onChange={(e) => setFilters((f) => ({ ...f, preset: e.target.value as Preset }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              {PRESET_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1">Month (override)</label>
            <select
              value={filters.month}
              onChange={(e) => setFilters((f) => ({ ...f, month: parseInt(e.target.value, 10) }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              {MONTH_OPTIONS.map((o) => (
                <option key={o.v} value={o.v}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1">Year (override)</label>
            <select
              value={filters.year}
              onChange={(e) => setFilters((f) => ({ ...f, year: parseInt(e.target.value, 10) }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              {yearOptions.map((o) => (
                <option key={o.v} value={o.v}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={apply}
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-medium transition-colors disabled:opacity-60"
            >
              {loading ? <RefreshCw className="size-4 animate-spin" /> : null}
              Apply
            </button>
          </div>
        </div>

        {filters.preset === 'custom' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">From</label>
              <input
                type="date"
                value={filters.from}
                onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">To</label>
              <input
                type="date"
                value={filters.to}
                onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between flex-wrap gap-3 pt-2 border-t border-border">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-medium text-foreground">{data.period.label}</span>
            {data.creator.country ? (
              <>
                {' '}
                · {data.creator.countryName}
                {data.creator.classification ? (
                  <span className="text-muted-foreground/80">
                    {' '}
                    ({data.creator.classification === 'INDIVIDUAL' ? 'Individual' : 'Registered Business'})
                  </span>
                ) : null}
              </>
            ) : null}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={exportPdf}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
            >
              <Printer className="size-4" />
              Print PDF
            </button>
            {data.creator.canDownloadPphCertificate && (
              <button
                onClick={downloadPph}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
              >
                <Download className="size-4" />
                PPh certificate
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Empty state */}
      {data.earnings.orderCount === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center text-muted-foreground">
          <FileText className="size-8 mx-auto mb-3 text-muted-foreground/60" />
          <p className="font-medium text-foreground">No paid orders in this period</p>
          <p className="text-sm mt-1">Try selecting a different period or check back after your first sale.</p>
        </div>
      ) : (
        <>
          {/* EARNINGS SUMMARY */}
          <section className="rounded-xl border border-border bg-card p-5 space-y-3">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Earnings Summary</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <Stat label={`Gross sales (${data.earnings.orderCount} orders)`} value={fmt(data.earnings.grossUsd)} />
              <Stat label="Platform commission" value={`−${fmt(data.earnings.commissionUsd)}`} muted />
              {data.earnings.commissionTaxUsd > 0 && (
                <Stat label="Tax on commission" value={`−${fmt(data.earnings.commissionTaxUsd)}`} muted />
              )}
              {data.earnings.withheldPphUsd > 0 && (
                <Stat
                  label={`Withheld ${data.creator.originTaxLabel ?? 'tax'}`}
                  value={`−${fmt(data.earnings.withheldPphUsd)}`}
                  muted
                />
              )}
              <Stat label="Net to your account" value={fmt(data.earnings.netUsd)} highlight />
            </div>
          </section>

          {/* WITHHELD AT PAYOUT — only if applicable */}
          {data.withheldAtPayout && (
            <section className="rounded-xl border border-border bg-card p-5 space-y-3">
              <div>
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Withheld at Payout</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  noizu.direct withheld and remits this on your behalf to {data.withheldAtPayout.countryName}'s tax authority.
                </p>
              </div>
              <div className="flex items-baseline justify-between border-t border-border pt-3">
                <span className="text-sm text-foreground">
                  {data.withheldAtPayout.label} ({data.withheldAtPayout.country})
                </span>
                <span className="text-lg font-semibold text-foreground">{fmt(data.withheldAtPayout.totalUsd)}</span>
              </div>
            </section>
          )}

          {/* COLLECTED FROM BUYERS ON YOUR BEHALF — only if creator opted in */}
          {data.collectedFromBuyers && (
            <section className="rounded-xl border border-border bg-card p-5 space-y-3">
              <div>
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                  Collected From Buyers On Your Behalf
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  You opted in to collect {data.collectedFromBuyers.label}. Pass-through in your payout — you owe this to your tax authority.
                </p>
              </div>
              <div className="flex items-baseline justify-between border-t border-border pt-3">
                <span className="text-sm text-foreground">
                  {data.collectedFromBuyers.label} · {data.collectedFromBuyers.orderCount} order
                  {data.collectedFromBuyers.orderCount === 1 ? '' : 's'}
                </span>
                <span className="text-lg font-semibold text-foreground">{fmt(data.collectedFromBuyers.totalUsd)}</span>
              </div>
            </section>
          )}

          {/* COLLECTED BY noizu.direct — informational, only when something exists */}
          {data.collectedByPlatform.hasAny && (
            <section className="rounded-xl border border-border bg-card p-5 space-y-3">
              <div>
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Collected by noizu.direct</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Informational. Not your money — noizu.direct files this directly.
                </p>
              </div>
              <div className="border-t border-border divide-y divide-border">
                {data.collectedByPlatform.destinationTax.map((d) => (
                  <div key={d.country} className="flex items-center justify-between py-2 text-sm">
                    <span className="text-muted-foreground">
                      Destination {d.label} ({d.countryName})
                    </span>
                    <span className="text-foreground">{fmt(d.totalUsd)}</span>
                  </div>
                ))}
                {data.collectedByPlatform.serviceFeeTax > 0 && (
                  <div className="flex items-center justify-between py-2 text-sm">
                    <span className="text-muted-foreground">Tax on noizu.direct service fee (buyer side)</span>
                    <span className="text-foreground">{fmt(data.collectedByPlatform.serviceFeeTax)}</span>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* SALES BY BUYER COUNTRY */}
          {data.salesByCountry.length > 0 && (
            <section className="rounded-xl border border-border bg-card p-5 space-y-3">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Sales by Buyer Country</h2>
              <div className="overflow-x-auto -mx-2">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-muted-foreground border-b border-border">
                      <th className="text-left px-2 py-2 font-medium">Country</th>
                      <th className="text-right px-2 py-2 font-medium">Orders</th>
                      <th className="text-right px-2 py-2 font-medium">Gross</th>
                      <th className="text-right px-2 py-2 font-medium">Net</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.salesByCountry.map((r) => (
                      <tr key={r.country}>
                        <td className="px-2 py-2 text-foreground">{r.countryName}</td>
                        <td className="px-2 py-2 text-right text-muted-foreground">{r.orderCount}</td>
                        <td className="px-2 py-2 text-right text-foreground">{fmt(r.grossUsd)}</td>
                        <td className="px-2 py-2 text-right text-foreground">{fmt(r.netUsd)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Footer */}
          <p className="text-xs text-muted-foreground px-2">
            noizu.direct provides escrow and payment-handling. Goods are sold and shipped by the creator. For tax filing
            questions, consult a local accountant.
          </p>
        </>
      )}
    </div>
  )
}

function Stat({
  label,
  value,
  muted,
  highlight,
}: {
  label: string
  value: string
  muted?: boolean
  highlight?: boolean
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        highlight ? 'border-primary/30 bg-primary/5' : 'border-border bg-background'
      }`}
    >
      <p className="text-[11px] text-muted-foreground mb-1">{label}</p>
      <p
        className={`text-base font-semibold ${
          highlight ? 'text-primary' : muted ? 'text-muted-foreground' : 'text-foreground'
        }`}
      >
        {value}
      </p>
    </div>
  )
}
