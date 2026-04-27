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
  // Pricing breakdown (Phase 3.3 — surface tax & discount lines on receipt)
  subtotalUsd: number | null
  buyerFeeUsd: number | null
  shippingCostUsd: number
  discountAmount: number
  creatorTaxAmountUsd: number
  creatorTaxRatePercent: number | null
  destinationTaxAmountUsd: number
  destinationTaxRatePercent: number | null
  destinationTaxCountry: string | null
  reverseChargeApplied: boolean
  buyerBusinessTaxId: string | null
  // Phase 8 — escrow-framed receipt: new conditional tax lines
  creatorSalesTaxAmountUsd: number
  creatorSalesTaxRatePercent: number | null
  creatorSalesTaxLabel: string | null
  platformFeeBuyerTaxUsd: number
  platformFeeBuyerTaxRate: number | null
  buyerCountry: string | null
  displayCurrency: string
  displayAmount: number
  exchangeRate: number
  product: {
    title: string
    type: string
    images: string
    creator?: { displayName: string | null; username: string } | null
  }
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
      <div className="bg-card border border-border rounded-xl p-5 flex gap-3 mb-4">
        {imgs[0] && <img src={imgs[0]} alt={order.product.title} style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />}
        <div>
          <p className="font-medium text-foreground text-sm">{order.product.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {order.product.type} · USD {(order.amountUsd / 100).toFixed(2)}
          </p>
        </div>
      </div>

      <PricingBreakdown order={order} />

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

function fmtUsd(cents: number): string {
  return `USD ${(cents / 100).toFixed(2)}`
}

function PricingBreakdown({ order }: { order: Order }) {
  // Phase 8 — escrow-framed buyer receipt. Two attribution sections (FROM
  // CREATOR / FROM noizu.direct) precede the conditional tax lines. Lines
  // with amount = 0 are NOT rendered (no "$0.00" placeholders).
  const buyerFeeUsd = order.buyerFeeUsd ?? 0
  const shippingUsd = order.shippingCostUsd ?? 0
  const subtotal =
    order.subtotalUsd ??
    Math.max(
      0,
      order.amountUsd -
        buyerFeeUsd -
        order.creatorTaxAmountUsd -
        order.destinationTaxAmountUsd -
        order.creatorSalesTaxAmountUsd -
        order.platformFeeBuyerTaxUsd -
        shippingUsd,
    )

  const hasDiscount = order.discountAmount > 0
  const hasBuyerFee = buyerFeeUsd > 0
  const hasShipping = shippingUsd > 0
  const hasCreatorTax = order.creatorTaxAmountUsd > 0
  const hasCreatorSalesTax = order.creatorSalesTaxAmountUsd > 0
  const hasPlatformFeeBuyerTax = order.platformFeeBuyerTaxUsd > 0
  const hasDestinationTax = order.destinationTaxAmountUsd > 0
  const hasReverseCharge = order.reverseChargeApplied
  const showDisplayCurrency = order.displayCurrency !== 'USD' && order.displayAmount > 0

  // Legacy fallback: if no rail-aware breakdown captured AND no Phase 2/8 tax
  // lines, show the simple total-only view that was here before.
  if (
    order.subtotalUsd === null &&
    !hasCreatorTax &&
    !hasDestinationTax &&
    !hasCreatorSalesTax &&
    !hasPlatformFeeBuyerTax
  ) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="font-semibold text-foreground text-sm mb-3">Order total</h2>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Total paid</span>
          <span className="text-foreground font-medium">{fmtUsd(order.amountUsd)}</span>
        </div>
      </div>
    )
  }

  const creatorPortion = subtotal + shippingUsd
  const creatorDisplayName =
    order.product.creator?.displayName ?? order.product.creator?.username ?? 'Creator'
  // Tax base hint for the creator's own sales tax line (subtotal + shipping
  // per spec §11.4). We display just the dollar value, no per-line %-derivation.
  const creatorSalesTaxBase = subtotal + shippingUsd
  const creatorSalesTaxLabel = order.creatorSalesTaxLabel ?? 'Sales tax'
  const platformFeeTaxLabel = 'Service-fee tax'
  const destinationTaxLabel = order.destinationTaxCountry
    ? `${order.destinationTaxCountry} ${order.destinationTaxRatePercent ? '' : 'tax'}`.trim()
    : 'Destination tax'

  function fmtPercent(rateDecimalOrPercent: number | null, isDecimal: boolean): string {
    if (rateDecimalOrPercent == null) return ''
    const pct = isDecimal ? rateDecimalOrPercent * 100 : rateDecimalOrPercent
    // Strip trailing .0 for clean labels like "6%", keep "6.5%".
    return Number.isInteger(pct) ? `${pct}%` : `${pct.toFixed(2).replace(/\.?0+$/, '')}%`
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h2 className="font-semibold text-foreground text-sm mb-4">Receipt</h2>

      {/* FROM CREATOR section — listing + shipping (creator's money) */}
      <div className="space-y-2 mb-4">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          From creator{creatorDisplayName ? ` (${creatorDisplayName})` : ''}
        </p>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Listing price</span>
            <span className="text-foreground">{fmtUsd(subtotal)}</span>
          </div>
          {hasShipping && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipping (fulfilled by creator)</span>
              <span className="text-foreground">{fmtUsd(shippingUsd)}</span>
            </div>
          )}
          {hasShipping && (
            <div className="flex justify-between text-xs pt-1 border-t border-border/50">
              <span className="text-muted-foreground">Subtotal — creator&apos;s portion</span>
              <span className="text-muted-foreground">{fmtUsd(creatorPortion)}</span>
            </div>
          )}
          {hasDiscount && (
            <div className="flex justify-between text-success">
              <span>Discount</span>
              <span>− {fmtUsd(order.discountAmount)}</span>
            </div>
          )}
        </div>
      </div>

      {/* FROM noizu.direct section — service fee (platform's money) */}
      {hasBuyerFee && (
        <div className="space-y-2 mb-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            From noizu.direct (escrow &amp; payment service)
          </p>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Service fee</span>
              <span className="text-foreground">{fmtUsd(buyerFeeUsd)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Subtotal of buyer's bill before tax lines */}
      <div className="flex justify-between text-sm pt-3 border-t border-border">
        <span className="text-muted-foreground">Subtotal</span>
        <span className="text-foreground">
          {fmtUsd(creatorPortion + buyerFeeUsd - order.discountAmount)}
        </span>
      </div>

      {/* Conditional tax lines — render only when amount > 0 */}
      {(hasCreatorSalesTax || hasPlatformFeeBuyerTax || hasDestinationTax || hasCreatorTax) && (
        <div className="mt-3 space-y-1.5 text-sm">
          {hasCreatorSalesTax && (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Seller&apos;s {creatorSalesTaxLabel}
                  {order.creatorSalesTaxRatePercent != null
                    ? ` (${fmtPercent(order.creatorSalesTaxRatePercent, true)})`
                    : ''}
                  {' '}
                  on {fmtUsd(creatorSalesTaxBase)}
                </span>
                <span className="text-foreground">{fmtUsd(order.creatorSalesTaxAmountUsd)}</span>
              </div>
              <p className="text-[11px] text-muted-foreground/80 pl-1">
                Collected by noizu.direct on behalf of the creator and remitted under their tax ID.
              </p>
            </>
          )}
          {hasPlatformFeeBuyerTax && (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {platformFeeTaxLabel}
                  {order.platformFeeBuyerTaxRate != null
                    ? ` (${fmtPercent(order.platformFeeBuyerTaxRate, true)})`
                    : ''}
                  {' '}
                  on {fmtUsd(buyerFeeUsd)}
                </span>
                <span className="text-foreground">{fmtUsd(order.platformFeeBuyerTaxUsd)}</span>
              </div>
              <p className="text-[11px] text-muted-foreground/80 pl-1">
                noizu.direct&apos;s escrow service includes this tax, remitted to the local tax authority.
              </p>
            </>
          )}
          {hasDestinationTax && (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {destinationTaxLabel}
                  {order.destinationTaxRatePercent != null
                    ? ` (${fmtPercent(order.destinationTaxRatePercent, false)})`
                    : ''}
                </span>
                <span className="text-foreground">{fmtUsd(order.destinationTaxAmountUsd)}</span>
              </div>
              <p className="text-[11px] text-muted-foreground/80 pl-1">
                Collected by noizu.direct as deemed supplier and remitted to the local tax authority.
              </p>
            </>
          )}
          {hasCreatorTax && !hasCreatorSalesTax && (
            // Phase 2.1 self-declared markup (legacy path) — only render when
            // the new Phase 8 sales-tax line isn't already showing for the same
            // creator (would double-attribute).
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Creator tax
                {order.creatorTaxRatePercent != null
                  ? ` (${fmtPercent(order.creatorTaxRatePercent, false)})`
                  : ''}
              </span>
              <span className="text-foreground">{fmtUsd(order.creatorTaxAmountUsd)}</span>
            </div>
          )}
          {hasReverseCharge && (
            <p className="text-[11px] text-muted-foreground/80 pl-1 italic">
              Reverse-charge B2B (no tax collected; buyer self-accounts).
            </p>
          )}
        </div>
      )}

      {/* Total */}
      <div className="flex justify-between pt-3 mt-3 border-t border-border font-semibold text-sm">
        <span className="text-foreground">Total</span>
        <span className="text-foreground">{fmtUsd(order.amountUsd)}</span>
      </div>
      {showDisplayCurrency && (
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>Charged in {order.displayCurrency}</span>
          <span>{order.displayCurrency} {(order.displayAmount / 100).toFixed(2)}</span>
        </div>
      )}

      {/* Reverse-charge full disclosure (replaces old block — kept for B2B context) */}
      {hasReverseCharge && (
        <p className="mt-3 text-xs text-muted-foreground border-t border-border pt-3">
          Reverse-charge VAT: tax has been zeroed because you provided a business
          tax ID{order.buyerBusinessTaxId ? ` (${order.buyerBusinessTaxId})` : ''}. You are responsible for
          self-assessing the tax in your jurisdiction.
        </p>
      )}

      {/* Escrow disclosure footer (src/content/legal/escrow-disclosure.md, abbreviated) */}
      <p className="mt-4 text-[11px] text-muted-foreground border-t border-border pt-3 leading-relaxed">
        noizu.direct provides escrow and payment-handling for this transaction. Goods are
        sold and shipped by the creator. Tax line items are itemized and clearly attributed
        to the responsible party. Lines that don&apos;t apply to your purchase aren&apos;t shown.
      </p>
    </div>
  )
}
