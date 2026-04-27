'use client'

// Per-product shipping rate inputs (Shipping V2, 2026-04-27).
//
// Used inline on the new- and edit-listing forms, and in the CRUD table on
// /dashboard/shipping. Parent owns:
//   • `enabled` — whether the listing charges shipping at all (boolean)
//   • `rateMap` — { [iso2|"ROW"]: usdCents } | null  (null = no map yet)
// The component renders the 4-zone UI (domestic-my, SEA-Tier1, SEA-Tier2, ROW)
// and emits a fresh map on every input change. Empty inputs are dropped from
// the emitted map; ROW empty means "block buyers outside SEA."

import { useEffect, useMemo, useState } from 'react'
import { Truck } from 'lucide-react'
import {
  ROW_KEY,
  SHIPPING_ZONES,
  type ShippingRateMap,
} from '@/lib/shipping'

export interface ShippingRateInputsProps {
  enabled: boolean
  rateMap: ShippingRateMap | null
  onEnabledChange: (next: boolean) => void
  onRateMapChange: (next: ShippingRateMap | null) => void
  showCommissionHint?: boolean
  disabled?: boolean
}

function pickZoneInitial(map: ShippingRateMap | null): Record<string, string> {
  const out: Record<string, string> = { 'domestic-my': '', 'sea-tier1': '', 'sea-tier2': '', row: '' }
  if (!map) return out
  for (const z of SHIPPING_ZONES) {
    const first = z.countries.find(c => map[c as keyof ShippingRateMap] != null)
    if (first != null) {
      const cents = map[first as keyof ShippingRateMap]!
      out[z.key] = (cents / 100).toFixed(2)
    }
  }
  return out
}

function inputsToMap(zoneInputs: Record<string, string>): ShippingRateMap | null {
  const out: ShippingRateMap = {}
  for (const z of SHIPPING_ZONES) {
    const raw = (zoneInputs[z.key] ?? '').trim()
    if (raw === '') continue
    const cents = Math.round(parseFloat(raw) * 100)
    if (!Number.isFinite(cents) || cents < 0) continue
    for (const c of z.countries) out[c as keyof ShippingRateMap] = cents
  }
  return Object.keys(out).length === 0 ? null : out
}

export function ShippingRateInputs({
  enabled,
  rateMap,
  onEnabledChange,
  onRateMapChange,
  showCommissionHint = true,
  disabled = false,
}: ShippingRateInputsProps) {
  // Internal zone-input state seeded from the parent's map. Parent updates the
  // map via onRateMapChange whenever the inputs change; we don't re-seed from
  // the map afterward (that would clobber in-flight typing).
  const initial = useMemo(() => pickZoneInitial(rateMap), [])  // eslint-disable-line react-hooks/exhaustive-deps
  const [zoneInputs, setZoneInputs] = useState<Record<string, string>>(initial)

  // Emit the parsed map up whenever the inputs change.
  useEffect(() => {
    if (!enabled) {
      onRateMapChange(null)
      return
    }
    onRateMapChange(inputsToMap(zoneInputs))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoneInputs, enabled])

  return (
    <div className="space-y-3 rounded-lg bg-card border border-border p-4">
      <div className="flex items-start gap-2">
        <Truck className="size-4 text-foreground shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">Shipping</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Set per-country rates that buyers will pay on top of the listing price.
            You receive the full shipping amount at payout — the platform takes no cut.
          </p>
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          disabled={disabled}
          onChange={e => onEnabledChange(e.target.checked)}
          className="w-4 h-4 rounded border-border accent-primary"
        />
        <span className="text-sm text-foreground">Charge buyers for shipping on this listing</span>
      </label>

      {enabled && (
        <div className="space-y-3 pt-1">
          <div className="grid grid-cols-2 gap-3">
            {SHIPPING_ZONES.map(z => (
              <div key={z.key}>
                <label className="block text-[11px] text-muted-foreground mb-1">{z.label}</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs pointer-events-none">$</span>
                  <input
                    type="number"
                    step="0.50"
                    min="0"
                    placeholder={z.key === 'row' ? '(empty=block ROW)' : '(empty=skip zone)'}
                    value={zoneInputs[z.key] ?? ''}
                    disabled={disabled}
                    onChange={e => setZoneInputs(prev => ({ ...prev, [z.key]: e.target.value }))}
                    className="w-full h-9 pl-6 pr-2 rounded-md bg-background border border-border text-sm text-foreground"
                  />
                </div>
                <p className="mt-0.5 text-[10px] text-muted-foreground/80">{z.helper}</p>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Empty zones fall through to <code className="text-foreground">{ROW_KEY}</code> if set. Otherwise buyers in those countries can&apos;t order this item.
          </p>
          {showCommissionHint && (
            <p className="text-[11px] text-muted-foreground border-t border-border pt-2">
              <span className="font-medium text-foreground">Bulk orders or unusual shipping?</span>{' '}
              Use a <a href="/dashboard/listings/new?type=COMMISSION" className="text-primary hover:underline">Commission listing</a> instead — buyer gets a quote with shipping baked in.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
