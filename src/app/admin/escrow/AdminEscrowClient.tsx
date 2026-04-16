'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface SummaryData {
  heldAmount: number; heldCount: number;
  trackingAmount: number; trackingCount: number;
  disputedAmount: number; disputedCount: number;
  releasedToday: number;
}
interface OrderRow {
  id: string; amountUsd: number; escrowStatus: string; fulfillmentDeadline: Date | null
  escrowAutoReleaseAt: Date | null; createdAt: Date
  product: { title: string; type: string }
  buyer: { name: string }
  creator: { name: string }
}
interface FlaggedCreator {
  id: string; name: string; email: string; warningCount: number; isFlaggedForReview: boolean
}

function usd(cents: number) { return `USD ${(cents / 100).toFixed(2)}` }

function StatCard({ label, count, amount, color }: { label: string; count: number; amount: number; color: string }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 20px' }}>
      <p style={{ margin: 0, fontSize: '12px', color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
      <p style={{ margin: '4px 0 0', fontSize: '22px', fontWeight: 700, color }}>{usd(amount)}</p>
      <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--muted-foreground)' }}>{count} orders</p>
    </div>
  )
}

export default function AdminEscrowClient({ summary, orders, flaggedCreators }: {
  summary: SummaryData; orders: OrderRow[]; flaggedCreators: FlaggedCreator[]
}) {
  const router = useRouter()
  const [cronStatus, setCronStatus] = useState<string | null>(null)
  const [actionId, setActionId] = useState<string | null>(null)

  async function runCron(endpoint: string, label: string) {
    setCronStatus(`Running ${label}…`)
    const res = await fetch(endpoint, { method: 'POST' })
    const data = await res.json() as Record<string, unknown>
    setCronStatus(`${label} complete: ${JSON.stringify(data)}`)
    router.refresh()
  }

  async function manualRelease(id: string) {
    setActionId(id)
    await fetch(`/api/admin/escrow/${id}/release`, { method: 'POST' })
    setActionId(null)
    router.refresh()
  }

  async function manualRefund(id: string, amount: number) {
    const usdStr = prompt(`Refund amount in USD (max ${(amount / 100).toFixed(2)}):`)
    if (!usdStr) return
    const cents = Math.round(parseFloat(usdStr) * 100)
    if (isNaN(cents) || cents <= 0) return
    setActionId(id)
    await fetch(`/api/admin/escrow/${id}/refund`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: cents, note: 'Admin manual refund' }),
    })
    setActionId(null)
    router.refresh()
  }

  function statusColor(s: string) {
    if (s === 'HELD') return '#eab308'
    if (s === 'TRACKING_ADDED') return '#3b82f6'
    if (s === 'DISPUTED') return '#ef4444'
    return 'var(--muted-foreground)'
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-6">Escrow Overview</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="Held" count={summary.heldCount} amount={summary.heldAmount} color="#eab308" />
        <StatCard label="Shipped (timer)" count={summary.trackingCount} amount={summary.trackingAmount} color="#3b82f6" />
        <StatCard label="Disputed" count={summary.disputedCount} amount={summary.disputedAmount} color="#ef4444" />
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 20px' }}>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Released Today</p>
          <p style={{ margin: '4px 0 0', fontSize: '22px', fontWeight: 700, color: '#22c55e' }}>{usd(summary.releasedToday)}</p>
        </div>
      </div>

      {/* Cron controls */}
      <div className="bg-card border border-border rounded-xl p-5 mb-6">
        <h2 className="font-semibold text-foreground mb-3">Cron Controls</h2>
        <div className="flex gap-3 flex-wrap items-center">
          <button suppressHydrationWarning onClick={() => void runCron('/api/cron/escrow-processor', 'Escrow Processor')} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#7c3aed', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Run Escrow Processor</button>
          <button suppressHydrationWarning onClick={() => void runCron('/api/cron/fulfillment-reminders', 'Fulfillment Reminders')} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#3b82f6', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Run Fulfillment Reminders</button>
          {cronStatus && <p style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>{cronStatus}</p>}
        </div>
      </div>

      {/* Orders table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden mb-6">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Active Escrow Orders</h2>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
                {['Order', 'Product', 'Amount', 'Status', 'Buyer', 'Creator', 'Deadline', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 && <tr><td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: 'var(--muted-foreground)' }}>No active escrow orders</td></tr>}
              {orders.map(o => (
                <tr key={o.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: '11px' }}>#{o.id.slice(-8).toUpperCase()}</td>
                  <td style={{ padding: '10px 14px', maxWidth: '160px' }}><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', color: 'var(--foreground)' }}>{o.product.title}</span></td>
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--foreground)', whiteSpace: 'nowrap' }}>{usd(o.amountUsd)}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: statusColor(o.escrowStatus), background: `${statusColor(o.escrowStatus)}18`, padding: '2px 8px', borderRadius: '10px' }}>{o.escrowStatus}</span>
                  </td>
                  <td style={{ padding: '10px 14px', color: 'var(--foreground)' }}>{o.buyer.name}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--foreground)' }}>{o.creator.name}</td>
                  <td style={{ padding: '10px 14px', fontSize: '12px', color: o.fulfillmentDeadline && new Date(o.fulfillmentDeadline) < new Date() ? '#ef4444' : 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>
                    {o.fulfillmentDeadline ? new Date(o.fulfillmentDeadline).toLocaleDateString('en-MY') : '—'}
                  </td>
                  <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button suppressHydrationWarning onClick={() => void manualRelease(o.id)} disabled={actionId === o.id} style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '6px', border: 'none', background: '#22c55e', color: '#fff', cursor: 'pointer', opacity: actionId === o.id ? 0.6 : 1 }}>Release</button>
                      <button suppressHydrationWarning onClick={() => void manualRefund(o.id, o.amountUsd)} disabled={actionId === o.id} style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '6px', border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', opacity: actionId === o.id ? 0.6 : 1 }}>Refund</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Creator warning tracker */}
      {flaggedCreators.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold text-foreground">Creator Warning Tracker</h2>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
                {['Creator', 'Email', 'Warnings', 'Status'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {flaggedCreators.map(c => {
                const rowBg = c.warningCount >= 3 ? 'rgba(239,68,68,0.04)' : c.warningCount >= 2 ? 'rgba(249,115,22,0.04)' : 'rgba(234,179,8,0.04)'
                const warnColor = c.warningCount >= 3 ? '#ef4444' : c.warningCount >= 2 ? '#f97316' : '#eab308'
                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border)', background: rowBg }}>
                    <td style={{ padding: '10px 14px', color: 'var(--foreground)', fontWeight: 500 }}>{c.name}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--muted-foreground)' }}>{c.email}</td>
                    <td style={{ padding: '10px 14px' }}><span style={{ fontWeight: 700, color: warnColor }}>{c.warningCount} warning{c.warningCount !== 1 ? 's' : ''}</span></td>
                    <td style={{ padding: '10px 14px' }}>
                      {c.isFlaggedForReview
                        ? <span style={{ fontSize: '11px', fontWeight: 700, color: '#ef4444', background: 'rgba(239,68,68,0.1)', padding: '2px 8px', borderRadius: '10px' }}>🚨 REVIEW REQUIRED</span>
                        : <span style={{ fontSize: '11px', color: 'var(--muted-foreground)' }}>Monitoring</span>
                      }
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
