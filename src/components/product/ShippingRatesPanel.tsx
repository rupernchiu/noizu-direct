'use client'

import { useState } from 'react'
import { Truck, ChevronDown, ChevronUp, BadgeCheck, AlertTriangle } from 'lucide-react'
import { SHIPPING_COUNTRIES, ROW_KEY, type ShippingRateMap } from '@/lib/shipping'

interface Props {
  rates: ShippingRateMap                 // resolved (product override ?? creator)
  freeThresholdUsdCents: number | null
  combinedShippingEnabled: boolean
  detectedCountryCode: string | null     // ISO-2 best guess
  source: 'product' | 'creator'
}

function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export function ShippingRatesPanel({
  rates,
  freeThresholdUsdCents,
  combinedShippingEnabled,
  detectedCountryCode,
  source,
}: Props) {
  const [expanded, setExpanded] = useState(false)

  const detected = detectedCountryCode?.toUpperCase() ?? null
  const detectedRate = detected
    ? (rates[detected as keyof ShippingRateMap] ?? rates[ROW_KEY] ?? null)
    : null
  const detectedFromRow = detected != null && rates[detected as keyof ShippingRateMap] == null && rates[ROW_KEY] != null
  const detectedCountryName = detected
    ? (SHIPPING_COUNTRIES.find(c => c.code === detected)?.name ?? detected)
    : null

  const hasAnyRate = Object.keys(rates).length > 0

  return (
    <div className="rounded-xl bg-card border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Truck className="size-4 text-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Shipping</h2>
        </div>
        {source === 'product' && (
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground bg-surface border border-border rounded px-1.5 py-0.5">
            Listing rate
          </span>
        )}
      </div>

      {/* Detected destination */}
      {detected && detectedRate != null && (
        <div className="rounded-lg bg-surface border border-border px-3 py-2.5 mb-3">
          <p className="text-xs text-muted-foreground">Shipping to {detectedCountryName}</p>
          <p className="text-base font-semibold text-foreground mt-0.5">
            {formatUsd(detectedRate)}
            {detectedFromRow && <span className="text-[11px] font-normal text-muted-foreground ml-2">(rest-of-world rate)</span>}
          </p>
        </div>
      )}

      {detected && detectedRate == null && (
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2.5 mb-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="size-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-semibold text-amber-500">Cannot ship to {detectedCountryName}</p>
              <p className="text-muted-foreground mt-0.5">This creator hasn't set a rate for your country yet. Try contacting them via Tickets.</p>
            </div>
          </div>
        </div>
      )}

      {!detected && hasAnyRate && (
        <p className="text-xs text-muted-foreground mb-3">
          Final shipping is calculated from your address at checkout.
        </p>
      )}

      {!hasAnyRate && (
        <p className="text-xs text-amber-500 mb-3">
          This creator hasn't set up shipping rates yet — checkout will be blocked.
        </p>
      )}

      {/* Free shipping callout */}
      {freeThresholdUsdCents != null && hasAnyRate && (
        <div className="flex items-center gap-2 text-xs text-emerald-500 mb-3">
          <BadgeCheck className="size-3.5" />
          Free shipping on orders over {formatUsd(freeThresholdUsdCents)} from this creator.
        </div>
      )}

      {/* Combined shipping note */}
      {combinedShippingEnabled && (
        <p className="text-[11px] text-muted-foreground mb-3">
          Buying multiple items from this creator? You only pay the highest shipping rate, not per item.
        </p>
      )}

      {/* See all rates */}
      {hasAnyRate && (
        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          className="text-xs text-foreground hover:underline flex items-center gap-1"
        >
          {expanded ? 'Hide all rates' : 'See rates for all countries'}
          {expanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
        </button>
      )}

      {expanded && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mt-3 pt-3 border-t border-border">
          {SHIPPING_COUNTRIES.map(c => {
            const cents = rates[c.code as keyof ShippingRateMap]
            const fallback = rates[ROW_KEY]
            const eff = cents ?? fallback
            const isDetected = detected === c.code
            return (
              <div
                key={c.code}
                className={`text-xs flex items-center justify-between rounded px-2 py-1 ${
                  isDetected ? 'bg-primary/10 border border-primary/30' : ''
                }`}
              >
                <span className="text-muted-foreground">{c.name}</span>
                <span className={eff == null ? 'text-amber-500 font-medium' : 'text-foreground font-medium'}>
                  {eff == null ? '—' : formatUsd(eff)}
                </span>
              </div>
            )
          })}
          <div className="text-xs flex items-center justify-between rounded px-2 py-1">
            <span className="text-muted-foreground italic">Rest of World</span>
            <span className={rates[ROW_KEY] == null ? 'text-amber-500 font-medium' : 'text-foreground font-medium'}>
              {rates[ROW_KEY] == null ? '—' : formatUsd(rates[ROW_KEY]!)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
