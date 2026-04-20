'use client'
import { useState, useEffect } from 'react'
import { TrendingUp, DollarSign, AlertTriangle, Shield, Wallet, ArrowDownToLine, Clock, BarChart3 } from 'lucide-react'

type FinanceData = {
  summary: {
    totalGrossUsd: number
    totalPlatformRevenueUsd: number
    totalCreatorAmountUsd: number
    escrowLiabilityUsd: number
    availableLiabilityUsd: number
    totalPaidOutUsd: number
    pendingPayoutsUsd: number
    netPlatformPositionUsd: number
  }
  chargebacks: { open: number; won: number; lost: number; totalAmount: number }
  openFraudFlags: number
  monthlyRevenue: { month: string; gross: number; fees: number; net: number }[]
  airwallexBalances: { currency: string; available_amount: number; pending_amount: number; total_amount: number }[]
}

function usd(cents: number) {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function StatCard({
  label, value, sub, icon: Icon, color = 'blue',
}: {
  label: string; value: string; sub?: string; icon: React.ElementType; color?: string
}) {
  const colors: Record<string, string> = {
    green:  'bg-green-500/10 text-green-400',
    blue:   'bg-blue-500/10 text-blue-400',
    yellow: 'bg-yellow-500/10 text-yellow-400',
    purple: 'bg-primary/10 text-primary',
    red:    'bg-red-500/10 text-red-400',
    gray:   'bg-muted/10 text-muted-foreground',
  }
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className={`p-1.5 rounded-lg ${colors[color]}`}><Icon size={16} /></div>
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  )
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

  const { summary, chargebacks, openFraudFlags, monthlyRevenue, airwallexBalances } = data

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Financial Position</h1>
        <p className="text-sm text-muted-foreground mt-1">Platform treasury, liabilities, and Airwallex account balances</p>
      </div>

      {/* Platform P&L */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Platform P&amp;L (All Time)</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Gross Volume" value={usd(summary.totalGrossUsd)} sub="Total buyer payments" icon={TrendingUp} color="blue" />
          <StatCard label="Platform Revenue" value={usd(summary.totalPlatformRevenueUsd)} sub="Fees retained" icon={DollarSign} color="green" />
          <StatCard label="Creator Earnings" value={usd(summary.totalCreatorAmountUsd)} sub="Total creator net" icon={BarChart3} color="purple" />
          <StatCard label="Total Paid Out" value={usd(summary.totalPaidOutUsd)} sub="Sent to creators" icon={ArrowDownToLine} color="gray" />
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

      {/* Risk summary */}
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
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-red-500/10"><Shield size={16} className="text-red-400" /></div>
              <span className="text-xs font-medium text-muted-foreground">Fraud Flags</span>
            </div>
            <p className="text-2xl font-bold text-red-400">{openFraudFlags}</p>
            <p className="text-xs text-muted-foreground mt-1">Open flags needing review</p>
            {openFraudFlags > 0 && (
              <a href="/admin/fraud" className="text-xs text-primary hover:underline mt-2 block">Review flags →</a>
            )}
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-green-500/10"><DollarSign size={16} className="text-green-400" /></div>
              <span className="text-xs font-medium text-muted-foreground">Net Platform Position</span>
            </div>
            <p className="text-2xl font-bold text-green-400">{usd(summary.netPlatformPositionUsd)}</p>
            <p className="text-xs text-muted-foreground mt-1">Revenue collected (fees)</p>
          </div>
        </div>
      </div>

      {/* Airwallex live balances */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Airwallex Account Balances (Live)</h2>
        {airwallexBalances.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            No balance data — Airwallex API may be unavailable or credentials not set.
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border bg-muted/20">
                  <th className="px-5 py-3 text-left font-medium">Currency</th>
                  <th className="px-5 py-3 text-right font-medium">Available</th>
                  <th className="px-5 py-3 text-right font-medium">Pending</th>
                  <th className="px-5 py-3 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {airwallexBalances.map(b => (
                  <tr key={b.currency} className="border-b border-border last:border-0 hover:bg-muted/10">
                    <td className="px-5 py-3 font-semibold text-foreground">{b.currency}</td>
                    <td className="px-5 py-3 text-right text-green-400 font-medium">
                      {b.available_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3 text-right text-yellow-400">
                      {b.pending_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3 text-right text-foreground font-semibold">
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
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border bg-muted/20">
                  <th className="px-5 py-3 text-left font-medium">Month</th>
                  <th className="px-5 py-3 text-right font-medium">Gross</th>
                  <th className="px-5 py-3 text-right font-medium">Platform Fees</th>
                  <th className="px-5 py-3 text-right font-medium">Creator Net</th>
                </tr>
              </thead>
              <tbody>
                {monthlyRevenue.map(m => (
                  <tr key={m.month} className="border-b border-border last:border-0 hover:bg-muted/10">
                    <td className="px-5 py-3 text-muted-foreground">{m.month}</td>
                    <td className="px-5 py-3 text-right text-foreground">{usd(m.gross)}</td>
                    <td className="px-5 py-3 text-right text-green-400">{usd(m.fees)}</td>
                    <td className="px-5 py-3 text-right text-primary">{usd(m.net)}</td>
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
