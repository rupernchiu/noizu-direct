'use client'
import { useEffect, useState } from 'react'
import { Landmark, Wallet, ShieldAlert, Megaphone, Receipt, History } from 'lucide-react'

type Reserve = {
  id: string
  kind: string
  scope: string | null
  label: string
  balanceUsd: number
  cumulativeInUsd: number
  cumulativeOutUsd: number
  targetUsd: number | null
  policyHoldDays: number | null
}

type TreasuryData = {
  reserves: Reserve[]
  reserveBalanceUsd: number
  liabilities: { escrowUsd: number; availableUsd: number; pendingPayoutsUsd: number; totalUsd: number }
  balancesByCurrency: { currency: string; available: number; pending: number; total: number }[]
  recentEntries: {
    id: string; direction: string; amountUsd: number; reason: string
    reserveKind: string; reserveScope: string | null; reserveLabel: string
    approvedBy: string | null; createdAt: string
  }[]
}

function usd(cents: number) {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const KIND_ICON: Record<string, React.ElementType> = {
  FRAUD_ROLLING: ShieldAlert,
  MARKETING: Megaphone,
  TAX_DESTINATION: Receipt,
  TAX_CREATOR_WITHHOLDING: Receipt,
  TAX_ORIGIN: Receipt,
  REFUND_FLOAT: Wallet,
}

const KIND_LABEL: Record<string, string> = {
  FRAUD_ROLLING: 'Fraud rolling reserve',
  MARKETING: 'Marketing',
  TAX_DESTINATION: 'Tax (destination)',
  TAX_CREATOR_WITHHOLDING: 'Tax (creator withholding)',
  TAX_ORIGIN: 'Tax (creator origin / PPh)',
  REFUND_FLOAT: 'Refund float',
}

export default function TreasuryPage() {
  const [data, setData] = useState<TreasuryData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/finance/treasury')
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-24 text-muted-foreground">Loading treasury…</div>
  if (!data) return <div className="py-24 text-center text-red-400">Failed to load treasury data.</div>

  const { reserves, reserveBalanceUsd, liabilities, balancesByCurrency, recentEntries } = data

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Landmark size={20} />Treasury & Reserves</h1>
        <p className="text-sm text-muted-foreground mt-1">Reserve ledgers, liabilities, and per-currency Airwallex balances</p>
      </div>

      {/* Snapshot */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-xs text-muted-foreground">Total reserves balance</div>
          <div className="text-2xl font-bold mt-1 text-green-400">{usd(reserveBalanceUsd)}</div>
          <div className="text-xs text-muted-foreground mt-1">{reserves.length} reserve account(s)</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-xs text-muted-foreground">Total liability</div>
          <div className="text-2xl font-bold mt-1 text-yellow-400">{usd(liabilities.totalUsd)}</div>
          <div className="text-xs text-muted-foreground mt-1">Escrow + Available + Queued</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-xs text-muted-foreground">Reserve coverage of liability</div>
          <div className="text-2xl font-bold mt-1 text-foreground">
            {liabilities.totalUsd > 0 ? ((reserveBalanceUsd / liabilities.totalUsd) * 100).toFixed(1) : '0.0'}%
          </div>
          <div className="text-xs text-muted-foreground mt-1">Reserves are above-and-beyond Airwallex cash</div>
        </div>
      </div>

      {/* Reserve ledgers */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Reserve ledgers</h2>
        {reserves.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
            No reserves yet. Run the daily accrual cron to seed the fraud + marketing reserves.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {reserves.map(r => {
              const Icon = KIND_ICON[r.kind] ?? Wallet
              const targetPct = r.targetUsd && r.targetUsd > 0 ? (r.balanceUsd / r.targetUsd) * 100 : null
              return (
                <div key={r.id} className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon size={16} className="text-primary" />
                    <span className="text-sm font-semibold text-foreground">{r.label}</span>
                    {r.scope && <span className="px-1.5 py-0.5 rounded bg-muted/30 text-xs text-muted-foreground">{r.scope}</span>}
                  </div>
                  <div className="text-2xl font-bold text-green-400">{usd(r.balanceUsd)}</div>
                  <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                    <div>
                      <div className="text-muted-foreground">Cumulative in</div>
                      <div className="text-foreground">{usd(r.cumulativeInUsd)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Cumulative out</div>
                      <div className="text-foreground">{usd(r.cumulativeOutUsd)}</div>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground">
                    Kind: <span className="text-foreground">{KIND_LABEL[r.kind] ?? r.kind}</span>
                    {r.policyHoldDays && <> · Hold: <span className="text-foreground">{r.policyHoldDays}d</span></>}
                    {targetPct !== null && <> · Target: <span className="text-foreground">{targetPct.toFixed(0)}%</span></>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Per-currency Airwallex balances */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Per-currency balances (Airwallex)</h2>
        {balancesByCurrency.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            No balance data — Airwallex API may be unavailable.
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border bg-muted/20">
                  <th className="px-3 py-2 text-left font-medium">Currency</th>
                  <th className="px-3 py-2 text-right font-medium">Available</th>
                  <th className="px-3 py-2 text-right font-medium">Pending</th>
                  <th className="px-3 py-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {balancesByCurrency.map(b => (
                  <tr key={b.currency} className="border-b border-border last:border-0 hover:bg-muted/10">
                    <td className="px-3 py-2 font-semibold text-foreground">{b.currency}</td>
                    <td className="px-3 py-2 text-right text-green-400">{(b.available / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-3 py-2 text-right text-yellow-400">{(b.pending / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-3 py-2 text-right text-foreground font-semibold">{(b.total / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent reserve activity */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
          <History size={14} />Recent reserve activity
        </h2>
        {recentEntries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
            No reserve movements yet.
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border bg-muted/20">
                  <th className="px-3 py-2 text-left font-medium">When</th>
                  <th className="px-3 py-2 text-left font-medium">Reserve</th>
                  <th className="px-3 py-2 text-left font-medium">Direction</th>
                  <th className="px-3 py-2 text-right font-medium">Amount</th>
                  <th className="px-3 py-2 text-left font-medium">Reason</th>
                </tr>
              </thead>
              <tbody>
                {recentEntries.map(e => (
                  <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/10">
                    <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(e.createdAt).toLocaleString()}</td>
                    <td className="px-3 py-2 text-foreground">{e.reserveLabel}{e.reserveScope ? ` · ${e.reserveScope}` : ''}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs ${e.direction === 'ACCRUAL' ? 'bg-green-500/20 text-green-400' : e.direction === 'RELEASE' ? 'bg-red-500/20 text-red-400' : 'bg-muted/30 text-muted-foreground'}`}>
                        {e.direction}
                      </span>
                    </td>
                    <td className={`px-3 py-2 text-right font-medium ${e.direction === 'ACCRUAL' ? 'text-green-400' : 'text-red-400'}`}>
                      {e.direction === 'ACCRUAL' ? '+' : '−'}{usd(e.amountUsd)}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{e.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Auto-compute fills the ledger via daily cron. Releases require admin approval and are logged in AdminAuditEvent.
      </p>
    </div>
  )
}
