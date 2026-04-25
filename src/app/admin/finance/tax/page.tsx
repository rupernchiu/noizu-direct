'use client'
import { useEffect, useState } from 'react'
import { Receipt, Globe, Users, Download, AlertTriangle } from 'lucide-react'

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

type CreatorRow = {
  creatorId: string
  email: string | null
  grossUsd: number
  commissionUsd: number
  netUsd: number
  orders: number
}

type TaxData = {
  fiscalYearStart: string
  perCountry: CountryRow[]
  unknownCountryGmvUsd: number
  perCreator: CreatorRow[]
}

function usd(cents: number) {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function localFmt(cents: number, currency: string) {
  // Approx — IDR has 0 dp in practice, others 2
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

export default function TaxPage() {
  const [data, setData] = useState<TaxData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/finance/tax')
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-24 text-muted-foreground">Loading tax position…</div>
  if (!data) return <div className="py-24 text-center text-red-400">Failed to load tax data.</div>

  const fyStart = new Date(data.fiscalYearStart).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Receipt size={20} />Tax & Compliance</h1>
        <p className="text-sm text-muted-foreground mt-1">YTD since {fyStart}. Data feed only — exports go to your accountant.</p>
      </div>

      {/* Per-country threshold tracker */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
          <Globe size={14} />Per-country GMV vs registration threshold
        </h2>
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
                <th className="px-3 py-2 text-right font-medium">Export</th>
              </tr>
            </thead>
            <tbody>
              {data.perCountry.map(c => (
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
                    <a
                      href={`/api/admin/finance/exports/tax?country=${c.country}`}
                      className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                    >
                      <Download size={12} />CSV
                    </a>
                  </td>
                </tr>
              ))}
              {data.unknownCountryGmvUsd > 0 && (
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
        <p className="text-xs text-muted-foreground mt-2">
          Local-currency conversion uses approximate FX for display. Exact filings use Airwallex daily FX rate.
        </p>
      </div>

      {/* Top-100 creator tax view */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
          <Users size={14} />Top creators YTD (for income tax statements)
        </h2>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm [&_td]:whitespace-nowrap">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-border bg-muted/20">
                <th className="px-3 py-2 text-left font-medium">Creator</th>
                <th className="px-3 py-2 text-right font-medium">Orders</th>
                <th className="px-3 py-2 text-right font-medium">Gross</th>
                <th className="px-3 py-2 text-right font-medium">Commission</th>
                <th className="px-3 py-2 text-right font-medium">Net (taxable to creator)</th>
                <th className="px-3 py-2 text-right font-medium">Statement</th>
              </tr>
            </thead>
            <tbody>
              {data.perCreator.length === 0 ? (
                <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground text-xs">No creator earnings yet this fiscal year.</td></tr>
              ) : data.perCreator.map(c => (
                <tr key={c.creatorId} className="border-b border-border last:border-0 hover:bg-muted/10">
                  <td className="px-3 py-2 text-foreground">
                    <div className="text-xs">{c.email ?? '—'}</div>
                    <div className="text-xs text-muted-foreground font-mono">{c.creatorId.slice(0, 10)}…</div>
                  </td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{c.orders}</td>
                  <td className="px-3 py-2 text-right text-foreground">{usd(c.grossUsd)}</td>
                  <td className="px-3 py-2 text-right text-primary">{usd(c.commissionUsd)}</td>
                  <td className="px-3 py-2 text-right font-semibold text-green-400">{usd(c.netUsd)}</td>
                  <td className="px-3 py-2 text-right">
                    <a
                      href={`/api/admin/finance/exports/creator-earnings?creatorId=${c.creatorId}`}
                      className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                    >
                      <Download size={12} />CSV
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Creators register and remit their own income tax. Platform issues earnings statements (EA-form/IR8A equivalents) annually.
        </p>
      </div>

      {/* Compliance reminder */}
      <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4 text-sm">
        <div className="flex items-start gap-2">
          <AlertTriangle size={16} className="text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-400">Compliance posture: data feed, not substitute</p>
            <p className="text-xs text-muted-foreground mt-1">
              Threshold ratios use approximate FX. Filings must use the daily Airwallex rate from the transaction date.
              Hand exports to a registered tax agent (MY: GST agent / SST agent · SG: GST tax agent · ID: konsultan pajak) before submission.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
