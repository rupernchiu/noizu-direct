'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Package, Lock, CheckCircle, Truck, ExternalLink } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getDisputeEligibility } from '@/lib/dispute-eligibility'

interface Order {
  id: string; status: string; amountUsd: number; escrowStatus: string
  trackingNumber: string | null; courierName: string | null; courierCode: string | null
  trackingAddedAt: Date | null; estimatedDelivery: Date | null
  escrowAutoReleaseAt: Date | null; buyerConfirmedAt: Date | null
  createdAt: Date; escrowHeldAt: Date | null
  product: { title: string; type: string; images: string }
  dispute: { id: string; reason: string; status: string; createdAt: Date } | null
}

const STEPS = ['Order Placed', 'Payment Protected', 'In Production', 'Shipped', 'Delivered']

function getStepIndex(order: Order): number {
  if (order.buyerConfirmedAt || order.escrowStatus === 'RELEASED') return 4
  if (order.status === 'SHIPPED' || order.escrowStatus === 'TRACKING_ADDED') return 3
  if (['PAID', 'PROCESSING'].includes(order.status) || order.escrowStatus === 'HELD') return 2
  if (order.escrowHeldAt) return 1
  return 0
}

function fmt(d: Date | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function OrderDetailClient({ order, trackingUrl, courierDisplayName }: {
  order: Order; trackingUrl: string | null; courierDisplayName: string | null
}) {
  const router = useRouter()
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const currentStep = getStepIndex(order)
  const imgs = (() => { try { return JSON.parse(order.product.images) as string[] } catch { return [] } })()

  async function confirmReceipt() {
    setConfirming(true)
    const res = await fetch(`/api/orders/${order.id}/confirm-receipt`, { method: 'POST' })
    if (res.ok) { router.refresh(); setShowConfirm(false) }
    setConfirming(false)
  }

  const eligibility = getDisputeEligibility({
    product: { type: order.product.type },
    status: order.status,
    createdAt: order.createdAt,
    trackingAddedAt: order.trackingAddedAt,
    dispute: order.dispute,
  })
  const isReleased = ['RELEASED', 'PARTIALLY_REFUNDED', 'REFUNDED'].includes(order.escrowStatus)
  const shortId = order.id.slice(-8).toUpperCase()

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      {/* Header */}
      <div className="mb-6">
        <Link href="/account/orders" className="text-sm text-muted-foreground hover:text-foreground mb-2 inline-block">← Back to orders</Link>
        <h1 className="text-2xl font-bold text-foreground">Order #{shortId}</h1>
        <p className="text-sm text-muted-foreground mt-1">{order.product.title} · Placed {fmt(order.createdAt)}</p>
      </div>

      {/* Progress bar */}
      <div className="bg-card border border-border rounded-xl p-5 mb-4">
        <div className="flex items-center justify-between relative">
          <div style={{ position: 'absolute', top: '14px', left: '12px', right: '12px', height: '2px', background: 'var(--border)', zIndex: 0 }} />
          {STEPS.map((step, i) => {
            const done = i < currentStep
            const active = i === currentStep
            return (
              <div key={step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 1, flex: 1 }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: done ? '#7c3aed' : active ? '#7c3aed' : 'var(--border)',
                  border: active ? '3px solid rgba(124,58,237,0.3)' : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: '11px', fontWeight: 700,
                }}>
                  {done ? '✓' : i + 1}
                </div>
                <p style={{ margin: '6px 0 0', fontSize: '10px', textAlign: 'center', color: active || done ? '#7c3aed' : 'var(--muted-foreground)', fontWeight: active ? 600 : 400, lineHeight: 1.3 }}>{step}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Tracking */}
      {order.trackingNumber && (
        <div className="bg-card border border-border rounded-xl p-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Truck size={18} style={{ color: '#3b82f6' }} />
            <h2 className="font-semibold text-foreground">Your order is on the way!</h2>
          </div>
          <div className="grid grid-cols-2 gap-y-2 text-sm mb-3">
            <span className="text-muted-foreground">Courier</span>
            <span className="text-foreground">{courierDisplayName ?? order.courierName}</span>
            <span className="text-muted-foreground">Tracking</span>
            <span className="text-foreground font-mono text-xs">{order.trackingNumber}</span>
            <span className="text-muted-foreground">Shipped</span>
            <span className="text-foreground">{fmt(order.trackingAddedAt)}</span>
            {order.estimatedDelivery && <>
              <span className="text-muted-foreground">Est. delivery</span>
              <span className="text-foreground">{fmt(order.estimatedDelivery)}</span>
            </>}
          </div>
          {trackingUrl && (
            <a href={trackingUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              Track on {courierDisplayName} <ExternalLink size={12} />
            </a>
          )}
        </div>
      )}

      {/* Protection / escrow */}
      {!isReleased && order.amountUsd > 0 && (
        <div className="bg-card border border-border rounded-xl p-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Lock size={18} style={{ color: '#7c3aed' }} />
            <h2 className="font-semibold text-foreground">Your payment is protected</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-1">
            USD {(order.amountUsd / 100).toFixed(2)} held securely until delivery
          </p>
          {order.escrowAutoReleaseAt && (
            <p className="text-sm text-muted-foreground mb-4">
              Protection expires: {fmt(order.escrowAutoReleaseAt)}
            </p>
          )}
          <div className="flex flex-col gap-2">
            {!order.buyerConfirmedAt && order.escrowStatus === 'TRACKING_ADDED' && (
              <button suppressHydrationWarning onClick={() => setShowConfirm(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 16px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', width: '100%', justifyContent: 'center' }}>
                <CheckCircle size={16} /> Confirm Receipt — Release Payment
              </button>
            )}
            {eligibility.status === 'eligible' && (
              <Link href={`/account/orders/${order.id}/dispute`}
                style={{ display: 'block', textAlign: 'center', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '8px', padding: '10px 16px', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }}>
                Raise a Dispute
              </Link>
            )}
            {eligibility.status === 'not_yet' && (
              <p style={{ fontSize: '12px', color: 'var(--muted-foreground)', textAlign: 'center' }}>
                Dispute available in {eligibility.availableInDays} day{eligibility.availableInDays !== 1 ? 's' : ''}
              </p>
            )}
            {eligibility.status === 'has_dispute' && (
              <Link href={`/account/disputes/${eligibility.disputeId}`}
                style={{ display: 'block', textAlign: 'center', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', borderRadius: '8px', padding: '10px 16px', fontSize: '14px', fontWeight: 500, textDecoration: 'none', background: 'rgba(239,68,68,0.05)' }}>
                View Dispute · {order.dispute?.status.toLowerCase().replace(/_/g, ' ')}
              </Link>
            )}
          </div>
        </div>
      )}

      {isReleased && (
        <div className="bg-card border border-border rounded-xl p-5 mb-4 flex items-center gap-3">
          <CheckCircle size={20} style={{ color: '#22c55e', flexShrink: 0 }} />
          <div>
            <p className="font-semibold text-foreground text-sm">Payment released</p>
            <p className="text-xs text-muted-foreground">The creator has been paid. Thank you for your order!</p>
          </div>
        </div>
      )}

      {/* Product summary */}
      <div className="bg-card border border-border rounded-xl p-5 flex gap-3">
        {imgs[0] && <img src={imgs[0]} alt={order.product.title} style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />}
        <div>
          <p className="font-medium text-foreground text-sm">{order.product.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {order.product.type} · USD {(order.amountUsd / 100).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Confirm receipt modal */}
      {showConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: 'var(--card)', borderRadius: '16px', border: '1px solid var(--border)', padding: '24px', maxWidth: '400px', width: '100%' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '18px', fontWeight: 700, color: 'var(--foreground)' }}>Confirm receipt?</h3>
            <p style={{ margin: '0 0 20px', fontSize: '14px', color: 'var(--muted-foreground)', lineHeight: 1.6 }}>
              By confirming receipt, you release the payment to the creator. <strong>This cannot be undone.</strong> Only confirm if you have received your order and are satisfied.
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button suppressHydrationWarning onClick={() => setShowConfirm(false)} style={{ padding: '8px 20px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--foreground)', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
              <button suppressHydrationWarning onClick={() => void confirmReceipt()} disabled={confirming} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#7c3aed', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer', opacity: confirming ? 0.6 : 1 }}>{confirming ? 'Releasing…' : 'Confirm'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
