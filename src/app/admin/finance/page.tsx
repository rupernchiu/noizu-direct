'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { TrendingUp, DollarSign, AlertTriangle, Shield, Wallet, ArrowDownToLine, Clock, Activity, RefreshCw } from 'lucide-react'

type FinanceData = {
  summary: {
    totalGrossUsd: number
    totalSubtotalUsd: number
    totalBuyerFeeUsd: number
    totalCreatorCommissionUsd: number
    totalPlatformRevenueUsd: number
    totalCreatorAmountUsd: number
    escrowLiabilityUsd: number
    availableLiabilityUsd: number
    totalPaidOutUsd: number
    pendingPayoutsUsd: number
    netPlatformPositionUsd: number
    liabilityCoverageRatio: number | null
    usdAvailableUsd: number
    totalLiabilityUsd: number
  }
  flow: {
    gross24hUsd: number; orders24h: number
    gross7dUsd: number; orders7d: number
    payouts24hUsd: number; payouts24hCount: number
    refunds30dUsd: number; refunds30dCount: number
  }
  chargebacks: { open: number; won: number; lost: number; totalAmount: number }
  chargebackRates: {
    count30d: number; amount30dUsd: number
    count90d: number; amount90dUsd: number
    gross30dDenominator: number
  }
  perCountry: { country: string | null; gmvUsd: number; orders: number }[]
  perRail: { rail: string | null; grossUsd: number; buyerFeeUsd: number; creatorCommissionUsd: number; orders: number }[]
  openFraudFlags: number
  monthlyRevenue: { month: string; gross: number; fees: number; net: number; buyerFee: number; creatorCommission: number }[]
  airwallexBalances: { currency: string; available_amount: number; pending_amount: number; total_amount: number }[]
}

function usd(cents: number) {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function StatCard({
  label, value, sub, icon: Icon, color = 'blue', tone,
}: {
  label: string; value: string; sub?: string; icon: React.ElementType; color?: string; tone?: 'success' | 'warning' | 'danger'
}) {
  const colors: Record<string, string> = {
    green:  'bg-green-500/10 text-green-400',
    blue:   'bg-blue-500/10 text-blue-400',
    yellow: 'bg-yellow-500/10 text-yellow-400',
    purple: 'bg-primary/10 text-primary',
    red:    'bg-red-500/10 text-red-400',
    gray:   'bg-muted/10 text-muted-foreground',
  }
  const valueColor =
    tone === 'success' ? 'text-green-400'
    : tone === 'warning' ? 'text-yellow-400'
    : tone === 'danger' ? 'text-red-400'
    : 'text-foreground'
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className={`p-1.5 rounded-lg ${colors[color]}`}><Icon size={16} /></div>
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  )
}

function ratioTone(ratio: number | null): 'success' | 'warning' | 'danger' | undefined {
  if (ratio === null) return undefined
  if (ratio >= 1.1) return 'success'
  if (ratio >= 1.0) return 'warning'
  return 'danger'
}

export default function AdminFinancePage() {
  const [data, setData] = useState<FinanceData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/finance')
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-24 text-muted-foreground">Loading financial position…</div>
  if (!data) return <div className="py-24 text-center text-red-400">Failed to load finance data.</div>

  const { summary, flow, chargebacks, chargebackRates, perRail, openFraudFlags, monthlyRevenue, airwallexBalances } = data

  // Visa monitoring traffic-light: <0.65% healthy, 0.65–0.9 monitor, >=0.9 warning
  const cbRatio30 = chargebackRates.gross30dDenominator > 0
    ? (chargebackRates.amount30dUsd / chargebackRates.gross30dDenominator) * 100
    : 0
  const cbTone: 'success' | 'warning' | 'danger' = cbRatio30 >= 0.9 ? 'danger' : cbRatio30 >= 0.65 ? 'warning' : 'success'

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Operational Position</h1>
        <p className="text-sm text-muted-foreground mt-1">Daily ops view — coverage, today&apos;s flow, live balances</p>
      </div>

      {/* Liability coverage ratio — single most important number */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Liability Coverage</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Coverage Ratio"
            value={summary.liabilityCoverageRatio !== null ? `${summary.liabilityCoverageRatio}×` : '—'}
            sub="Airwallex USD ÷ total liability — target ≥1.10"
            icon={Shield}
            color={summary.liabilityCoverageRatio === null ? 'gray' : summary.liabilityCoverageRatio >= 1.1 ? 'green' : summary.liabilityCoverageRatio >= 1.0 ? 'yellow' : 'red'}
            tone={ratioTone(summary.liabilityCoverageRatio)}
          />
          <StatCard label="USD Available (Airwallex)" value={usd(summary.usdAvailableUsd)} sub="Cash on hand for payouts" icon={Wallet} color="blue" />
          <StatCard label="Total Liability" value={usd(summary.totalLiabilityUsd)} sub="Escrow + Available + Queued" icon={AlertTriangle} color="yellow" />
        </div>
      </div>

      {/* Today's flow card */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Today vs 7-Day Average</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Gross 24h" value={usd(flow.gross24hUsd)} sub={`${flow.orders24h} orders`} icon={Activity} color="blue" />
          <StatCard label="Avg 24h (7d basis)" value={usd(Math.round(flow.gross7dUsd / 7))} sub={`${(flow.orders7d / 7).toFixed(1)} orders/day avg`} icon={TrendingUp} color="purple" />
          <StatCard label="Payouts 24h" value={usd(flow.payouts24hUsd)} sub={`${flow.payouts24hCount} sent`} icon={ArrowDownToLine} color="gray" />
          <StatCard label="Refunds 30d" value={usd(flow.refunds30dUsd)} sub={`${flow.refunds30dCount} orders`} icon={RefreshCw} color="red" />
        </div>
      </div>

      {/* P&L components */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Platform P&amp;L (All Time)</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Gross Volume" value={usd(summary.totalGrossUsd)} sub="Total buyer payments" icon={TrendingUp} color="blue" />
          <StatCard label="Buyer Fees Collected" value={usd(summary.totalBuyerFeeUsd)} sub="Rail-aware (5.5%/8%)" icon={DollarSign} color="green" />
          <StatCard label="Creator Commission" value={usd(summary.totalCreatorCommissionUsd)} sub="5% of subtotal" icon={DollarSign} color="purple" />
          <StatCard label="Total Platform Revenue" value={usd(summary.totalPlatformRevenueUsd)} sub="Buyer fee + commission" icon={DollarSign} color="green" />
        </div>
      </div>

      {/* Liabilities */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Current Liabilities (What We Owe Creators)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Escrow Liability" value={usd(summary.escrowLiabilityUsd)} sub="Held, not yet released" icon={Clock} color="yellow" />
          <StatCard label="Available Liability" value={usd(summary.availableLiabilityUsd)} sub="Cleared, not yet paid" icon={Wallet} color="red" />
          <StatCard label="Queued Payouts" value={usd(summary.pendingPayoutsUsd)} sub="Pending / processing" icon={ArrowDownToLine} color="blue" />
        </div>
      </div>

      {/* Risk + chargeback ratio */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Risk Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-orange-500/10"><AlertTriangle size={16} className="text-orange-400" /></div>
              <span className="text-xs font-medium text-muted-foreground">Chargebacks</span>
            </div>
            <div className="flex gap-4 text-sm">
              <div><p className="text-xl font-bold text-orange-400">{chargebacks.open}</p><p className="text-xs text-muted-foreground">Open</p></div>
              <div><p className="text-xl font-bold text-green-400">{chargebacks.won}</p><p className="text-xs text-muted-foreground">Won</p></div>
              <div><p className="text-xl font-bold text-red-400">{chargebacks.lost}</p><p className="text-xs text-muted-foreground">Lost</p></div>
            </div>
            {chargebacks.totalAmount > 0 && (
              <p className="text-xs text-red-400 mt-2">{usd(chargebacks.totalAmount)} lost to chargebacks</p>
            )}
          </div>
          <StatCard
            label="Chargeback Rate (30d)"
            value={`${cbRatio30.toFixed(2)}%`}
            sub={`${chargebackRates.count30d} disputes / ${usd(chargebackRates.gross30dDenominator)} GMV — Visa target <0.65%`}
            icon={Shield}
            color={cbTone === 'danger' ? 'red' : cbTone === 'warning' ? 'yellow' : 'green'}
            tone={cbTone}
          />
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-red-500/10"><Shield size={16} className="text-red-400" /></div>
              <span className="text-xs font-medium text-muted-foreground">Fraud Flags</span>
            </div>
            <p className="text-2xl font-bold text-red-400">{openFraudFlags}</p>
            <p className="text-xs text-muted-foreground mt-1">Open flags needing review</p>
            {openFraudFlags > 0 && (
              <Link href="/admin/fraud" className="text-xs text-primary hover:underline mt-2 block">Review flags →</Link>
            )}
          </div>
        </div>
      </div>

      {/* Per-rail breakdown */}
      {perRail.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Volume by Payment Rail</h2>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm [&_td]:whitespace-nowrap">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border bg-muted/20">
                  <th className="px-3 py-1.5 text-left font-medium">Rail</th>
                  <th className="px-3 py-1.5 text-right font-medium">Orders</th>
                  <th className="px-3 py-1.5 text-right font-medium">Gross</th>
                  <th className="px-3 py-1.5 text-right font-medium">Buyer Fee</th>
                  <th className="px-3 py-1.5 text-right font-medium">Creator Comm.</th>
                </tr>
              </thead>
              <tbody>
                {perRail.map(r => (
                  <tr key={r.rail ?? 'legacy'} className="border-b border-border last:border-0 hover:bg-muted/10">
                    <td className="px-3 py-1.5 font-semibold text-foreground">{r.rail ?? <span className="text-muted-foreground italic">legacy/unknown</span>}</td>
                    <td className="px-3 py-1.5 text-right text-foreground">{r.orders}</td>
                    <td className="px-3 py-1.5 text-right text-foreground">{usd(r.grossUsd)}</td>
                    <td className="px-3 py-1.5 text-right text-green-400">{usd(r.buyerFeeUsd)}</td>
                    <td className="px-3 py-1.5 text-right text-primary">{usd(r.creatorCommissionUsd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Airwallex live balances */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Airwallex Account Balances (Live)</h2>
        {airwallexBalances.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            No balance data — Airwallex API may be unavailable or credentials not set.
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm [&_td]:whitespace-nowrap">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border bg-muted/20">
                  <th className="px-3 py-1.5 text-left font-medium">Currency</th>
                  <th className="px-3 py-1.5 text-right font-medium">Available</th>
                  <th className="px-3 py-1.5 text-right font-medium">Pending</th>
                  <th className="px-3 py-1.5 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {airwallexBalances.map(b => (
                  <tr key={b.currency} className="border-b border-border last:border-0 hover:bg-muted/10">
                    <td className="px-3 py-1.5 font-semibold text-foreground">{b.currency}</td>
                    <td className="px-3 py-1.5 text-right text-green-400 font-medium">
                      {b.available_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-1.5 text-right text-yellow-400">
                      {b.pending_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-1.5 text-right text-foreground font-semibold">
                      {b.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Monthly revenue table */}
      {monthlyRevenue.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Monthly Revenue (Last 12 Months)</h2>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm [&_td]:whitespace-nowrap">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border bg-muted/20">
                  <th className="px-3 py-1.5 text-left font-medium">Month</th>
                  <th className="px-3 py-1.5 text-right font-medium">Gross</th>
                  <th className="px-3 py-1.5 text-right font-medium">Buyer Fee</th>
                  <th className="px-3 py-1.5 text-right font-medium">Creator Comm.</th>
                  <th className="px-3 py-1.5 text-right font-medium">Creator Net</th>
                </tr>
              </thead>
              <tbody>
                {monthlyRevenue.map(m => (
                  <tr key={m.month} className="border-b border-border last:border-0 hover:bg-muted/10">
                    <td className="px-3 py-1.5 text-muted-foreground">{m.month}</td>
                    <td className="px-3 py-1.5 text-right text-foreground">{usd(m.gross)}</td>
                    <td className="px-3 py-1.5 text-right text-green-400">{usd(m.buyerFee)}</td>
                    <td className="px-3 py-1.5 text-right text-primary">{usd(m.creatorCommission)}</td>
                    <td className="px-3 py-1.5 text-right text-foreground">{usd(m.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
