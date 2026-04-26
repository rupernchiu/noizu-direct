'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Truck, Info, CheckCircle2, AlertTriangle, Globe } from 'lucide-react'
import {
  SHIPPING_COUNTRIES,
  SHIPPING_ZONES,
  SHIPPING_BENCHMARKS,
  ROW_KEY,
  type ShippingRateMap,
} from '@/lib/shipping'

interface Settings {
  rates: ShippingRateMap
  freeThresholdUsdCents: number | null
  combinedShippingEnabled: boolean
}

const ZONE_FLAGS: Record<string, string> = {
  MY: 'MY', SG: 'SG', PH: 'PH', ID: 'ID', TH: 'TH',
  VN: 'VN', KH: 'KH', MM: 'MM', LA: 'LA', BN: 'BN',
  ROW: 'ROW',
}

function dollarsFromCents(cents: number | null | undefined): string {
  if (cents == null) return ''
  return (cents / 100).toFixed(2)
}

function centsFromDollars(input: string): number | null {
  const trimmed = input.trim()
  if (trimmed === '') return null
  const num = parseFloat(trimmed)
  if (!Number.isFinite(num) || num < 0) return null
  return Math.round(num * 100)
}

export default function ShippingSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [perCountryMode, setPerCountryMode] = useState(false)
  // Zone inputs (USD dollars as strings, so users can clear them)
  const [zoneInputs, setZoneInputs] = useState<Record<string, string>>({
    'domestic-my': '',
    'sea-tier1': '',
    'sea-tier2': '',
    row: '',
  })
  // Per-country override inputs
  const [countryInputs, setCountryInputs] = useState<Record<string, string>>({})
  const [freeThresholdInput, setFreeThresholdInput] = useState('')
  const [combinedEnabled, setCombinedEnabled] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/dashboard/shipping')
    if (res.ok) {
      const data = await res.json() as Settings
      setSettings(data)
      const inputs: Record<string, string> = {}
      for (const c of SHIPPING_COUNTRIES) inputs[c.code] = dollarsFromCents(data.rates[c.code as keyof ShippingRateMap])
      inputs[ROW_KEY] = dollarsFromCents(data.rates[ROW_KEY])
      setCountryInputs(inputs)
      // Detect per-country mode if any zone members differ from each other
      const isUniform = SHIPPING_ZONES.every(z => {
        const vals = z.countries.map(c => data.rates[c as keyof ShippingRateMap]).filter(v => v != null)
        if (vals.length === 0) return true
        return vals.every(v => v === vals[0])
      })
      setPerCountryMode(!isUniform)
      // Pre-fill zone inputs from first country in each zone
      const zi: Record<string, string> = {}
      for (const z of SHIPPING_ZONES) {
        const first = z.countries.find(c => data.rates[c as keyof ShippingRateMap] != null)
        zi[z.key] = first ? dollarsFromCents(data.rates[first as keyof ShippingRateMap]) : ''
      }
      setZoneInputs(zi)
      setFreeThresholdInput(dollarsFromCents(data.freeThresholdUsdCents))
      setCombinedEnabled(data.combinedShippingEnabled)
    }
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  const expandedRates = useMemo<Record<string, number | null>>(() => {
    const out: Record<string, number | null> = {}
    if (perCountryMode) {
      for (const c of SHIPPING_COUNTRIES) out[c.code] = centsFromDollars(countryInputs[c.code] ?? '')
      out[ROW_KEY] = centsFromDollars(countryInputs[ROW_KEY] ?? '')
    } else {
      for (const z of SHIPPING_ZONES) {
        const cents = centsFromDollars(zoneInputs[z.key] ?? '')
        for (const c of z.countries) out[c] = cents
      }
    }
    return out
  }, [perCountryMode, zoneInputs, countryInputs])

  const coverageCount = Object.values(expandedRates).filter(v => v != null).length
  const seaCovered = SHIPPING_COUNTRIES.every(c => expandedRates[c.code] != null) || expandedRates[ROW_KEY] != null
  const noRates = coverageCount === 0

  async function handleSave() {
    setSaving(true)
    const cleanRates: ShippingRateMap = {}
    for (const [k, v] of Object.entries(expandedRates)) {
      if (v != null) cleanRates[k as keyof ShippingRateMap] = v
    }
    const freeCents = centsFromDollars(freeThresholdInput)
    const res = await fetch('/api/dashboard/shipping', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rates: cleanRates,
        freeThresholdUsdCents: freeCents,
        combinedShippingEnabled: combinedEnabled,
      }),
    })
    if (res.ok) {
      setSavedAt(Date.now())
      void load()
    }
    setSaving(false)
  }

  if (loading || !settings) {
    return <div className="max-w-3xl mx-auto py-8 px-4 text-sm text-muted-foreground">Loading shipping settings…</div>
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="flex items-start gap-3 mb-2">
        <Truck className="size-6 text-foreground shrink-0 mt-1" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Shipping Rates</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tell buyers what you'll charge to ship a single item to their country. We charge no fee on shipping — every cent flows back to you at payout.
          </p>
        </div>
      </div>

      {/* How it works callout */}
      <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-4 my-4">
        <div className="flex gap-3">
          <Info className="size-4 text-blue-500 shrink-0 mt-0.5" />
          <div className="text-xs text-foreground/80 leading-relaxed">
            <p className="font-semibold text-blue-500 mb-1">How shipping works on noizu.direct</p>
            <ul className="list-disc list-inside space-y-1">
              <li>You set the rate. We pass the full amount to you — no platform fee, no tax on shipping.</li>
              <li>Cart with multiple items from you? We charge the highest rate (combined shipping). You can disable below.</li>
              <li>Buyers in countries you haven't priced see a "Cannot ship to your country" message. They can't check out.</li>
              <li>Refund rules: if the order hasn't been marked shipped, shipping is refunded. Once shipped, shipping is retained.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Coverage badge */}
      {!noRates && seaCovered && (
        <div className="flex items-center gap-2 text-sm text-emerald-500 mb-4">
          <CheckCircle2 className="size-4" />
          You're covered for {SHIPPING_COUNTRIES.length} SEA countries{expandedRates[ROW_KEY] != null ? ' + Rest of World' : ''}.
        </div>
      )}
      {noRates && (
        <div className="flex items-center gap-2 text-sm text-amber-500 mb-4">
          <AlertTriangle className="size-4" />
          No rates set yet — physical & POD listings can't be published until at least one country has a rate.
        </div>
      )}

      {/* Mode toggle */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3 mb-4">
        <div className="text-sm">
          <p className="font-semibold text-foreground">{perCountryMode ? 'Per-country rates' : 'By zone (recommended)'}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {perCountryMode
              ? 'Set a different rate for every country — fine for advanced setups.'
              : '5 rates fan out to 10 countries. Switch to per-country if your couriers vary.'}
          </p>
        </div>
        <button
          suppressHydrationWarning
          onClick={() => setPerCountryMode(p => !p)}
          className="text-xs px-3 py-1.5 rounded-md border border-border bg-surface text-foreground hover:bg-accent"
        >
          {perCountryMode ? 'Use zones' : 'Use per-country'}
        </button>
      </div>

      {/* Zone inputs */}
      {!perCountryMode && (
        <div className="rounded-xl border border-border bg-card p-5 mb-4">
          <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-3">Rates (USD per order)</p>
          <div className="flex flex-col gap-4">
            {SHIPPING_ZONES.map(z => (
              <div key={z.key}>
                <div className="flex items-baseline justify-between mb-1.5">
                  <label className="text-sm font-medium text-foreground">{z.label}</label>
                  {(() => {
                    const bench = SHIPPING_BENCHMARKS[z.countries[0] as string]
                    if (!bench) return null
                    return (
                      <span className="text-[11px] text-muted-foreground">
                        Typical: ${(bench.lowUsdCents / 100).toFixed(2)} – ${(bench.highUsdCents / 100).toFixed(2)}
                      </span>
                    )
                  })()}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">$</span>
                  <input
                    suppressHydrationWarning
                    type="number"
                    step="0.50"
                    min="0"
                    placeholder={z.key === 'row' ? '(leave empty to block ROW)' : ''}
                    value={zoneInputs[z.key] ?? ''}
                    onChange={e => setZoneInputs(prev => ({ ...prev, [z.key]: e.target.value }))}
                    className="w-full h-10 pl-7 pr-3 rounded-md border border-border bg-surface text-foreground text-sm"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">{z.helper}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-country inputs */}
      {perCountryMode && (
        <div className="rounded-xl border border-border bg-card p-5 mb-4">
          <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-3">Rates per country (USD)</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[...SHIPPING_COUNTRIES.map(c => ({ code: c.code, name: c.name })), { code: ROW_KEY, name: 'Rest of World' }].map(({ code, name }) => (
              <div key={code}>
                <label className="block text-xs text-muted-foreground mb-1">{ZONE_FLAGS[code]} {name}</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs pointer-events-none">$</span>
                  <input
                    suppressHydrationWarning
                    type="number"
                    step="0.50"
                    min="0"
                    value={countryInputs[code] ?? ''}
                    onChange={e => setCountryInputs(prev => ({ ...prev, [code]: e.target.value }))}
                    className="w-full h-9 pl-6 pr-2 rounded-md border border-border bg-surface text-foreground text-sm"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Combined shipping + free threshold */}
      <div className="rounded-xl border border-border bg-card p-5 mb-4">
        <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-3">Combined shipping</p>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            suppressHydrationWarning
            type="checkbox"
            checked={combinedEnabled}
            onChange={e => setCombinedEnabled(e.target.checked)}
            className="mt-1"
          />
          <div className="text-sm">
            <p className="text-foreground font-medium">Charge highest item rate when buyers order multiple things from me</p>
            <p className="text-xs text-muted-foreground mt-0.5">Most fans appreciate this. Uncheck if you really do mail items separately.</p>
          </div>
        </label>

        <div className="border-t border-border my-4" />

        <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2">Free shipping threshold</p>
        <p className="text-xs text-muted-foreground mb-2">When a buyer's cart with you reaches this amount, shipping becomes free. Trending boost included.</p>
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">$</span>
            <input
              suppressHydrationWarning
              type="number"
              step="1"
              min="0"
              placeholder="(none)"
              value={freeThresholdInput}
              onChange={e => setFreeThresholdInput(e.target.value)}
              className="w-32 h-10 pl-7 pr-3 rounded-md border border-border bg-surface text-foreground text-sm"
            />
          </div>
          <span className="text-xs text-muted-foreground">Leave blank for no free-shipping promo.</span>
        </div>
      </div>

      {/* Live preview */}
      <div className="rounded-xl border border-border bg-surface p-5 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Globe className="size-4 text-foreground" />
          <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Buyer preview</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {SHIPPING_COUNTRIES.map(c => {
            const cents = expandedRates[c.code]
            const fallback = expandedRates[ROW_KEY]
            const effective = cents ?? fallback
            return (
              <div key={c.code} className="text-xs flex items-center justify-between rounded-md bg-card border border-border px-2.5 py-1.5">
                <span className="text-muted-foreground">{c.name}</span>
                <span className={effective == null ? 'text-amber-500 font-semibold' : 'text-foreground font-semibold'}>
                  {effective == null ? '— blocked' : `$${(effective / 100).toFixed(2)}`}
                </span>
              </div>
            )
          })}
          <div className="text-xs flex items-center justify-between rounded-md bg-card border border-border px-2.5 py-1.5">
            <span className="text-muted-foreground">Rest of World</span>
            <span className={expandedRates[ROW_KEY] == null ? 'text-amber-500 font-semibold' : 'text-foreground font-semibold'}>
              {expandedRates[ROW_KEY] == null ? '— blocked' : `$${(expandedRates[ROW_KEY]! / 100).toFixed(2)}`}
            </span>
          </div>
        </div>
      </div>

      {/* Save bar */}
      <div className="flex items-center gap-3 sticky bottom-4 bg-card border border-border rounded-lg px-4 py-3 shadow-lg">
        <button
          suppressHydrationWarning
          onClick={() => void handleSave()}
          disabled={saving}
          className="px-4 py-2 rounded-md bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save shipping rates'}
        </button>
        {savedAt && Date.now() - savedAt < 4000 && (
          <span className="text-xs text-emerald-500 flex items-center gap-1"><CheckCircle2 className="size-3" /> Saved.</span>
        )}
        <span className="ml-auto text-[11px] text-muted-foreground">
          Per-listing overrides available on each listing's edit page.
        </span>
      </div>
    </div>
  )
}
