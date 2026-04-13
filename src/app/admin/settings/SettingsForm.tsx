'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface PlatformSettings {
  processingFeePercent: number
  platformFeePercent: number
  withdrawalFeePercent: number
  topCreatorThreshold: number
}

export function SettingsForm({ settings }: { settings: PlatformSettings }) {
  const router = useRouter()
  const [form, setForm] = useState(settings)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function handleChange(key: keyof PlatformSettings, value: string) {
    setForm((prev) => ({ ...prev, [key]: parseFloat(value) || 0 }))
  }

  async function save() {
    setSaving(true)
    setSaved(false)
    try {
      await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      setSaved(true)
      router.refresh()
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  const fields: { key: keyof PlatformSettings; label: string; isInt?: boolean }[] = [
    { key: 'processingFeePercent', label: 'Processing Fee (%)' },
    { key: 'platformFeePercent', label: 'Platform Fee (%)' },
    { key: 'withdrawalFeePercent', label: 'Withdrawal Fee (%)' },
    { key: 'topCreatorThreshold', label: 'Top Creator Threshold (sales)', isInt: true },
  ]

  return (
    <div className="bg-[#1e1e2a] rounded-xl border border-[#2a2a3a] p-6 space-y-4 max-w-lg">
      {fields.map(({ key, label, isInt }) => (
        <div key={key}>
          <label className="block text-sm text-[#8888aa] mb-1">{label}</label>
          <input
            type="number"
            value={form[key]}
            onChange={(e) => handleChange(key, e.target.value)}
            step={isInt ? 1 : 0.1}
            min={0}
            className="w-full bg-[#0d0d12] text-[#f0f0f5] border border-[#2a2a3a] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#7c3aed]"
          />
        </div>
      ))}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-[#7c3aed] text-white hover:bg-[#6d28d9] transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
        {saved && <span className="text-green-400 text-sm">Saved!</span>}
      </div>
    </div>
  )
}
