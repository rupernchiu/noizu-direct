'use client'
import { useState, useEffect, useCallback } from 'react'
import { DollarSign, Clock, ArrowDownToLine, ChevronDown, ChevronUp, Download } from 'lucide-react'

type Order = {
  orderId: string
  productTitle: string
  productType: string
  buyerName: string | null
  date: string
  status: string
  gross: number
  platformFee: number
  net: number
}

type PayoutEntry = {
  id: string
  amount: number
  status: string
  date: string
  currency: string
}

type Month = {
  month: string
  label: string
  available: number
  escrow: number
  gross: number
  platformFee: number
  orders: Order[]
  payouts: PayoutEntry[]
}

type Statement = {
  currency: string
  payoutCurrency: string
  isZeroDecimal: boolean
  rate: number
  totals: {
    available: number
    availableUsd: number
    escrow: number
    escrowUsd: number
    paidOut: number
    paidOutUsd: number
  }
  months: Month[]
}

const CURRENCIES = ['USD', 'PAYOUT'] as const
type CurrencyMode = typeof CURRENCIES[number]

function fmt(amount: number, currency: string, isZeroDecimal: boolean): string {
  if (isZeroDecimal) return `${currency} ${amount.toLocaleString()}`
  return `${currency} ${(amount / 100).toFixed(2)}`
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    COMPLETED: 'bg-green-500/10 text-green-400',
    ESCROW: 'bg-yellow-500/10 text-yellow-400',
    PENDING: 'bg-blue-500/10 text-blue-400',
    PROCESSING: 'bg-purple-500/10 text-purple-400',
    PAID: 'bg-green-500/10 text-green-400',
    FAILED: 'bg-red-500/10 text-red-400',
    REJECTED: 'bg-red-500/10 text-red-400',
  }
  return map[status] ?? 'bg-muted text-muted-foreground'
}

export default function StatementPage() {
  const [mode, setMode] = useState<CurrencyMode>('USD')
  const [data, setData] = useState<Statement | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const load = useCallback(async (m: CurrencyMode) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/dashboard/statement?currency=${m}`)
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(mode) }, [mode, load])

  function toggleMonth(key: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  function downloadCSV() {
    if (!data) return
    const rows = [['Month', 'Order ID', 'Product', 'Type', 'Buyer', 'Date', 'Status', `Gross (${data.currency})`, `Platform Fee (${data.currency})`, `Net (${data.currency})`]]
    for (const m of data.months) {
      for (const o of m.orders) {
        const isZd = data.isZeroDecimal
        rows.push([
          m.label,
          o.orderId.slice(-8).toUpperCase(),
          o.productTitle,
          o.productType,
          o.buyerName ?? 'Anonymous',
          new Date(o.date).toLocaleDateString(),
          o.status,
          isZd ? String(o.gross) : (o.gross / 100).toFixed(2),
          isZd ? String(o.platformFee) : (o.platformFee / 100).toFixed(2),
          isZd ? String(o.net) : (o.net / 100).toFixed(2),
        ])
      }
    }
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `noizu-statement-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const currency = data?.currency ?? 'USD'
  const isZd = data?.isZeroDecimal ?? false

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Earnings Statement</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Monthly breakdown of your sales, fees, and payouts</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Currency toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden text-sm">
            {(['USD', 'PAYOUT'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-1.5 font-medium transition-colors ${mode === m ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {m === 'PAYOUT' ? (data?.payoutCurrency ?? 'Local') : 'USD'}
              </button>
            ))}
          </div>
          <button
            onClick={downloadCSV}
            disabled={!data}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-lg text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors disabled:opacity-50"
          >
            <Download size={14} />
            CSV
          </button>
        </div>
      </div>

      {/* Rate note */}
      {data && mode === 'PAYOUT' && data.currency !== 'USD' && (
        <p className="text-xs text-muted-foreground">
          Amounts shown in {data.currency} at indicative rate 1 USD = {data.isZeroDecimal ? data.rate.toFixed(0) : data.rate.toFixed(4)} {data.currency}. Actual payout rate locked at transfer time.
        </p>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-green-500/10"><DollarSign size={16} className="text-green-400" /></div>
            <span className="text-sm font-medium text-muted-foreground">Available</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {loading ? '…' : data ? fmt(data.totals.available, currency, isZd) : '—'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Escrow cleared, ready for payout</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-yellow-500/10"><Clock size={16} className="text-yellow-400" /></div>
            <span className="text-sm font-medium text-muted-foreground">In Escrow</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {loading ? '…' : data ? fmt(data.totals.escrow, currency, isZd) : '—'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Held pending fulfilment window</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-primary/10"><ArrowDownToLine size={16} className="text-primary" /></div>
            <span className="text-sm font-medium text-muted-foreground">Paid Out</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {loading ? '…' : data ? fmt(data.totals.paidOut, currency, isZd) : '—'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Total transferred to your bank</p>
        </div>
      </div>

      {/* Monthly breakdown */}
      {loading ? (
        <div className="flex justify-center py-16 text-muted-foreground">Loading statement…</div>
      ) : data?.months.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center text-muted-foreground">
          No transactions yet. Your monthly statements will appear here once you make your first sale.
        </div>
      ) : (
        <div className="space-y-3">
          {data?.months.map(m => {
            const open = expanded.has(m.month)
            return (
              <div key={m.month} className="rounded-xl border border-border bg-card overflow-hidden">
                {/* Month header */}
                <button
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
                  onClick={() => toggleMonth(m.month)}
                >
                  <div className="flex items-center gap-4">
                    <span className="font-semibold text-foreground">{m.label}</span>
                    <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="text-green-400">{fmt(m.available, currency, isZd)} available</span>
                      {m.escrow > 0 && <span className="text-yellow-400">{fmt(m.escrow, currency, isZd)} escrow</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-foreground">{fmt(m.gross, currency, isZd)} gross</span>
                    {open ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                  </div>
                </button>

                {/* Expanded detail */}
                {open && (
                  <div className="border-t border-border">
                    {/* Orders table */}
                    {m.orders.length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-xs text-muted-foreground border-b border-border">
                              <th className="text-left px-5 py-2.5 font-medium">Product</th>
                              <th className="text-left px-3 py-2.5 font-medium hidden sm:table-cell">Buyer</th>
                              <th className="text-left px-3 py-2.5 font-medium hidden md:table-cell">Date</th>
                              <th className="text-left px-3 py-2.5 font-medium">Status</th>
                              <th className="text-right px-3 py-2.5 font-medium">Gross</th>
                              <th className="text-right px-3 py-2.5 font-medium hidden sm:table-cell">Fee</th>
                              <th className="text-right px-5 py-2.5 font-medium">Net</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {m.orders.map(o => (
                              <tr key={o.orderId} className="hover:bg-muted/20 transition-colors">
                                <td className="px-5 py-3">
                                  <p className="font-medium text-foreground truncate max-w-[180px]">{o.productTitle}</p>
                                  <p className="text-xs text-muted-foreground">{o.productType}</p>
                                </td>
                                <td className="px-3 py-3 text-muted-foreground hidden sm:table-cell">{o.buyerName ?? 'Anonymous'}</td>
                                <td className="px-3 py-3 text-muted-foreground hidden md:table-cell">{new Date(o.date).toLocaleDateString()}</td>
                                <td className="px-3 py-3">
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(o.status)}`}>{o.status}</span>
                                </td>
                                <td className="px-3 py-3 text-right text-foreground">{fmt(o.gross, currency, isZd)}</td>
                                <td className="px-3 py-3 text-right text-muted-foreground hidden sm:table-cell">−{fmt(o.platformFee, currency, isZd)}</td>
                                <td className="px-5 py-3 text-right font-semibold text-foreground">{fmt(o.net, currency, isZd)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t border-border bg-muted/20 text-sm font-semibold">
                              <td colSpan={4} className="px-5 py-3 text-muted-foreground">Month total</td>
                              <td className="px-3 py-3 text-right text-foreground">{fmt(m.gross, currency, isZd)}</td>
                              <td className="px-3 py-3 text-right text-muted-foreground hidden sm:table-cell">−{fmt(m.platformFee, currency, isZd)}</td>
                              <td className="px-5 py-3 text-right text-green-400">{fmt(m.available + m.escrow, currency, isZd)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}

                    {/* Payouts this month */}
                    {m.payouts.length > 0 && (
                      <div className="px-5 py-3 border-t border-border space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Payouts</p>
                        {m.payouts.map(p => (
                          <div key={p.id} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <ArrowDownToLine size={14} className="text-primary" />
                              <span className="text-muted-foreground">{new Date(p.date).toLocaleDateString()}</span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(p.status)}`}>{p.status}</span>
                            </div>
                            <span className="font-semibold text-foreground">{fmt(p.amount, currency, isZd)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
