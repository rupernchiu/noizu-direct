'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import {
  type CommissionDefaults,
  type MilestoneTemplate,
  BUILTIN_TEMPLATES,
  validateTemplate,
} from '@/lib/commission-defaults'

type PricingTier = { tier: string; price: number; description: string }
type Status = 'OPEN' | 'LIMITED' | 'CLOSED'

type Initial = {
  commissionStatus: Status
  commissionSlots: number | null
  commissionDescription: string
  commissionTerms: string
  pricingTiers: PricingTier[]
  absorbProcessingFee: boolean
  defaults: CommissionDefaults
}

const inputCls = 'w-full text-base sm:text-sm p-2.5 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary'

export function CommissionSettingsForm({ initial }: { initial: Initial }) {
  const router = useRouter()
  const [status, setStatus]       = useState<Status>(initial.commissionStatus)
  const [slots, setSlots]         = useState(initial.commissionSlots != null ? String(initial.commissionSlots) : '')
  const [description, setDescription] = useState(initial.commissionDescription)
  const [terms, setTerms]         = useState(initial.commissionTerms)
  const [tiers, setTiers]         = useState<PricingTier[]>(initial.pricingTiers)
  const [absorbFee, setAbsorbFee] = useState(initial.absorbProcessingFee)
  const [defaults, setDefaults]   = useState<CommissionDefaults>(initial.defaults)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [success, setSuccess]     = useState(false)

  async function save() {
    setSaving(true); setError(null); setSuccess(false)
    for (const tpl of defaults.milestoneTemplates) {
      const err = validateTemplate(tpl)
      if (err) { setError(`Template "${tpl.name}": ${err}`); setSaving(false); return }
    }
    const res = await fetch('/api/creator/commission-settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commissionStatus:      status,
        commissionSlots:       slots === '' ? null : Number(slots),
        commissionDescription: description || null,
        commissionTerms:       terms || null,
        pricingTiers:          tiers,
        absorbProcessingFee:   absorbFee,
        defaults,
      }),
    })
    setSaving(false)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error ?? 'Failed to save')
      return
    }
    setSuccess(true)
    router.refresh()
  }

  function addTier() {
    if (tiers.length >= 5) return
    setTiers([...tiers, { tier: '', price: 0, description: '' }])
  }
  function removeTier(i: number) { setTiers(tiers.filter((_, x) => x !== i)) }
  function updateTier(i: number, k: keyof PricingTier, v: string | number) {
    setTiers(tiers.map((t, x) => x === i ? { ...t, [k]: v } : t))
  }

  function addTemplate(seed?: MilestoneTemplate) {
    if (defaults.milestoneTemplates.length >= 10) return
    const base: MilestoneTemplate = seed
      ? { name: seed.name, stages: seed.stages.map((s) => ({ ...s })) }
      : { name: 'New template', stages: [{ label: 'Deposit', percent: 50 }, { label: 'Final', percent: 50 }] }
    setDefaults({ ...defaults, milestoneTemplates: [...defaults.milestoneTemplates, base] })
  }
  function removeTemplate(i: number) {
    setDefaults({ ...defaults, milestoneTemplates: defaults.milestoneTemplates.filter((_, x) => x !== i) })
  }
  function updateTemplate(i: number, next: MilestoneTemplate) {
    setDefaults({ ...defaults, milestoneTemplates: defaults.milestoneTemplates.map((t, x) => x === i ? next : t) })
  }

  return (
    <div className="space-y-6">
      {error   && <div id="commission-error" role="alert" className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400">{error}</div>}
      {success && <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-sm text-green-400">Saved.</div>}

      {/* Availability */}
      <section className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Availability</h3>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Commission status</label>
          <div className="flex gap-2">
            {(['OPEN', 'LIMITED', 'CLOSED'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                  status === s
                    ? s === 'OPEN'    ? 'bg-green-500/20 border-green-500/50 text-green-400'
                    : s === 'LIMITED' ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400'
                    :                    'bg-red-500/20 border-red-500/50 text-red-400'
                    : 'bg-background border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Open slots (leave blank for unlimited)</label>
            <input type="number" min={0} value={slots} onChange={(e) => setSlots(e.target.value)} aria-invalid={!!error || undefined} aria-describedby={error ? 'commission-error' : undefined} className={inputCls} placeholder="e.g. 3" />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-foreground">
              <input type="checkbox" checked={absorbFee} onChange={(e) => setAbsorbFee(e.target.checked)} className="size-4 rounded border-border" />
              Absorb processing fee (show round prices to buyers)
            </label>
          </div>
        </div>
      </section>

      {/* Intro + Terms */}
      <section className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">What buyers see on your page</h3>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Commission intro</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={1000} placeholder="Tell fans what kind of commissions you offer..." aria-invalid={!!error || undefined} aria-describedby={error ? 'commission-error' : undefined} className={`${inputCls} resize-none`} />
          <p className="mt-1 text-xs text-muted-foreground">{description.length}/1000</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Terms of service</label>
          <textarea value={terms} onChange={(e) => setTerms(e.target.value)} rows={5} maxLength={3000} placeholder="Your commission rules — e.g. no NSFW, no refunds after linework, revisions included, credit required…" aria-invalid={!!error || undefined} aria-describedby={error ? 'commission-error' : undefined} className={`${inputCls} resize-none`} />
          <p className="mt-1 text-xs text-muted-foreground">{terms.length}/3000</p>
        </div>
      </section>

      {/* Pricing tiers */}
      <section className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Pricing presets</h3>
          <button type="button" onClick={addTier} disabled={tiers.length >= 5} className="text-xs px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground disabled:opacity-40 inline-flex items-center gap-1">
            <Plus className="size-3" /> Add tier
          </button>
        </div>
        {tiers.length === 0 && <p className="text-sm text-muted-foreground">No pricing tiers yet. Add up to 5 to help buyers gauge budget.</p>}
        <div className="space-y-3">
          {tiers.map((t, i) => (
            <div key={i} className="rounded-lg border border-border bg-background/50 p-3 sm:p-0 sm:border-0 sm:bg-transparent sm:grid sm:grid-cols-12 sm:gap-2 sm:items-start space-y-2 sm:space-y-0">
              <input value={t.tier} onChange={(e) => updateTier(i, 'tier', e.target.value)} placeholder="Tier name (e.g. Bust)" className={`${inputCls} sm:col-span-4`} />
              <div className="flex gap-2 sm:contents">
                <input type="number" min={0} value={t.price} onChange={(e) => updateTier(i, 'price', Number(e.target.value))} placeholder="Price (USD)" className={`${inputCls} w-28 sm:w-auto sm:col-span-2`} />
                <input value={t.description} onChange={(e) => updateTier(i, 'description', e.target.value)} placeholder="Short description" className={`${inputCls} flex-1 sm:col-span-5`} />
                <button type="button" onClick={() => removeTier(i)} aria-label="Remove tier" className="sm:col-span-1 shrink-0 size-10 sm:size-9 rounded-lg border border-border text-muted-foreground hover:text-red-400 hover:border-red-500/50 inline-flex items-center justify-center">
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Quote defaults */}
      <section className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Quote defaults</h3>
          <p className="text-xs text-muted-foreground">Prefills applied when you issue a new commission quote. You can still override per-quote.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Default deposit %</label>
            <input type="number" min={0} max={100} value={defaults.depositPercent} onChange={(e) => setDefaults({ ...defaults, depositPercent: Number(e.target.value) })} aria-invalid={!!error || undefined} aria-describedby={error ? 'commission-error' : undefined} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Default revisions</label>
            <input type="number" min={0} max={20} value={defaults.revisionsIncluded} onChange={(e) => setDefaults({ ...defaults, revisionsIncluded: Number(e.target.value) })} aria-invalid={!!error || undefined} aria-describedby={error ? 'commission-error' : undefined} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Default turnaround (days)</label>
            <input type="number" min={1} max={365} value={defaults.turnaroundDays} onChange={(e) => setDefaults({ ...defaults, turnaroundDays: Number(e.target.value) })} aria-invalid={!!error || undefined} aria-describedby={error ? 'commission-error' : undefined} className={inputCls} />
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer text-sm text-foreground">
          <input type="checkbox" checked={defaults.preferMilestones} onChange={(e) => setDefaults({ ...defaults, preferMilestones: e.target.checked })} className="size-4 rounded border-border" />
          Default new quotes to milestone-based (n-stage escrow)
        </label>
      </section>

      {/* Milestone templates */}
      <section className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">Milestone templates</h3>
            <p className="text-xs text-muted-foreground">Reusable n-stage splits. Each stage releases its share of escrow on approval.</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <select
              onChange={(e) => {
                const idx = Number(e.target.value)
                if (idx >= 0) addTemplate(BUILTIN_TEMPLATES[idx])
                e.currentTarget.value = ''
              }}
              defaultValue=""
              className="text-xs px-2 py-2 rounded-lg bg-background border border-border text-foreground flex-1 sm:flex-none"
            >
              <option value="" disabled>+ Add from preset…</option>
              {BUILTIN_TEMPLATES.map((t, i) => <option key={i} value={i}>{t.name}</option>)}
            </select>
            <button type="button" onClick={() => addTemplate()} disabled={defaults.milestoneTemplates.length >= 10} className="text-xs px-3 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground disabled:opacity-40 inline-flex items-center gap-1 shrink-0">
              <Plus className="size-3" /> Custom
            </button>
          </div>
        </div>

        {defaults.milestoneTemplates.length === 0 && (
          <p className="text-sm text-muted-foreground">No templates yet. Add one from the presets or build a custom split.</p>
        )}

        <div className="space-y-4">
          {defaults.milestoneTemplates.map((tpl, i) => (
            <TemplateEditor key={i} tpl={tpl} onChange={(next) => updateTemplate(i, next)} onRemove={() => removeTemplate(i)} />
          ))}
        </div>
      </section>

      <div className="flex items-center gap-3 sticky bottom-0 bg-background/95 backdrop-blur sm:static sm:bg-transparent sm:backdrop-blur-none -mx-4 sm:mx-0 px-4 sm:px-0 py-3 sm:py-0 border-t border-border sm:border-0">
        <button onClick={save} disabled={saving} className="w-full sm:w-auto text-sm px-5 py-3 rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-40">
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </div>
    </div>
  )
}

function TemplateEditor({ tpl, onChange, onRemove }: { tpl: MilestoneTemplate; onChange: (t: MilestoneTemplate) => void; onRemove: () => void }) {
  const sum = tpl.stages.reduce((s, x) => s + x.percent, 0)
  const sumOk = sum === 100

  function updateStage(i: number, key: 'label' | 'percent', value: string | number) {
    const nextStages = tpl.stages.map((s, x) => x === i ? { ...s, [key]: key === 'percent' ? Number(value) : value } : s)
    onChange({ ...tpl, stages: nextStages })
  }
  function addStage() {
    if (tpl.stages.length >= 10) return
    onChange({ ...tpl, stages: [...tpl.stages, { label: `Stage ${tpl.stages.length + 1}`, percent: 0 }] })
  }
  function removeStage(i: number) {
    onChange({ ...tpl, stages: tpl.stages.filter((_, x) => x !== i) })
  }

  return (
    <div className="rounded-lg border border-border bg-background/50 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <input
          value={tpl.name}
          onChange={(e) => onChange({ ...tpl, name: e.target.value })}
          className={`${inputCls} flex-1`}
          placeholder="Template name"
        />
        <button type="button" onClick={onRemove} className="size-9 rounded-lg border border-border text-muted-foreground hover:text-red-400 hover:border-red-500/50 inline-flex items-center justify-center">
          <Trash2 className="size-4" />
        </button>
      </div>

      <div className="space-y-2">
        {tpl.stages.map((st, i) => (
          <div key={i} className="flex items-center gap-2">
            <GripVertical className="shrink-0 size-4 text-muted-foreground hidden sm:block" />
            <input value={st.label} onChange={(e) => updateStage(i, 'label', e.target.value)} placeholder="Stage label" className={`${inputCls} flex-1 min-w-0`} />
            <div className="flex items-center gap-1 shrink-0">
              <input type="number" min={1} max={100} value={st.percent} onChange={(e) => updateStage(i, 'percent', Number(e.target.value))} className={`${inputCls} w-16`} />
              <span className="text-xs text-muted-foreground">%</span>
            </div>
            <button type="button" onClick={() => removeStage(i)} aria-label="Remove stage" className="shrink-0 size-10 sm:size-9 rounded-lg border border-border text-muted-foreground hover:text-red-400 hover:border-red-500/50 inline-flex items-center justify-center">
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-1">
        <button type="button" onClick={addStage} disabled={tpl.stages.length >= 10} className="text-xs px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground disabled:opacity-40 inline-flex items-center gap-1">
          <Plus className="size-3" /> Add stage
        </button>
        <p className={`text-xs font-medium ${sumOk ? 'text-green-400' : 'text-red-400'}`}>Total: {sum}%{sumOk ? '' : ' (must equal 100)'}</p>
      </div>
    </div>
  )
}
