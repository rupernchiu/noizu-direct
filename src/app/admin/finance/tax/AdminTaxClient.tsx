'use client'

/**
 * Admin tax & compliance dashboard — Phase 6.
 *
 * Five tabs:
 *   1. Destination          existing per-country YTD threshold tracker (preserved)
 *   2. Creator-Origin (PPh) per-country aggregate of withheld creator-origin tax
 *   3. Reverse-Charge B2B   orders where reverseChargeApplied = true
 *   4. Creator's Sales Tax  agency-collected sales tax (Layer 1.5)
 *   5. Platform Fee Tax     buyer/creator-side service fee tax
 *
 * Common filter bar above tabs:
 *   - Creator typeahead (queries /api/admin/creators/search)
 *   - Country select (uses enabledCreatorCountries() + 'All')
 *   - Period: month + year (or from/to date range)
 *
 * Filter state lives in URL query params for deep-linkability.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import {
  Receipt, Globe, Users, Download, AlertTriangle,
  Search, X, FileText, ShieldCheck, Layers, Banknote,
} from 'lucide-react'
import { enabledCreatorCountries, COUNTRIES } from '@/lib/countries'

// ─── Types from each endpoint ───────────────────────────────────────────────

type CountryRow = {
  country: string
  countryName: string
  taxLabel: string
  currency: string
  thresholdLocalCents: number
  ratePercent: number
  filingFormHint: string
  gmvUsdCents: number
  gmvLocalCents: number
  orders: number
  ratio: number
  status: 'TRACKING' | 'WARNING_70' | 'URGENT_90' | 'CROSSED'
}
type DestinationData = {
  fiscalYearStart: string
  perCountry: CountryRow[]
  unknownCountryGmvUsd: number
}

type OriginCreatorRow = {
  creatorId: string
  creatorName: string
  displayName: string | null
  email: string | null
  taxId: string | null
  country: string
  orderCount: number
  grossUsd: number
  withheldUsd: number
}
type OriginData = {
  period: { from: string; to: string; label: string; country: string; countryName: string }
  rule: { rate: number; label: string; ratePercent: number } | null
  totalGrossUsd: number
  totalWithheldUsd: number
  creatorCount: number
  orderCount: number
  creators: OriginCreatorRow[]
}

type ReverseRow = {
  id: string
  createdAt: string
  buyerCountry: string
  businessTaxId: string | null
  grossUsd: number
  notionalTaxUsd: number
  ratePercent: number
  label: string
  buyerName: string | null
  buyerEmail: string | null
  creatorDisplayName: string | null
}
type ReverseData = {
  period: { from: string; to: string; label: string }
  orderCount: number
  totalGrossUsd: number
  totalNotionalTaxUsd: number
  byCountry: { country: string; label: string; orderCount: number; grossUsd: number; notionalTaxUsd: number }[]
  orders: ReverseRow[]
}

type CreatorSalesRow = {
  creatorId: string
  displayName: string
  email: string | null
  taxId: string | null
  label: string | null
  country: string | null
  orderCount: number
  grossUsd: number
  collectedUsd: number
}
type CreatorSalesData = {
  period: { from: string; to: string; label: string }
  totalCollectedUsd: number
  creatorCount: number
  orderCount: number
  creators: CreatorSalesRow[]
}

type PlatformFeeBucket = {
  country: string
  label: string
  side: 'BUYER' | 'CREATOR'
  totalUsd: number
  orderCount: number
}
type PlatformFeeData = {
  period: { from: string; to: string; label: string }
  totalBuyerSideUsd: number
  totalCreatorSideUsd: number
  totalUsd: number
  orderCount: number
  byCountry: PlatformFeeBucket[]
}

type CreatorOption = {
  userId: string
  displayName: string
  username: string
  email: string | null
  name: string | null
  country: string | null
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'destination',  label: 'Destination',     icon: Globe },
  { id: 'origin',       label: 'Creator-Origin (PPh)', icon: Users },
  { id: 'reverse',      label: 'Reverse-Charge',  icon: ShieldCheck },
  { id: 'creator-sales', label: "Creator's Sales Tax", icon: Layers },
  { id: 'platform-fee', label: 'Platform Fee Tax', icon: Banknote },
] as const
type TabId = typeof TABS[number]['id']

function usd(cents: number) {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function localFmt(cents: number, currency: string) {
  const dp = currency === 'IDR' ? 0 : 2
  return `${currency} ${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp })}`
}
function statusBadge(status: CountryRow['status']) {
  const map: Record<CountryRow['status'], { label: string; cls: string }> = {
    TRACKING:    { label: 'Tracking',    cls: 'bg-muted/30 text-muted-foreground' },
    WARNING_70:  { label: '70% — start registration', cls: 'bg-yellow-500/20 text-yellow-400' },
    URGENT_90:   { label: '90% — URGENT',  cls: 'bg-orange-500/20 text-orange-400' },
    CROSSED:     { label: 'Crossed — overdue', cls: 'bg-red-500/20 text-red-400' },
  }
  const v = map[status]
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${v.cls}`}>{v.label}</span>
}

function MONTH_YEAR_DEFAULT() {
  const d = new Date()
  return { month: d.getUTCMonth() + 1, year: d.getUTCFullYear() }
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const inputCls = 'h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'
const selectCls = inputCls + ' cursor-pointer'

// ─── Common filter bar ──────────────────────────────────────────────────────

interface FilterState {
  tab: TabId
  period: string | null  // 'YYYY-MM'
  from: string | null
  to: string | null
  country: string | null
  creatorId: string | null
}

function useFilters(): [FilterState, (patch: Partial<FilterState>) => void] {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()

  const tab = (sp.get('tab') as TabId) || 'destination'
  const period = sp.get('period')
  const from = sp.get('from')
  const to = sp.get('to')
  const country = sp.get('country')
  const creatorId = sp.get('creatorId')

  const state: FilterState = { tab, period, from, to, country, creatorId }

  function setParams(patch: Partial<FilterState>) {
    const params = new URLSearchParams(sp.toString())
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === undefined || v === '') params.delete(k)
      else params.set(k, String(v))
    }
    router.replace(`${pathname}?${params.toString()}`)
  }

  return [state, setParams]
}

function CreatorTypeahead({
  value,
  onChange,
}: {
  value: string | null
  onChange: (creator: CreatorOption | null) => void
}) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<CreatorOption[]>([])
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<CreatorOption | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  // If value is set on mount but selected is empty, fetch the creator details.
  useEffect(() => {
    if (value && !selected) {
      // Best-effort lookup: use the creator id as a search term — the search
      // endpoint matches displayName/username/email/name, not id, so fall
      // back to displaying just the id. Caller can pass us a hydrated value
      // via setSelected after navigating from elsewhere.
      setSelected({
        userId: value,
        displayName: value.slice(0, 12) + '…',
        username: '',
        email: null,
        name: null,
        country: null,
      })
    }
    if (!value && selected) setSelected(null)
  }, [value]) // eslint-disable-line

  useEffect(() => {
    if (q.length < 2) { setResults([]); return }
    const t = setTimeout(() => {
      fetch(`/api/admin/creators/search?q=${encodeURIComponent(q)}&limit=10`)
        .then(r => r.ok ? r.json() : { creators: [] })
        .then(d => setResults(d.creators ?? []))
        .catch(() => setResults([]))
    }, 200)
    return () => clearTimeout(t)
  }, [q])

  useEffect(() => {
    function clickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', clickOutside)
    return () => document.removeEventListener('mousedown', clickOutside)
  }, [])

  return (
    <div className="relative" ref={ref}>
      {selected ? (
        <div className="flex items-center gap-2 h-9 px-3 rounded-lg border border-primary/30 bg-primary/5 text-sm">
          <span className="text-foreground font-medium">{selected.displayName}</span>
          {selected.email && <span className="text-muted-foreground text-xs">{selected.email}</span>}
          <button
            type="button"
            onClick={() => { onChange(null); setSelected(null); setQ(''); setOpen(false) }}
            className="ml-1 text-muted-foreground hover:text-foreground"
            aria-label="Clear creator filter"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search creator…"
            value={q}
            onChange={e => { setQ(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            className={`${inputCls} pl-9 w-64`}
          />
        </div>
      )}

      {!selected && open && results.length > 0 && (
        <div className="absolute left-0 right-0 mt-1 z-20 max-h-72 overflow-auto rounded-lg border border-border bg-card shadow-lg">
          {results.map(c => (
            <button
              key={c.userId}
              type="button"
              onClick={() => { setSelected(c); onChange(c); setQ(''); setOpen(false) }}
              className="w-full text-left px-3 py-2 hover:bg-muted/30 border-b border-border last:border-0"
            >
              <div className="text-sm text-foreground font-medium">{c.displayName}</div>
              <div className="text-xs text-muted-foreground">
                {c.email ?? c.username} {c.country ? ` · ${c.country}` : ''}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function FilterBar({ state, setState }: { state: FilterState; setState: (p: Partial<FilterState>) => void }) {
  const enabled = useMemo(() => enabledCreatorCountries(), [])
  const { month: defaultMonth, year: defaultYear } = MONTH_YEAR_DEFAULT()

  // Decompose period into month/year for the selects.
  const periodMatch = state.period?.match(/^(\d{4})-(\d{2})$/)
  const month = periodMatch ? parseInt(periodMatch[2], 10) : defaultMonth
  const year = periodMatch ? parseInt(periodMatch[1], 10) : defaultYear

  const yearOptions: number[] = []
  for (let y = defaultYear + 1; y >= defaultYear - 5; y--) yearOptions.push(y)

  function setPeriod(m: number, y: number) {
    setState({ period: `${y}-${String(m).padStart(2, '0')}`, from: null, to: null })
  }

  return (
    <div className="rounded-xl border border-border bg-card p-3 space-y-2">
      <div className="flex flex-wrap gap-2 items-center">
        <CreatorTypeahead
          value={state.creatorId}
          onChange={(c) => setState({ creatorId: c?.userId ?? null })}
        />

        <select
          className={selectCls}
          value={state.country ?? ''}
          onChange={e => setState({ country: e.target.value || null })}
        >
          <option value="">All countries</option>
          {enabled.map(c => (
            <option key={c.iso2} value={c.iso2}>{c.name} ({c.iso2})</option>
          ))}
        </select>

        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">Month:</span>
          <select
            className={selectCls}
            value={month}
            onChange={e => setPeriod(parseInt(e.target.value, 10), year)}
          >
            {MONTH_NAMES.map((n, i) => (
              <option key={i + 1} value={i + 1}>{n}</option>
            ))}
          </select>
          <select
            className={selectCls}
            value={year}
            onChange={e => setPeriod(month, parseInt(e.target.value, 10))}
          >
            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">Range:</span>
          <input
            type="date"
            className={inputCls + ' w-36'}
            value={state.from ?? ''}
            onChange={e => setState({ from: e.target.value || null, period: null })}
            placeholder="From"
          />
          <span className="text-xs text-muted-foreground">–</span>
          <input
            type="date"
            className={inputCls + ' w-36'}
            value={state.to ?? ''}
            onChange={e => setState({ to: e.target.value || null, period: null })}
            placeholder="To"
          />
        </div>

        {(state.creatorId || state.country || state.from || state.to) && (
          <button
            type="button"
            onClick={() => setState({ creatorId: null, country: null, from: null, to: null })}
            className="text-xs text-muted-foreground hover:text-foreground underline ml-auto"
          >
            Clear filters
          </button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Period precedence: month/year overrides date range. Filters are reflected in the URL — share a link to deep-link a view.
      </p>
    </div>
  )
}

// ─── Tabs ───────────────────────────────────────────────────────────────────

function buildQuery(state: FilterState, extras: Record<string, string | null | undefined> = {}) {
  const p = new URLSearchParams()
  if (state.period) p.set('period', state.period)
  if (state.from) p.set('from', state.from)
  if (state.to) p.set('to', state.to)
  if (state.country) p.set('country', state.country)
  if (state.creatorId) p.set('creatorId', state.creatorId)
  for (const [k, v] of Object.entries(extras)) if (v) p.set(k, v)
  return p.toString()
}

// ── Tab 1: Destination ──────────────────────────────────────────────────────

function DestinationTab({ state }: { state: FilterState }) {
  const [data, setData] = useState<DestinationData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch('/api/admin/finance/tax')
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // Filter by country if user picked one.
  const perCountry = useMemo(() => {
    if (!data) return []
    if (!state.country) return data.perCountry
    return data.perCountry.filter(c => c.country === state.country)
  }, [data, state.country])

  if (loading) return <div className="py-12 text-center text-muted-foreground text-sm">Loading destination tax data…</div>
  if (!data) return <div className="py-12 text-center text-red-400 text-sm">Failed to load.</div>
  const fyStart = new Date(data.fiscalYearStart).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">YTD since {fyStart}. Per-country GMV vs registration threshold.</p>
        <div className="flex gap-2">
          <a
            href={`/api/admin/finance/exports/tax?country=${state.country ?? 'MY'}&format=pdf`}
            className="text-xs text-primary hover:underline inline-flex items-center gap-1 px-2 py-1 border border-border rounded"
          >
            <FileText size={12} />Export PDF
          </a>
          <a
            href={`/api/admin/finance/exports/tax?country=${state.country ?? 'MY'}&format=csv`}
            className="text-xs text-primary hover:underline inline-flex items-center gap-1 px-2 py-1 border border-border rounded"
          >
            <Download size={12} />Export CSV
          </a>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm [&_td]:whitespace-nowrap">
          <thead>
            <tr className="text-xs text-muted-foreground border-b border-border bg-muted/20">
              <th className="px-3 py-2 text-left font-medium">Country</th>
              <th className="px-3 py-2 text-left font-medium">Tax</th>
              <th className="px-3 py-2 text-right font-medium">Threshold</th>
              <th className="px-3 py-2 text-right font-medium">YTD GMV</th>
              <th className="px-3 py-2 text-right font-medium">% of threshold</th>
              <th className="px-3 py-2 text-left font-medium">Status</th>
              <th className="px-3 py-2 text-right font-medium">Per-country export</th>
            </tr>
          </thead>
          <tbody>
            {perCountry.map(c => (
              <tr key={c.country} className="border-b border-border last:border-0 hover:bg-muted/10">
                <td className="px-3 py-2 font-semibold text-foreground">{c.countryName} ({c.country})</td>
                <td className="px-3 py-2 text-muted-foreground">{c.taxLabel} @ {c.ratePercent}%</td>
                <td className="px-3 py-2 text-right text-foreground">{localFmt(c.thresholdLocalCents, c.currency)}</td>
                <td className="px-3 py-2 text-right text-foreground">
                  <div>{localFmt(c.gmvLocalCents, c.currency)}</div>
                  <div className="text-xs text-muted-foreground">{usd(c.gmvUsdCents)} · {c.orders} orders</div>
                </td>
                <td className="px-3 py-2 text-right font-medium text-foreground">{(c.ratio * 100).toFixed(1)}%</td>
                <td className="px-3 py-2">{statusBadge(c.status)}</td>
                <td className="px-3 py-2 text-right">
                  <div className="flex justify-end gap-1.5">
                    <a
                      href={`/api/admin/finance/exports/tax?country=${c.country}&format=pdf`}
                      className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                    >
                      <FileText size={12} />PDF
                    </a>
                    <a
                      href={`/api/admin/finance/exports/tax?country=${c.country}&format=csv`}
                      className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                    >
                      <Download size={12} />CSV
                    </a>
                  </div>
                </td>
              </tr>
            ))}
            {perCountry.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground text-xs">No countries match the current filter.</td></tr>
            )}
            {!state.country && data.unknownCountryGmvUsd > 0 && (
              <tr className="bg-yellow-500/5">
                <td colSpan={3} className="px-3 py-2 text-yellow-400 flex items-center gap-1">
                  <AlertTriangle size={12} />Unknown country / pre-sprint-0.1 orders
                </td>
                <td className="px-3 py-2 text-right text-yellow-400">{usd(data.unknownCountryGmvUsd)}</td>
                <td colSpan={3} className="px-3 py-2 text-xs text-muted-foreground">
                  Backfill `buyerCountry` once 0008 migration is applied.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Local-currency conversion uses approximate FX for display. Exact filings use the daily Airwallex FX rate.
      </p>
    </div>
  )
}

// ── Tab 2: Creator-Origin (PPh) ─────────────────────────────────────────────

function OriginTab({ state }: { state: FilterState }) {
  const [data, setData] = useState<OriginData | null>(null)
  const [loading, setLoading] = useState(true)
  // For origin tab, default to ID if no country selected.
  const country = state.country ?? 'ID'
  useEffect(() => {
    setLoading(true)
    const q = buildQuery({ ...state, country })
    fetch(`/api/admin/finance/tax/origin?${q}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [state.period, state.from, state.to, state.creatorId, country]) // eslint-disable-line

  const exportQuery = buildQuery({ ...state, country })

  if (loading) return <div className="py-12 text-center text-muted-foreground text-sm">Loading creator-origin tax…</div>
  if (!data) return <div className="py-12 text-center text-red-400 text-sm">Failed to load.</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            {data.rule?.label ?? 'Creator-origin tax'} — {data.period.countryName} ({data.period.country})
          </h3>
          <p className="text-xs text-muted-foreground">
            Period: {data.period.label} · {data.creatorCount} creators · {data.orderCount} orders
            {data.rule ? ` · Rate ${data.rule.ratePercent}%` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href={`/api/admin/finance/exports/origin-tax?${exportQuery}&format=pdf`}
            className="text-xs text-primary hover:underline inline-flex items-center gap-1 px-2 py-1 border border-border rounded"
          >
            <FileText size={12} />Export PDF
          </a>
          <a
            href={`/api/admin/finance/exports/origin-tax?${exportQuery}&format=csv`}
            className="text-xs text-primary hover:underline inline-flex items-center gap-1 px-2 py-1 border border-border rounded"
          >
            <Download size={12} />Export CSV
          </a>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <SummaryCard label="Total gross subject" value={usd(data.totalGrossUsd)} />
        <SummaryCard label="Total withheld" value={usd(data.totalWithheldUsd)} highlight />
        <SummaryCard label="Creators / orders" value={`${data.creatorCount} · ${data.orderCount}`} />
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm [&_td]:whitespace-nowrap">
          <thead>
            <tr className="text-xs text-muted-foreground border-b border-border bg-muted/20">
              <th className="px-3 py-2 text-left font-medium">Creator</th>
              <th className="px-3 py-2 text-left font-medium">Tax ID</th>
              <th className="px-3 py-2 text-right font-medium">Orders</th>
              <th className="px-3 py-2 text-right font-medium">Gross</th>
              <th className="px-3 py-2 text-right font-medium">Withheld</th>
            </tr>
          </thead>
          <tbody>
            {data.creators.length === 0 ? (
              <tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground text-xs">No creator-origin tax withholding for this period / country / creator.</td></tr>
            ) : data.creators.map(c => (
              <tr key={c.creatorId} className="border-b border-border last:border-0 hover:bg-muted/10">
                <td className="px-3 py-2">
                  <div className="text-sm text-foreground font-medium">{c.displayName ?? c.creatorName}</div>
                  <div className="text-xs text-muted-foreground">{c.email ?? '—'}</div>
                </td>
                <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{c.taxId ?? '—'}</td>
                <td className="px-3 py-2 text-right text-muted-foreground">{c.orderCount}</td>
                <td className="px-3 py-2 text-right text-foreground">{usd(c.grossUsd)}</td>
                <td className="px-3 py-2 text-right font-semibold text-primary">{usd(c.withheldUsd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        DJP-filing report for {data.period.countryName}. Hand to a registered tax agent (konsultan pajak) for monthly submission.
      </p>
    </div>
  )
}

// ── Tab 3: Reverse-Charge ───────────────────────────────────────────────────

function ReverseTab({ state }: { state: FilterState }) {
  const [data, setData] = useState<ReverseData | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    setLoading(true)
    const q = buildQuery(state)
    fetch(`/api/admin/finance/tax/reverse-charge?${q}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [state.period, state.from, state.to, state.country, state.creatorId]) // eslint-disable-line

  if (loading) return <div className="py-12 text-center text-muted-foreground text-sm">Loading reverse-charge orders…</div>
  if (!data) return <div className="py-12 text-center text-red-400 text-sm">Failed to load.</div>

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">B2B reverse-charge orders</h3>
        <p className="text-xs text-muted-foreground">
          Period: {data.period.label} · {data.orderCount} orders · {usd(data.totalNotionalTaxUsd)} notional tax not collected
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <SummaryCard label="Orders" value={String(data.orderCount)} />
        <SummaryCard label="Total gross" value={usd(data.totalGrossUsd)} />
        <SummaryCard label="Notional tax (uncollected)" value={usd(data.totalNotionalTaxUsd)} highlight />
      </div>

      {data.byCountry.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-3 py-2 text-xs text-muted-foreground bg-muted/20 border-b border-border">By buyer country</div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-border">
                <th className="px-3 py-2 text-left font-medium">Country</th>
                <th className="px-3 py-2 text-right font-medium">Orders</th>
                <th className="px-3 py-2 text-right font-medium">Gross</th>
                <th className="px-3 py-2 text-right font-medium">Notional tax</th>
              </tr>
            </thead>
            <tbody>
              {data.byCountry.map(c => (
                <tr key={c.country} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 text-foreground">{COUNTRIES[c.country]?.name ?? c.country} ({c.country}) · {c.label}</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{c.orderCount}</td>
                  <td className="px-3 py-2 text-right text-foreground">{usd(c.grossUsd)}</td>
                  <td className="px-3 py-2 text-right text-primary">{usd(c.notionalTaxUsd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-3 py-2 text-xs text-muted-foreground bg-muted/20 border-b border-border">Order detail</div>
        <table className="w-full text-sm [&_td]:whitespace-nowrap">
          <thead>
            <tr className="text-xs text-muted-foreground border-b border-border">
              <th className="px-3 py-2 text-left font-medium">Order</th>
              <th className="px-3 py-2 text-left font-medium">Date</th>
              <th className="px-3 py-2 text-left font-medium">Buyer</th>
              <th className="px-3 py-2 text-left font-medium">Country</th>
              <th className="px-3 py-2 text-left font-medium">Business Tax ID</th>
              <th className="px-3 py-2 text-left font-medium">Creator</th>
              <th className="px-3 py-2 text-right font-medium">Gross</th>
              <th className="px-3 py-2 text-right font-medium">Notional tax</th>
            </tr>
          </thead>
          <tbody>
            {data.orders.length === 0 ? (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground text-xs">No reverse-charge orders for this period / filter.</td></tr>
            ) : data.orders.map(o => (
              <tr key={o.id} className="border-b border-border last:border-0 hover:bg-muted/10">
                <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{o.id.slice(0, 10)}…</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{o.createdAt.slice(0, 10)}</td>
                <td className="px-3 py-2">
                  <div className="text-sm text-foreground">{o.buyerName ?? '—'}</div>
                  <div className="text-xs text-muted-foreground">{o.buyerEmail ?? ''}</div>
                </td>
                <td className="px-3 py-2 text-foreground">{o.buyerCountry} · {o.label}</td>
                <td className="px-3 py-2 font-mono text-xs">{o.businessTaxId ?? '—'}</td>
                <td className="px-3 py-2 text-foreground text-xs">{o.creatorDisplayName ?? '—'}</td>
                <td className="px-3 py-2 text-right text-foreground">{usd(o.grossUsd)}</td>
                <td className="px-3 py-2 text-right text-primary">{usd(o.notionalTaxUsd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Reverse-charge orders are forensic — the platform did not collect tax; the buyer's business self-assesses.
        Audit purposes only — no PDF/CSV export shipped at this stage.
      </p>
    </div>
  )
}

// ── Tab 4: Creator's Sales Tax ──────────────────────────────────────────────

function CreatorSalesTab({ state }: { state: FilterState }) {
  const [data, setData] = useState<CreatorSalesData | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    setLoading(true)
    const q = buildQuery(state)
    fetch(`/api/admin/finance/tax/creator-sales?${q}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [state.period, state.from, state.to, state.country, state.creatorId]) // eslint-disable-line

  if (loading) return <div className="py-12 text-center text-muted-foreground text-sm">Loading creator's sales tax…</div>
  if (!data) return <div className="py-12 text-center text-red-400 text-sm">Failed to load.</div>

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Creator's sales tax (Layer 1.5 — agency-collected)</h3>
        <p className="text-xs text-muted-foreground">
          Period: {data.period.label} · {data.creatorCount} creators · {data.orderCount} orders
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <SummaryCard label="Total collected" value={usd(data.totalCollectedUsd)} highlight />
        <SummaryCard label="Creators" value={String(data.creatorCount)} />
        <SummaryCard label="Orders" value={String(data.orderCount)} />
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm [&_td]:whitespace-nowrap">
          <thead>
            <tr className="text-xs text-muted-foreground border-b border-border bg-muted/20">
              <th className="px-3 py-2 text-left font-medium">Creator</th>
              <th className="px-3 py-2 text-left font-medium">Country / Label</th>
              <th className="px-3 py-2 text-left font-medium">Tax ID</th>
              <th className="px-3 py-2 text-right font-medium">Orders</th>
              <th className="px-3 py-2 text-right font-medium">Gross</th>
              <th className="px-3 py-2 text-right font-medium">Collected</th>
            </tr>
          </thead>
          <tbody>
            {data.creators.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-12 text-center text-muted-foreground text-xs">
                  No agency-collected creator sales tax for this period.
                  <br />
                  <span className="text-[10px]">Creators must opt into Layer 1.5 via the sales-tax onboarding flow (Phase 7).</span>
                </td>
              </tr>
            ) : data.creators.map(c => (
              <tr key={c.creatorId} className="border-b border-border last:border-0 hover:bg-muted/10">
                <td className="px-3 py-2">
                  <div className="text-sm text-foreground font-medium">{c.displayName}</div>
                  <div className="text-xs text-muted-foreground">{c.email ?? '—'}</div>
                </td>
                <td className="px-3 py-2 text-foreground">
                  {c.country ?? '—'} {c.label ? `· ${c.label}` : ''}
                </td>
                <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{c.taxId ?? '—'}</td>
                <td className="px-3 py-2 text-right text-muted-foreground">{c.orderCount}</td>
                <td className="px-3 py-2 text-right text-foreground">{usd(c.grossUsd)}</td>
                <td className="px-3 py-2 text-right font-semibold text-primary">{usd(c.collectedUsd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Tab 5: Platform Fee Tax ─────────────────────────────────────────────────

function PlatformFeeTab({ state }: { state: FilterState }) {
  const [data, setData] = useState<PlatformFeeData | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    setLoading(true)
    const q = buildQuery(state)
    fetch(`/api/admin/finance/tax/platform-fee?${q}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [state.period, state.from, state.to, state.country]) // eslint-disable-line

  if (loading) return <div className="py-12 text-center text-muted-foreground text-sm">Loading platform fee tax…</div>
  if (!data) return <div className="py-12 text-center text-red-400 text-sm">Failed to load.</div>

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Platform service-fee tax</h3>
        <p className="text-xs text-muted-foreground">
          Period: {data.period.label} · {data.orderCount} orders. Buyer-side: tax on noizu.direct's buyer service fee. Creator-side: tax on commission.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <SummaryCard label="Buyer-side total" value={usd(data.totalBuyerSideUsd)} />
        <SummaryCard label="Creator-side total" value={usd(data.totalCreatorSideUsd)} />
        <SummaryCard label="Combined" value={usd(data.totalUsd)} highlight />
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm [&_td]:whitespace-nowrap">
          <thead>
            <tr className="text-xs text-muted-foreground border-b border-border bg-muted/20">
              <th className="px-3 py-2 text-left font-medium">Country</th>
              <th className="px-3 py-2 text-left font-medium">Side</th>
              <th className="px-3 py-2 text-left font-medium">Tax label</th>
              <th className="px-3 py-2 text-right font-medium">Orders</th>
              <th className="px-3 py-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.byCountry.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-12 text-center text-muted-foreground text-xs">
                  No platform-fee tax collected in this period.
                  <br />
                  <span className="text-[10px]">Application logic ships in Phase 8.</span>
                </td>
              </tr>
            ) : data.byCountry.map((b, i) => (
              <tr key={`${b.country}-${b.side}-${i}`} className="border-b border-border last:border-0 hover:bg-muted/10">
                <td className="px-3 py-2 text-foreground">{COUNTRIES[b.country]?.name ?? b.country} ({b.country})</td>
                <td className="px-3 py-2">
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs ${b.side === 'BUYER' ? 'bg-blue-500/15 text-blue-400' : 'bg-purple-500/15 text-purple-400'}`}>
                    {b.side === 'BUYER' ? 'Buyer-side' : 'Creator-side'}
                  </span>
                </td>
                <td className="px-3 py-2 text-muted-foreground">{b.label}</td>
                <td className="px-3 py-2 text-right text-muted-foreground">{b.orderCount}</td>
                <td className="px-3 py-2 text-right font-semibold text-primary">{usd(b.totalUsd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Reusable summary card ──────────────────────────────────────────────────

function SummaryCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border ${highlight ? 'border-primary/40 bg-primary/5' : 'border-border bg-card'} p-3`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 text-lg font-semibold ${highlight ? 'text-primary' : 'text-foreground'}`}>{value}</div>
    </div>
  )
}

// ─── Main entry ─────────────────────────────────────────────────────────────

export default function AdminTaxClient() {
  const [state, setState] = useFilters()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Receipt size={20} />Tax & Compliance
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Five-layer tax view. Filings always go through a registered tax agent; this dashboard is a data feed.
        </p>
      </div>

      <FilterBar state={state} setState={setState} />

      {/* Tab navigation */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {TABS.map(t => {
          const Icon = t.icon
          const active = state.tab === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setState({ tab: t.id })}
              className={`px-3 py-2 text-sm flex items-center gap-1.5 whitespace-nowrap border-b-2 -mb-px transition-colors ${
                active
                  ? 'border-primary text-foreground font-medium'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon size={14} />{t.label}
            </button>
          )
        })}
      </div>

      {/* Active tab body */}
      <div>
        {state.tab === 'destination' && <DestinationTab state={state} />}
        {state.tab === 'origin' && <OriginTab state={state} />}
        {state.tab === 'reverse' && <ReverseTab state={state} />}
        {state.tab === 'creator-sales' && <CreatorSalesTab state={state} />}
        {state.tab === 'platform-fee' && <PlatformFeeTab state={state} />}
      </div>

      {/* Compliance reminder */}
      <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4 text-sm">
        <div className="flex items-start gap-2">
          <AlertTriangle size={16} className="text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-400">Compliance posture: data feed, not substitute</p>
            <p className="text-xs text-muted-foreground mt-1">
              Threshold ratios use approximate FX. Filings must use the daily Airwallex rate from the transaction date.
              Hand exports to a registered tax agent (MY: GST/SST agent · SG: GST tax agent · ID: konsultan pajak) before submission.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
