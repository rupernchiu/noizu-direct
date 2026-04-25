'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export interface PlatformSettingsFormValues {
  // Legacy flat-fee model (still consulted by older code paths)
  processingFeePercent: number
  platformFeePercent: number
  withdrawalFeePercent: number
  // Rail-aware fee model (sprint 0.1)
  creatorCommissionPercent: number
  buyerFeeLocalPercent: number
  buyerFeeCardPercent: number
  // Escrow policy
  digitalEscrowHours: number
  physicalEscrowDays: number
  podEscrowDays: number
  commissionEscrowDays: number
  newCreatorEscrowExtraDays: number
  newCreatorTransactionThreshold: number
  // Risk
  clawbackExposureWindowDays: number
  // Tax engine
  taxDestinationCountries: string // JSON string, edited as text
  defaultCreatorTaxRatePercent: number
  // Misc
  topCreatorThreshold: number
}

type NumericKey = Exclude<keyof PlatformSettingsFormValues, 'taxDestinationCountries'>

interface FieldDef {
  key: NumericKey
  label: string
  hint?: string
  isInt?: boolean
}

const SECTIONS: { title: string; description: string; fields: FieldDef[] }[] = [
  {
    title: 'Rail-aware fees (active)',
    description: 'Fees applied per payment rail. Buyer-card surcharge covers card processor + 3DS; local-rail is for FPX/PayNow/DuitNow/etc.',
    fields: [
      { key: 'creatorCommissionPercent', label: 'Creator commission (%)', hint: 'Deducted from creator payout' },
      { key: 'buyerFeeLocalPercent', label: 'Buyer fee — local rail (%)', hint: 'FPX, PayNow, DuitNow, FAST, …' },
      { key: 'buyerFeeCardPercent', label: 'Buyer fee — card rail (%)', hint: 'Visa, MC, AMEX (3DS-forced)' },
    ],
  },
  {
    title: 'Legacy flat fees',
    description: 'Older flat-fee model retained for back-compat with utilities still importing platform-fees. Prefer rail-aware fees above.',
    fields: [
      { key: 'processingFeePercent', label: 'Processing fee (%)' },
      { key: 'platformFeePercent', label: 'Platform fee (%)' },
      { key: 'withdrawalFeePercent', label: 'Withdrawal fee (%)' },
    ],
  },
  {
    title: 'Escrow policy',
    description: 'Hold windows before funds become payable to creators. New-creator extension stacks on top.',
    fields: [
      { key: 'digitalEscrowHours', label: 'Digital — escrow hours', isInt: true },
      { key: 'physicalEscrowDays', label: 'Physical — escrow days', isInt: true },
      { key: 'podEscrowDays', label: 'Print-on-demand — escrow days', isInt: true },
      { key: 'commissionEscrowDays', label: 'Commission — escrow days', isInt: true },
      { key: 'newCreatorEscrowExtraDays', label: 'New-creator extra days', isInt: true, hint: 'Stacked on top of base window' },
      { key: 'newCreatorTransactionThreshold', label: 'New-creator threshold (sales)', isInt: true, hint: 'Below this, the extra-days extension applies' },
    ],
  },
  {
    title: 'Risk & clawback',
    description: 'Earnings inside this rolling window are still chargeback-exposed. Card-network dispute windows commonly run 120 days.',
    fields: [
      { key: 'clawbackExposureWindowDays', label: 'Clawback exposure window (days)', isInt: true },
    ],
  },
  {
    title: 'Tax engine',
    description: 'Layer-1 fallback creator-tax markup for self-declared registered creators (per-creator override on CreatorProfile.taxRatePercent).',
    fields: [
      { key: 'defaultCreatorTaxRatePercent', label: 'Default creator-tax rate (%)' },
    ],
  },
  {
    title: 'Discovery',
    description: 'Threshold metrics used by trending/top-creator surfaces.',
    fields: [
      { key: 'topCreatorThreshold', label: 'Top-creator threshold (sales)', isInt: true },
    ],
  },
]

export function SettingsForm({ settings }: { settings: PlatformSettingsFormValues }) {
  const router = useRouter()
  const [form, setForm] = useState(settings)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleNumChange(key: NumericKey, value: string) {
    setForm((prev) => ({ ...prev, [key]: parseFloat(value) || 0 }))
  }

  function handleTaxJsonChange(value: string) {
    setForm((prev) => ({ ...prev, taxDestinationCountries: value }))
  }

  async function save() {
    setSaving(true)
    setSaved(false)
    setError(null)

    // Validate the JSON before sending so the server doesn't 500 on bad input.
    let parsed: unknown
    try {
      parsed = JSON.parse(form.taxDestinationCountries || '{}')
    } catch {
      setError('Tax destination countries must be valid JSON, e.g. {"MY": true}')
      setSaving(false)
      return
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      setError('Tax destination countries must be a JSON object keyed by country code')
      setSaving(false)
      return
    }

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError(j.error || `Save failed (${res.status})`)
        return
      }
      setSaved(true)
      router.refresh()
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {SECTIONS.map((section) => (
        <div key={section.title} className="bg-card rounded-xl border border-border p-6 space-y-4 max-w-2xl">
          <div>
            <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{section.description}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {section.fields.map(({ key, label, hint, isInt }) => (
              <div key={key}>
                <label className="block text-sm text-muted-foreground mb-1">{label}</label>
                <input
                  type="number"
                  value={form[key]}
                  onChange={(e) => handleNumChange(key, e.target.value)}
                  step={isInt ? 1 : 0.1}
                  min={0}
                  className="w-full bg-background text-foreground border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                />
                {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Tax destination countries — JSON object editor */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-3 max-w-2xl">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Tax destination countries</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            JSON object keyed by ISO country code. <code className="bg-border px-1 rounded">true</code> enables the destination-tax line for that country (set when crossing local registration thresholds).
          </p>
        </div>
        <textarea
          value={form.taxDestinationCountries}
          onChange={(e) => handleTaxJsonChange(e.target.value)}
          rows={4}
          spellCheck={false}
          className="w-full bg-background text-foreground border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
          placeholder='{"MY": true, "SG": false}'
        />
      </div>

      <div className="bg-card rounded-xl border border-border p-5 max-w-2xl">
        <div className="flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
          {saved && <span className="text-green-400 text-sm">Saved</span>}
          {error && <span className="text-red-400 text-sm">{error}</span>}
        </div>
      </div>
    </div>
  )
}
