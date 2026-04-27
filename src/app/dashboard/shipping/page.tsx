'use client'

// /dashboard/shipping — Shipping V2 CRUD master view (2026-04-27).
//
// Top: cart-level prefs (free-ship threshold + combined-cart toggle) — these
// stay creator-wide because they only make sense at cart level.
// Below: all PHYSICAL/POD listings with their current per-country rates and
// inline edit (same component used on the listing form).

import { useState, useEffect, useCallback } from 'react'
import { Truck, CheckCircle2, AlertTriangle, Pencil, X, Save, Loader2 } from 'lucide-react'
import {
  SHIPPING_COUNTRIES,
  ROW_KEY,
  parseShippingMap,
  type ShippingRateMap,
  shippingCoversAllSEA,
} from '@/lib/shipping'
import { ShippingRateInputs } from '@/components/dashboard/ShippingRateInputs'

interface CartPrefs {
  freeThresholdUsdCents: number | null
  combinedShippingEnabled: boolean
}

interface ListingRow {
  id: string
  title: string
  type: string
  isActive: boolean
  shippingByCountry: string | null
}

function ratesSummary(map: ShippingRateMap | null): string {
  if (!map || Object.keys(map).length === 0) return 'Not set'
  const parts: string[] = []
  for (const c of SHIPPING_COUNTRIES) {
    const v = map[c.code as keyof ShippingRateMap]
    if (v != null) parts.push(`${c.code} $${(v / 100).toFixed(2)}`)
  }
  if (map[ROW_KEY] != null) parts.push(`ROW $${(map[ROW_KEY]! / 100).toFixed(2)}`)
  return parts.slice(0, 4).join(' · ') + (parts.length > 4 ? ` · +${parts.length - 4} more` : '')
}

function dollarsFromCents(cents: number | null | undefined): string {
  if (cents == null) return ''
  return (cents / 100).toFixed(2)
}

export default function ShippingDashboardPage() {
  const [prefs, setPrefs] = useState<CartPrefs | null>(null)
  const [listings, setListings] = useState<ListingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [prefsSavedAt, setPrefsSavedAt] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [freeThresholdInput, setFreeThresholdInput] = useState('')
  const [combinedEnabled, setCombinedEnabled] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const [prefsRes, listingsRes] = await Promise.all([
      fetch('/api/dashboard/shipping'),
      fetch('/api/dashboard/listings?shippingOnly=1'),
    ])
    if (prefsRes.ok) {
      const data = await prefsRes.json() as CartPrefs
      setPrefs(data)
      setFreeThresholdInput(dollarsFromCents(data.freeThresholdUsdCents))
      setCombinedEnabled(data.combinedShippingEnabled)
    }
    if (listingsRes.ok) {
      const data = await listingsRes.json() as { listings: ListingRow[] }
      setListings(data.listings.filter(l => l.type === 'PHYSICAL' || l.type === 'POD'))
    }
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  async function savePrefs() {
    setSavingPrefs(true)
    const trimmed = freeThresholdInput.trim()
    const cents = trimmed === '' ? null : Math.round(parseFloat(trimmed) * 100)
    const body = {
      freeThresholdUsdCents: cents,
      combinedShippingEnabled: combinedEnabled,
    }
    const res = await fetch('/api/dashboard/shipping', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSavingPrefs(false)
    if (res.ok) {
      setPrefsSavedAt(Date.now())
      const data = await res.json() as CartPrefs
      setPrefs(data)
      setTimeout(() => setPrefsSavedAt(null), 2000)
    }
  }

  async function saveListing(id: string, rates: ShippingRateMap | null) {
    const res = await fetch(`/api/products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shippingByCountry: rates }),
    })
    if (res.ok) {
      const updated = await res.json() as ListingRow
      setListings(prev => prev.map(l => l.id === id ? { ...l, shippingByCountry: updated.shippingByCountry } : l))
      setEditingId(null)
      return true
    }
    const err = await res.json().catch(() => ({})) as { error?: string }
    alert(err.error ?? 'Failed to save')
    return false
  }

  if (loading || !prefs) {
    return <div className="p-6 text-muted-foreground">Loading…</div>
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Truck className="size-6" /> Shipping
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Per-product rates live on each listing. This page lets you edit them all from one place,
          plus the two cart-wide preferences below.
        </p>
      </div>

      {/* Cart-level preferences */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-4">
        <div className="flex items-start gap-2">
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Cart-wide preferences</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Apply to a buyer&apos;s entire cart from your store, not individual listings.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Free-shipping threshold (USD)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">$</span>
              <input
                type="number"
                step="1"
                min="0"
                placeholder="(none)"
                value={freeThresholdInput}
                onChange={e => setFreeThresholdInput(e.target.value)}
                className="w-full h-9 pl-7 pr-3 rounded-md bg-background border border-border text-sm text-foreground"
              />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Carts at or above this subtotal ship free. Empty = always charge shipping.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Multi-item carts
            </label>
            <label className="flex items-center gap-2 cursor-pointer h-9">
              <input
                type="checkbox"
                checked={combinedEnabled}
                onChange={e => setCombinedEnabled(e.target.checked)}
                className="w-4 h-4 rounded border-border accent-primary"
              />
              <span className="text-sm text-foreground">Charge highest-rate item only (combined)</span>
            </label>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Off = sum every item&apos;s rate. Combined is friendlier but assumes you can pack together.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={savePrefs}
            disabled={savingPrefs}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-white text-sm font-medium disabled:opacity-50"
          >
            {savingPrefs ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save preferences
          </button>
          {prefsSavedAt && <span className="text-xs text-emerald-500">Saved.</span>}
        </div>
      </div>

      {/* Listings CRUD table */}
      <div>
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Per-listing rates</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Each PHYSICAL or POD listing carries its own per-country rates. Buyers in countries you don&apos;t cover can&apos;t order that item.
            </p>
          </div>
          <a href="/dashboard/listings/new" className="text-xs text-primary hover:underline">+ New listing</a>
        </div>

        {listings.length === 0 && (
          <div className="rounded-lg border border-border bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">
              No physical or POD listings yet. <a href="/dashboard/listings/new" className="text-primary hover:underline">Create one</a> to set shipping rates.
            </p>
          </div>
        )}

        <div className="space-y-2">
          {listings.map(listing => {
            const map = parseShippingMap(listing.shippingByCountry)
            const hasRates = map != null && Object.keys(map).length > 0
            const fullyCovered = shippingCoversAllSEA(listing.shippingByCountry)
            const isEditing = editingId === listing.id

            return (
              <div key={listing.id} className="rounded-lg border border-border bg-card">
                <div className="flex items-center gap-3 p-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">{listing.title}</p>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{listing.type}</span>
                      {!listing.isActive && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-500">Draft</span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs">
                      {hasRates ? (
                        fullyCovered ? (
                          <span className="inline-flex items-center gap-1 text-emerald-500">
                            <CheckCircle2 className="size-3.5" /> Covers all SEA + ROW fallback
                          </span>
                        ) : (
                          <span className="text-muted-foreground">{ratesSummary(map)}</span>
                        )
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-500">
                          <AlertTriangle className="size-3.5" /> No rates set — listing won&apos;t accept orders
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingId(isEditing ? null : listing.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground"
                  >
                    {isEditing ? (<><X className="size-3.5" /> Close</>) : (<><Pencil className="size-3.5" /> Edit</>)}
                  </button>
                </div>

                {isEditing && (
                  <div className="border-t border-border p-3">
                    <ListingShippingEditor
                      listing={listing}
                      onSave={rates => saveListing(listing.id, rates)}
                      onCancel={() => setEditingId(null)}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function ListingShippingEditor({
  listing,
  onSave,
  onCancel,
}: {
  listing: ListingRow
  onSave: (rates: ShippingRateMap | null) => Promise<boolean>
  onCancel: () => void
}) {
  const initial = parseShippingMap(listing.shippingByCountry)
  const [enabled, setEnabled] = useState<boolean>(initial != null)
  const [rateMap, setRateMap] = useState<ShippingRateMap | null>(initial)
  const [saving, setSaving] = useState(false)

  return (
    <div className="space-y-3">
      <ShippingRateInputs
        enabled={enabled}
        rateMap={rateMap}
        onEnabledChange={setEnabled}
        onRateMapChange={setRateMap}
        showCommissionHint={false}
        disabled={saving}
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={async () => {
            setSaving(true)
            const ok = await onSave(enabled && rateMap && Object.keys(rateMap).length > 0 ? rateMap : null)
            setSaving(false)
            if (!ok) return
          }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary text-white text-xs font-medium disabled:opacity-50"
        >
          {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
          Save rates
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={onCancel}
          className="px-3 py-1.5 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
