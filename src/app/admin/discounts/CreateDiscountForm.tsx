'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface CreatorOption {
  id: string
  displayName: string
}

const inputClass =
  'w-full rounded-lg bg-background border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors'

export function CreateDiscountForm({ creators }: { creators: CreatorOption[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    code: '',
    creatorId: '',
    type: 'PERCENTAGE',
    value: '',
    minimumOrderAmount: '',
    maxUses: '',
    expiresAt: '',
  })

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.code.trim() || !form.value || !form.creatorId) {
      toast.error('Code, creator, and value are required')
      return
    }
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        code: form.code.trim(),
        creatorId: form.creatorId,
        type: form.type,
        value: form.type === 'PERCENTAGE' ? Number(form.value) : Math.round(Number(form.value) * 100),
      }
      if (form.minimumOrderAmount) body.minimumOrderAmount = Math.round(Number(form.minimumOrderAmount) * 100)
      if (form.maxUses) body.maxUses = Number(form.maxUses)
      if (form.expiresAt) body.expiresAt = form.expiresAt

      const res = await fetch('/api/admin/discounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to create code')
        return
      }
      toast.success('Discount code created')
      setForm({ code: '', creatorId: '', type: 'PERCENTAGE', value: '', minimumOrderAmount: '', maxUses: '', expiresAt: '' })
      setOpen(false)
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-medium"
      >
        + New code
      </button>
    )
  }

  return (
    <div className="rounded-xl bg-card border border-border p-5 mb-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">New discount code</h3>
        <button
          onClick={() => setOpen(false)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </div>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Code</label>
            <input
              type="text"
              placeholder="LAUNCH20"
              value={form.code}
              onChange={e => set('code', e.target.value.toUpperCase())}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Creator</label>
            <select
              value={form.creatorId}
              onChange={e => set('creatorId', e.target.value)}
              className={inputClass}
            >
              <option value="">Select creator…</option>
              {creators.map(c => (
                <option key={c.id} value={c.id}>{c.displayName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Type</label>
            <select value={form.type} onChange={e => set('type', e.target.value)} className={inputClass}>
              <option value="PERCENTAGE">Percentage (%)</option>
              <option value="FIXED_AMOUNT">Fixed (USD)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Value {form.type === 'PERCENTAGE' ? '(%)' : '(USD)'}
            </label>
            <input
              type="number"
              step={form.type === 'PERCENTAGE' ? '1' : '0.01'}
              min="0"
              max={form.type === 'PERCENTAGE' ? '100' : undefined}
              value={form.value}
              onChange={e => set('value', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Min order (USD) <span className="text-muted-foreground/60">optional</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.minimumOrderAmount}
              onChange={e => set('minimumOrderAmount', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Max uses <span className="text-muted-foreground/60">blank = unlimited</span>
            </label>
            <input
              type="number"
              min="1"
              value={form.maxUses}
              onChange={e => set('maxUses', e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Expires at <span className="text-muted-foreground/60">optional</span>
            </label>
            <input
              type="datetime-local"
              value={form.expiresAt}
              onChange={e => set('expiresAt', e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-medium disabled:opacity-50"
          >
            {submitting ? 'Creating…' : 'Create code'}
          </button>
        </div>
      </form>
    </div>
  )
}
