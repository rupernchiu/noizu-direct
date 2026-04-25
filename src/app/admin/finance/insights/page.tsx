'use client'
import { useEffect, useState } from 'react'
import { BarChart3, TrendingUp, TrendingDown, Users, AlertTriangle } from 'lucide-react'

type InsightsData = {
  fiscalYearStart: string
  pnl: {
    grossUsd: number
    subtotalUsd: number
    buyerFeeUsd: number
    creatorCommissionUsd: number
    legacyProcessingFeeUsd: number
    legacyPlatformFeeUsd: number
    creatorPayoutUsd: number
    chargebackLossUsd: number
    chargebackCount: number
  }
  perRail: { rail: string | null; grossUsd: number; buyerFeeUsd: number; creatorCommissionUsd: number; orders: number }[]
  concentration: {
    top1Pct: number; top5Pct: number; top20Pct: number; totalCreators: number
    top1: { creatorId: string; email: string | null; grossUsd: number; orders: number } | null
  }
  refundsByProductType: { productType: string | null; refundCount: number; totalOrders: number; refundRatePct: number }[]
}

function usd(cents: number) {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function InsightsPage() {
  const [data, setData] = useState<InsightsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/finance/insights')
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-24 text-muted-foreground">Loading insights…</div>
  if (!data) return <div className="py-24 text-center text-red-400">Failed to load insights data.</div>

  const { pnl, perRail, concentration, refundsByProductType } = data

  // P&L synthesis (rail-aware fields take precedence; legacy fields filled in for older orders)
  const totalBuyerFee = pnl.buyerFeeUsd + pnl.legacyProcessingFeeUsd
  const totalCreatorCommission = pnl.creatorCommissionUsd + (pnl.legacyPlatformFeeUsd > pnl.creatorCommissionUsd ? pnl.legacyPlatformFeeUsd - pnl.creatorCommissionUsd : 0)
  const grossPlatformRevenue = totalBuyerFee + totalCreatorCommission
  // Approximate Airwallex processing cost: ~3.3% of gross
  const approxAirwallexCost = Math.round(pnl.grossUsd * 0.033)
  const operatingMargin = grossPlatformRevenue - approxAirwallexCost - pnl.chargebackLossUsd

  // Concentration risk traffic-light: top-1 >25% is alarm
  const top1Tone: 'success' | 'warning' | 'danger' = concentration.top1Pct >= 25 ? 'danger' : concentration.top1Pct >= 15 ? 'warning' : 'success'

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><BarChart3 size={20} />Insights & P&amp;L</h1>
        <p className="text-sm text-muted-foreground mt-1">YTD strategic view — margins, concentration, refund rates</p>
      </div>

      {/* P&L decomposition */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">YTD P&amp;L decomposition</h2>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-border bg-muted/10">
                <td className="px-4 py-2 text-muted-foreground">Gross volume (buyer payments)</td>
                <td className="px-4 py-2 text-right font-bold text-foreground">{usd(pnl.grossUsd)}</td>
              </tr>
              <tr className="border-b border-border">
                <td className="px-4 py-2 pl-8 text-muted-foreground">Buyer fees collected (5.5% local / 8% card)</td>
                <td className="px-4 py-2 text-right text-green-400">+{usd(totalBuyerFee)}</td>
              </tr>
              <tr className="border-b border-border">
                <td className="px-4 py-2 pl-8 text-muted-foreground">Creator commission (5%)</td>
                <td className="px-4 py-2 text-right text-green-400">+{usd(totalCreatorCommission)}</td>
              </tr>
              <tr className="border-b border-border bg-muted/10">
                <td className="px-4 py-2 font-semibold text-foreground">Gross platform revenue</td>
                <td className="px-4 py-2 text-right font-bold text-green-400">{usd(grossPlatformRevenue)}</td>
              </tr>
              <tr className="border-b border-border">
                <td className="px-4 py-2 pl-8 text-muted-foreground">Less: Airwallex processing (~3.3% of gross, est.)</td>
                <td className="px-4 py-2 text-right text-red-400">−{usd(approxAirwallexCost)}</td>
              </tr>
              <tr className="border-b border-border">
                <td className="px-4 py-2 pl-8 text-muted-foreground">Less: Chargeback losses ({pnl.chargebackCount} disputes lost)</td>
                <td className="px-4 py-2 text-right text-red-400">−{usd(pnl.chargebackLossUsd)}</td>
              </tr>
              <tr className="border-b border-border bg-muted/20">
                <td className="px-4 py-2 font-semibold text-foreground">Operating margin (est.)</td>
                <td className={`px-4 py-2 text-right font-bold ${operatingMargin > 0 ? 'text-green-400' : 'text-red-400'}`}>{usd(operatingMargin)}</td>
              </tr>
              <tr>
                <td className="px-4 py-2 pl-8 text-muted-foreground">Margin as % of gross</td>
                <td className="px-4 py-2 text-right text-foreground">{pnl.grossUsd > 0 ? ((operatingMargin / pnl.grossUsd) * 100).toFixed(2) : '0.00'}%</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Airwallex processing cost is estimated at 3.3% (mix of local rails + card). Replace with Airwallex monthly statement once available.
        </p>
      </div>

      {/* Margin by rail */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Margin by rail (YTD)</h2>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-border bg-muted/20">
                <th className="px-3 py-2 text-left font-medium">Rail</th>
                <th className="px-3 py-2 text-right font-medium">Orders</th>
                <th className="px-3 py-2 text-right font-medium">Gross</th>
                <th className="px-3 py-2 text-right font-medium">Buyer Fee</th>
                <th className="px-3 py-2 text-right font-medium">Creator Comm.</th>
                <th className="px-3 py-2 text-right font-medium">% of GMV</th>
              </tr>
            </thead>
            <tbody>
              {perRail.length === 0 ? (
                <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground text-xs">No rail data — most likely all pre-sprint-0.1 orders.</td></tr>
              ) : perRail.map(r => (
                <tr key={r.rail ?? 'legacy'} className="border-b border-border last:border-0 hover:bg-muted/10">
                  <td className="px-3 py-2 font-semibold text-foreground">{r.rail ?? <span className="text-muted-foreground italic">legacy</span>}</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{r.orders}</td>
                  <td className="px-3 py-2 text-right text-foreground">{usd(r.grossUsd)}</td>
                  <td className="px-3 py-2 text-right text-green-400">{usd(r.buyerFeeUsd)}</td>
                  <td className="px-3 py-2 text-right text-primary">{usd(r.creatorCommissionUsd)}</td>
                  <td className="px-3 py-2 text-right text-foreground">{pnl.grossUsd > 0 ? ((r.grossUsd / pnl.grossUsd) * 100).toFixed(1) : '0.0'}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Concentration risk */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
          <Users size={14} />Concentration risk
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="text-xs text-muted-foreground">Top-1 creator share</div>
            <div className={`text-2xl font-bold mt-1 ${top1Tone === 'danger' ? 'text-red-400' : top1Tone === 'warning' ? 'text-yellow-400' : 'text-green-400'}`}>
              {concentration.top1Pct.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {concentration.top1?.email ?? '—'}
              {concentration.top1Pct >= 25 && <span className="ml-1 text-red-400">⚠ Single point of failure</span>}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="text-xs text-muted-foreground">Top-5 creator share</div>
            <div className="text-2xl font-bold mt-1 text-foreground">{concentration.top5Pct.toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground mt-1">{concentration.totalCreators} active creators YTD</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="text-xs text-muted-foreground">Top-20 creator share</div>
            <div className="text-2xl font-bold mt-1 text-foreground">{concentration.top20Pct.toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground mt-1">Long-tail health: {(100 - concentration.top20Pct).toFixed(1)}% from rest</div>
          </div>
        </div>
      </div>

      {/* Refund rate by product type */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Refund rate by product type</h2>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-border bg-muted/20">
                <th className="px-3 py-2 text-left font-medium">Product type</th>
                <th className="px-3 py-2 text-right font-medium">Total orders</th>
                <th className="px-3 py-2 text-right font-medium">Refunded</th>
                <th className="px-3 py-2 text-right font-medium">Rate</th>
                <th className="px-3 py-2 text-left font-medium">Signal</th>
              </tr>
            </thead>
            <tbody>
              {refundsByProductType.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground text-xs">No refund data yet.</td></tr>
              ) : refundsByProductType.map(r => {
                const tone = r.productType === 'DIGITAL' && r.refundRatePct > 2
                  ? 'high'
                  : r.productType === 'COMMISSION' && r.refundRatePct > 5
                  ? 'high'
                  : r.refundRatePct > 8
                  ? 'high'
                  : r.refundRatePct > 3
                  ? 'medium'
                  : 'low'
                return (
                  <tr key={r.productType ?? 'unknown'} className="border-b border-border last:border-0 hover:bg-muted/10">
                    <td className="px-3 py-2 font-semibold text-foreground">{r.productType ?? '—'}</td>
                    <td className="px-3 py-2 text-right text-foreground">{r.totalOrders}</td>
                    <td className="px-3 py-2 text-right text-foreground">{r.refundCount}</td>
                    <td className={`px-3 py-2 text-right font-medium ${tone === 'high' ? 'text-red-400' : tone === 'medium' ? 'text-yellow-400' : 'text-green-400'}`}>
                      {r.refundRatePct.toFixed(2)}%
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {tone === 'high' ? <span className="inline-flex items-center gap-1 text-red-400"><AlertTriangle size={10} />Investigate</span>
                        : tone === 'medium' ? 'Watch'
                        : 'OK'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Heuristic thresholds: digital &gt; 2% suggests piracy/friction; commission &gt; 5% suggests scope creep; physical &gt; 8% suggests fulfilment issues.
        </p>
      </div>

      {/* Trend / margin chips */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Quick reads</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp size={12} />Effective take rate</div>
            <div className="text-2xl font-bold mt-1 text-foreground">{pnl.grossUsd > 0 ? ((grossPlatformRevenue / pnl.grossUsd) * 100).toFixed(2) : '0.00'}%</div>
            <div className="text-xs text-muted-foreground mt-1">Platform revenue ÷ gross volume</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="text-xs text-muted-foreground flex items-center gap-1"><TrendingDown size={12} />Net margin (est.)</div>
            <div className={`text-2xl font-bold mt-1 ${operatingMargin > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {pnl.grossUsd > 0 ? ((operatingMargin / pnl.grossUsd) * 100).toFixed(2) : '0.00'}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">After processing + chargebacks</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="text-xs text-muted-foreground">Creator payout ratio</div>
            <div className="text-2xl font-bold mt-1 text-primary">{pnl.grossUsd > 0 ? ((pnl.creatorPayoutUsd / pnl.grossUsd) * 100).toFixed(1) : '0.0'}%</div>
            <div className="text-xs text-muted-foreground mt-1">Of gross volume goes to creators</div>
          </div>
        </div>
      </div>
    </div>
  )
}
