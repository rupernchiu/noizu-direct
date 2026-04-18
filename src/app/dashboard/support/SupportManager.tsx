'use client'

import { useState } from 'react'
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react'

interface Tier {
  id: string; name: string; priceUsd: number; description: string | null
  perks: string[]; isActive: boolean; subscriberCount: number; order: number
}
interface Goal {
  id: string; title: string; description: string | null
  targetAmountUsd: number; currentAmountUsd: number
  deadline: string | null; status: string; coverImage: string | null
}
interface GiftConfig {
  id: string; isActive: boolean; presetAmounts: number[]
  thankYouMessage: string; totalReceived: number; giftCount: number
}

const inputCls = 'w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors'

// ── Membership Sub-tab ─────────────────────────────────────────────────────────

function MembershipTab({ initial }: { initial: Tier[] }) {
  const [tiers, setTiers]     = useState<Tier[]>(initial)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [perkInput, setPerkInput] = useState('')
  const [form, setForm] = useState({ name: '', priceUsd: '', description: '', perks: [] as string[] })

  function addPerk() {
    if (!perkInput.trim()) return
    setForm(f => ({ ...f, perks: [...f.perks, perkInput.trim()] }))
    setPerkInput('')
  }

  function removePerk(i: number) {
    setForm(f => ({ ...f, perks: f.perks.filter((_, pi) => pi !== i) }))
  }

  async function save() {
    if (!form.name.trim() || !form.priceUsd) { setError('Name and price are required'); return }
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/support/tiers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          priceUsd: Math.round(parseFloat(form.priceUsd) * 100),
          description: form.description || null,
          perks: form.perks,
        }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      const created: Tier = await res.json()
      setTiers(t => [...t, { ...created, perks: created.perks as any }])
      setForm({ name: '', priceUsd: '', description: '', perks: [] })
      setShowForm(false)
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  async function toggleTier(tier: Tier) {
    const res = await fetch(`/api/support/tiers/${tier.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !tier.isActive }),
    })
    if (res.ok) { const u: Tier = await res.json(); setTiers(t => t.map(x => x.id === u.id ? { ...u, perks: typeof u.perks === 'string' ? JSON.parse(u.perks as any) : u.perks } : x)) }
  }

  async function deleteTier(id: string) {
    if (!confirm('Delete this tier?')) return
    const res = await fetch(`/api/support/tiers/${id}`, { method: 'DELETE' })
    if (res.ok) setTiers(t => t.filter(x => x.id !== id))
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Up to 3 membership tiers. Displayed on your Support tab.</p>
        {tiers.length < 3 && (
          <button onClick={() => setShowForm(s => !s)} className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors">
            <Plus className="size-4" /> Add Tier
          </button>
        )}
      </div>

      {showForm && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">Tier Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} placeholder="e.g. Coffee Supporter" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Monthly Price (USD) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <input type="number" min="1" step="0.01" value={form.priceUsd} onChange={e => setForm(f => ({ ...f, priceUsd: e.target.value }))} className={`${inputCls} pl-7`} placeholder="5.00" />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Description (optional)</label>
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={inputCls} placeholder="Brief description of this tier" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Perks</label>
            <div className="flex gap-2 mb-2">
              <input value={perkInput} onChange={e => setPerkInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addPerk())} className={inputCls} placeholder="Add a perk and press Enter" />
              <button onClick={addPerk} className="rounded-xl border border-border px-3 py-2 text-sm hover:border-primary/40 transition-colors">Add</button>
            </div>
            {form.perks.length > 0 && (
              <ul className="space-y-1">
                {form.perks.map((p, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="size-3.5 text-primary shrink-0" />
                    <span className="flex-1">{p}</span>
                    <button onClick={() => removePerk(i)} className="text-muted-foreground hover:text-destructive"><X className="size-3.5" /></button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={save} disabled={saving} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors">{saving ? 'Saving…' : 'Save Tier'}</button>
            <button onClick={() => { setShowForm(false); setError('') }} className="rounded-xl border border-border px-5 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {tiers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">No membership tiers yet</div>
      ) : (
        <div className="space-y-3">
          {tiers.map(tier => (
            <div key={tier.id} className={`rounded-2xl border border-border bg-card p-4 flex items-start gap-4 ${!tier.isActive ? 'opacity-50' : ''}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-sm text-foreground">{tier.name}</p>
                  <span className="text-sm font-bold text-primary">${(tier.priceUsd / 100).toFixed(0)}/mo</span>
                  <span className="text-xs text-muted-foreground">{tier.subscriberCount} subscriber{tier.subscriberCount !== 1 ? 's' : ''}</span>
                </div>
                {tier.perks.length > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">{tier.perks.slice(0, 2).join(' · ')}{tier.perks.length > 2 ? ` +${tier.perks.length - 2} more` : ''}</p>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => toggleTier(tier)} className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${tier.isActive ? 'border-border text-muted-foreground hover:text-foreground' : 'border-primary/30 text-primary hover:bg-primary/5'}`}>
                  {tier.isActive ? 'Hide' : 'Show'}
                </button>
                <button onClick={() => deleteTier(tier.id)} className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors">
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Goals Sub-tab ──────────────────────────────────────────────────────────────

function GoalsTab({ initial }: { initial: Goal[] }) {
  const [goals, setGoals]   = useState<Goal[]>(initial)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const [form, setForm] = useState({ title: '', description: '', targetAmountUsd: '', deadline: '' })

  async function save() {
    if (!form.title.trim() || !form.targetAmountUsd) { setError('Title and target amount are required'); return }
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/support/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description || null,
          targetAmountUsd: Math.round(parseFloat(form.targetAmountUsd) * 100),
          deadline: form.deadline || null,
        }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      const created: Goal = await res.json()
      setGoals(g => [created, ...g])
      setForm({ title: '', description: '', targetAmountUsd: '', deadline: '' })
      setShowForm(false)
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  async function updateStatus(goal: Goal, status: string) {
    const res = await fetch(`/api/support/goals/${goal.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) { const u: Goal = await res.json(); setGoals(g => g.map(x => x.id === u.id ? u : x)) }
  }

  async function deleteGoal(id: string) {
    if (!confirm('Delete this goal?')) return
    const res = await fetch(`/api/support/goals/${id}`, { method: 'DELETE' })
    if (res.ok) setGoals(g => g.filter(x => x.id !== id))
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Crowdfunding goals shown on your Support tab.</p>
        <button onClick={() => setShowForm(s => !s)} className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors">
          <Plus className="size-4" /> Add Goal
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div>
            <label className="block text-xs font-medium mb-1">Goal Title *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={inputCls} placeholder="e.g. NoizuCon 2025 Table Fund" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className={`${inputCls} resize-none`} placeholder="Tell supporters what this fund is for" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">Target Amount (USD) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <input type="number" min="1" value={form.targetAmountUsd} onChange={e => setForm(f => ({ ...f, targetAmountUsd: e.target.value }))} className={`${inputCls} pl-7`} placeholder="500" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Deadline (optional)</label>
              <input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} className={inputCls} />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={save} disabled={saving} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors">{saving ? 'Saving…' : 'Save Goal'}</button>
            <button onClick={() => { setShowForm(false); setError('') }} className="rounded-xl border border-border px-5 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {goals.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">No goals yet</div>
      ) : (
        <div className="space-y-3">
          {goals.map(goal => {
            const pct = Math.min(100, Math.round((goal.currentAmountUsd / goal.targetAmountUsd) * 100))
            return (
              <div key={goal.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-semibold text-sm text-foreground">{goal.title}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        goal.status === 'ACTIVE' ? 'bg-success/10 text-success' :
                        goal.status === 'COMPLETED' ? 'bg-primary/10 text-primary' :
                        'bg-muted text-muted-foreground'
                      }`}>{goal.status}</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      ${(goal.currentAmountUsd / 100).toFixed(0)} / ${(goal.targetAmountUsd / 100).toFixed(0)} ({pct}%)
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {goal.status === 'ACTIVE' && (
                      <button onClick={() => updateStatus(goal, 'COMPLETED')} className="rounded-lg border border-success/30 px-2.5 py-1 text-xs font-medium text-success hover:bg-success/5 transition-colors">Complete</button>
                    )}
                    {goal.status === 'ACTIVE' && (
                      <button onClick={() => updateStatus(goal, 'CANCELLED')} className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
                    )}
                    <button onClick={() => deleteGoal(goal.id)} className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors">
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Gifts Sub-tab ──────────────────────────────────────────────────────────────

function GiftsTab({ initial }: { initial: GiftConfig | null }) {
  const [config, setConfig] = useState<GiftConfig | null>(initial)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [presetInput, setPresetInput] = useState('')
  const [form, setForm] = useState({
    isActive: initial?.isActive ?? true,
    presetAmounts: initial?.presetAmounts ?? [3, 5, 10, 25],
    thankYouMessage: initial?.thankYouMessage ?? '',
  })

  function addPreset() {
    const val = parseInt(presetInput)
    if (isNaN(val) || val < 1 || val > 500) return
    if (form.presetAmounts.includes(val)) return
    setForm(f => ({ ...f, presetAmounts: [...f.presetAmounts, val].sort((a, b) => a - b) }))
    setPresetInput('')
  }

  function removePreset(amt: number) {
    setForm(f => ({ ...f, presetAmounts: f.presetAmounts.filter(a => a !== amt) }))
  }

  async function save() {
    setSaving(true); setSaved(false)
    try {
      const res = await fetch('/api/support/gift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        const updated: GiftConfig = await res.json()
        setConfig(updated)
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      }
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-5 max-w-lg">
      <p className="text-sm text-muted-foreground">Configure the one-time gift section on your Support tab.</p>

      {config && (
        <div className="rounded-2xl border border-border bg-card px-4 py-3 flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">Total received:</span>
          <span className="font-bold text-foreground">${(config.totalReceived / 100).toFixed(0)}</span>
          <span className="text-muted-foreground ml-auto">Gifts:</span>
          <span className="font-bold text-foreground">{config.giftCount}</span>
        </div>
      )}

      {/* Toggle */}
      <label className="flex items-center gap-3 cursor-pointer">
        <div
          onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
          className={`relative h-6 w-11 rounded-full transition-colors ${form.isActive ? 'bg-primary' : 'bg-border'}`}
        >
          <span className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform ${form.isActive ? 'translate-x-5' : ''}`} />
        </div>
        <span className="text-sm font-medium text-foreground">{form.isActive ? 'Gifts enabled' : 'Gifts disabled'}</span>
      </label>

      {/* Preset amounts */}
      <div>
        <label className="block text-xs font-medium mb-2">Preset Amounts ($)</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {form.presetAmounts.map(amt => (
            <span key={amt} className="flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1 text-sm font-medium text-foreground">
              ${amt}
              <button onClick={() => removePreset(amt)} className="text-muted-foreground hover:text-destructive ml-1"><X className="size-3" /></button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="relative w-32">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
            <input type="number" min="1" max="500" value={presetInput} onChange={e => setPresetInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addPreset())} className={`${inputCls} pl-7`} placeholder="10" />
          </div>
          <button onClick={addPreset} className="rounded-xl border border-border px-3 py-2 text-sm hover:border-primary/40 transition-colors">Add</button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Min $1, max $500</p>
      </div>

      {/* Thank you message */}
      <div>
        <label className="block text-xs font-medium mb-1">Thank You Message</label>
        <textarea
          value={form.thankYouMessage}
          onChange={e => setForm(f => ({ ...f, thankYouMessage: e.target.value }))}
          rows={3}
          maxLength={300}
          className={`${inputCls} resize-none`}
          placeholder="Message shown to supporters before they send a gift"
        />
        <p className="mt-1 text-xs text-muted-foreground">{form.thankYouMessage.length}/300</p>
      </div>

      <button onClick={save} disabled={saving} className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors">
        {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Settings'}
      </button>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

type SubTab = 'membership' | 'goals' | 'gifts'

export function SupportManager({
  initialTiers, initialGoals, initialGift,
}: {
  initialTiers: Tier[]
  initialGoals: Goal[]
  initialGift: GiftConfig | null
}) {
  const [sub, setSub] = useState<SubTab>('membership')

  const tabs: { id: SubTab; label: string }[] = [
    { id: 'membership', label: 'Membership' },
    { id: 'goals',      label: 'Goals'      },
    { id: 'gifts',      label: 'Gifts'      },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Support</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage memberships, goals, and gift settings for your Support tab</p>
      </div>

      <div className="flex gap-1 border-b border-border">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setSub(tab.id)}
            className={[
              'px-5 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors',
              sub === tab.id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div>
        {sub === 'membership' && <MembershipTab initial={initialTiers} />}
        {sub === 'goals'      && <GoalsTab initial={initialGoals} />}
        {sub === 'gifts'      && <GiftsTab initial={initialGift} />}
      </div>
    </div>
  )
}
