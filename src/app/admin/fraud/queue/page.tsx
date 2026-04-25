'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, Clock, FileSearch, Activity, Shield } from 'lucide-react'

type ChargebackRow = {
  id: string
  airwallexDisputeId: string
  orderId: string
  amountUsd: number
  reason: string
  status: string
  evidenceDeadline: string | null
  createdAt: string
  order: {
    id: string
    amountUsd: number
    paymentRail: string | null
    buyer: { id: string; name: string; email: string }
    creator: { id: string; name: string }
    product: { title: string; type: string | null }
  } | null
}

type DownloadRow = {
  orderId: string
  distinctIps: number
  accessCount: number
  lastAccessAt: string
  order: {
    id: string
    amountUsd: number
    buyer: { id: string; name: string; email: string }
    product: { title: string }
  } | null
}

type VelocityRow = {
  buyerId: string
  orderCount: number
  sumAmountUsd: number
  distinctCreators: number
  buyer: { id: string; name: string; email: string; createdAt: string } | null
}

type QueueData = {
  chargebacks: ChargebackRow[]
  suspiciousDownloads: DownloadRow[]
  highVelocity: VelocityRow[]
  generatedAt: string
}

function fmtUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString()
}

function deadlineTone(iso: string | null): { label: string; className: string } {
  if (!iso) return { label: '—', className: 'text-muted-foreground' }
  const ms = new Date(iso).getTime() - Date.now()
  const hrs = ms / (60 * 60 * 1000)
  if (hrs < 24) return { label: `${hrs.toFixed(0)}h`, className: 'text-red-500 font-semibold' }
  if (hrs < 72) return { label: `${(hrs / 24).toFixed(0)}d`, className: 'text-amber-500 font-semibold' }
  return { label: `${(hrs / 24).toFixed(0)}d`, className: 'text-muted-foreground' }
}

export default function FraudQueuePage() {
  const [data, setData] = useState<QueueData | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch('/api/admin/fraud/queue')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d) => alive && setData(d))
      .catch((e) => alive && setErr(String(e)))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [])

  if (loading) {
    return <div className="py-16 text-center text-muted-foreground">Loading queue…</div>
  }
  if (err) {
    return <div className="rounded-xl border border-red-500/40 bg-red-500/5 p-5 text-sm text-red-400">{err}</div>
  }
  if (!data) return null

  const { chargebacks, suspiciousDownloads, highVelocity } = data
  const totalSignals = chargebacks.length + suspiciousDownloads.length + highVelocity.length

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield size={20} className="text-primary" />
            Fraud Review Queue
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {totalSignals === 0
              ? 'No active fraud signals — last 24h.'
              : `${totalSignals} active signals across chargebacks, download patterns, and buyer velocity.`}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/fraud"
            className="px-3 py-1.5 text-sm rounded-lg border border-border text-muted-foreground hover:text-foreground"
          >
            Manual flags
          </Link>
          <Link
            href="/admin/chargebacks"
            className="px-3 py-1.5 text-sm rounded-lg border border-border text-muted-foreground hover:text-foreground"
          >
            All chargebacks
          </Link>
        </div>
      </div>

      {/* ── Chargebacks awaiting evidence ──────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <FileSearch size={16} className="text-red-400" />
          <h2 className="font-semibold text-foreground text-sm">
            Chargebacks Awaiting Evidence ({chargebacks.length})
          </h2>
        </div>
        {chargebacks.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
            No open chargebacks.
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm [&_td]:whitespace-nowrap">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border bg-muted/10">
                  <th className="px-3 py-2 text-left font-medium">Deadline</th>
                  <th className="px-3 py-2 text-left font-medium">Reason</th>
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                  <th className="px-3 py-2 text-left font-medium">Amount</th>
                  <th className="px-3 py-2 text-left font-medium">Order</th>
                  <th className="px-3 py-2 text-left font-medium">Buyer</th>
                  <th className="px-3 py-2 text-left font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {chargebacks.map((c) => {
                  const tone = deadlineTone(c.evidenceDeadline)
                  return (
                    <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/5">
                      <td className={`px-3 py-2 ${tone.className}`}>
                        <span className="inline-flex items-center gap-1">
                          <Clock size={12} /> {tone.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-foreground text-xs">{c.reason.replace(/_/g, ' ')}</td>
                      <td className="px-3 py-2 text-xs">{c.status}</td>
                      <td className="px-3 py-2 text-foreground font-medium">{fmtUsd(c.amountUsd)}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {c.order ? (
                          <Link href={`/admin/orders/${c.orderId}`} className="hover:text-primary">
                            {c.order.product.title.slice(0, 30)}
                          </Link>
                        ) : c.orderId.slice(-8).toUpperCase()}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {c.order?.buyer.email ?? '—'}
                      </td>
                      <td className="px-3 py-2">
                        <Link
                          href={`/admin/chargebacks/${c.id}`}
                          className="text-xs text-primary hover:underline"
                        >
                          Review →
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Suspicious download patterns ───────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-amber-500" />
          <h2 className="font-semibold text-foreground text-sm">
            Suspicious Download Patterns — last 24h ({suspiciousDownloads.length})
          </h2>
          <span className="text-xs text-muted-foreground">≥3 distinct IPs or ≥8 access events</span>
        </div>
        {suspiciousDownloads.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
            No suspicious download patterns.
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm [&_td]:whitespace-nowrap">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border bg-muted/10">
                  <th className="px-3 py-2 text-left font-medium">Order</th>
                  <th className="px-3 py-2 text-left font-medium">Distinct IPs</th>
                  <th className="px-3 py-2 text-left font-medium">Accesses</th>
                  <th className="px-3 py-2 text-left font-medium">Last access</th>
                  <th className="px-3 py-2 text-left font-medium">Buyer</th>
                  <th className="px-3 py-2 text-left font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {suspiciousDownloads.map((r) => (
                  <tr key={r.orderId} className="border-b border-border last:border-0 hover:bg-muted/5">
                    <td className="px-3 py-2 text-xs text-foreground">
                      {r.order ? (
                        <Link href={`/admin/orders/${r.orderId}`} className="hover:text-primary">
                          {r.order.product.title.slice(0, 30)}
                        </Link>
                      ) : r.orderId.slice(-8).toUpperCase()}
                    </td>
                    <td className="px-3 py-2 text-amber-500 font-semibold">{r.distinctIps}</td>
                    <td className="px-3 py-2 text-foreground">{r.accessCount}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{fmtDate(r.lastAccessAt)}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {r.order?.buyer.email ?? '—'}
                    </td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/admin/orders/${r.orderId}`}
                        className="text-xs text-primary hover:underline"
                      >
                        Inspect →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── High-velocity buyers ──────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-orange-500" />
          <h2 className="font-semibold text-foreground text-sm">
            High-Velocity Buyers — last 24h ({highVelocity.length})
          </h2>
          <span className="text-xs text-muted-foreground">≥5 orders & ≥USD 500 cumulative</span>
        </div>
        {highVelocity.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
            No high-velocity buyers.
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm [&_td]:whitespace-nowrap">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border bg-muted/10">
                  <th className="px-3 py-2 text-left font-medium">Buyer</th>
                  <th className="px-3 py-2 text-left font-medium">Orders</th>
                  <th className="px-3 py-2 text-left font-medium">Total</th>
                  <th className="px-3 py-2 text-left font-medium">Distinct creators</th>
                  <th className="px-3 py-2 text-left font-medium">Account age</th>
                  <th className="px-3 py-2 text-left font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {highVelocity.map((v) => {
                  const ageDays = v.buyer
                    ? Math.floor((Date.now() - new Date(v.buyer.createdAt).getTime()) / (24 * 60 * 60 * 1000))
                    : 0
                  return (
                    <tr key={v.buyerId} className="border-b border-border last:border-0 hover:bg-muted/5">
                      <td className="px-3 py-2 text-xs text-foreground">
                        {v.buyer ? `${v.buyer.name} <${v.buyer.email}>` : v.buyerId.slice(-8).toUpperCase()}
                      </td>
                      <td className="px-3 py-2 text-orange-500 font-semibold">{v.orderCount}</td>
                      <td className="px-3 py-2 text-foreground font-medium">{fmtUsd(v.sumAmountUsd)}</td>
                      <td className="px-3 py-2 text-foreground">{v.distinctCreators}</td>
                      <td className={`px-3 py-2 text-xs ${ageDays < 7 ? 'text-amber-500 font-semibold' : 'text-muted-foreground'}`}>
                        {ageDays < 1 ? 'today' : `${ageDays}d`}
                      </td>
                      <td className="px-3 py-2">
                        <Link
                          href={`/admin/users/${v.buyerId}`}
                          className="text-xs text-primary hover:underline"
                        >
                          Inspect →
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-xs text-muted-foreground">
        Generated {fmtDate(data.generatedAt)} — refresh page to recompute.
      </p>
    </div>
  )
}
