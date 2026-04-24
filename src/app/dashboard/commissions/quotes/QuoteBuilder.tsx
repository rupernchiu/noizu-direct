'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Plus } from 'lucide-react'
import { BuyerPicker, type BuyerOption } from './BuyerPicker'

type Milestone = { title: string; description: string; amountDollars: string }

export interface QuoteBuilderProps {
  requestId?: string | null
  presetTitle?: string
  // For edit mode:
  quoteId?: string
  initial?: {
    title: string
    description: string
    amountDollars: string
    depositPercent: string
    revisionsIncluded: string
    turnaroundDays: string
    termsText: string
    isMilestoneBased: boolean
    milestones: Milestone[]
  }
}

function dollarsToCents(s: string): number { return Math.round(parseFloat(s || '0') * 100) }

export function QuoteBuilder(props: QuoteBuilderProps) {
  const router = useRouter()
  const editing = !!props.quoteId
  const [title, setTitle] = useState(props.initial?.title ?? props.presetTitle ?? '')
  const [description, setDescription] = useState(props.initial?.description ?? '')
  const [amountDollars, setAmountDollars] = useState(props.initial?.amountDollars ?? '')
  const [depositPercent, setDepositPercent] = useState(props.initial?.depositPercent ?? '50')
  const [revisionsIncluded, setRevisionsIncluded] = useState(props.initial?.revisionsIncluded ?? '2')
  const [turnaroundDays, setTurnaroundDays] = useState(props.initial?.turnaroundDays ?? '14')
  const [termsText, setTermsText] = useState(props.initial?.termsText ?? '')
  const [isMilestoneBased, setMilestoneBased] = useState(props.initial?.isMilestoneBased ?? false)
  const [milestones, setMilestones] = useState<Milestone[]>(props.initial?.milestones ?? [
    { title: '', description: '', amountDollars: '' },
    { title: '', description: '', amountDollars: '' },
  ])
  const [selectedBuyer, setSelectedBuyer] = useState<BuyerOption | null>(null)
  const [buyerEmail, setBuyerEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const milestoneSumCents = useMemo(
    () => milestones.reduce((s, m) => s + dollarsToCents(m.amountDollars), 0),
    [milestones],
  )
  const amountCents = dollarsToCents(amountDollars)
  const sumMatches = milestoneSumCents === amountCents

  function updateMilestone(i: number, patch: Partial<Milestone>) {
    setMilestones(ms => ms.map((m, idx) => idx === i ? { ...m, ...patch } : m))
  }
  function addMilestone() {
    if (milestones.length >= 10) return
    setMilestones(ms => [...ms, { title: '', description: '', amountDollars: '' }])
  }
  function removeMilestone(i: number) {
    if (milestones.length <= 2) return
    setMilestones(ms => ms.filter((_, idx) => idx !== i))
  }

  async function save(send: boolean) {
    setBusy(true); setError(null)

    // Buyer identity is required unless this is an edit or a quote-against-request
    if (!editing && !props.requestId && !selectedBuyer && !buyerEmail.trim()) {
      setError('Pick a buyer or enter an email first.')
      setBusy(false)
      return
    }

    const buyerPayload =
      props.requestId || editing
        ? {}
        : selectedBuyer
          ? { buyerId: selectedBuyer.id }
          : buyerEmail.trim()
            ? { buyerEmail: buyerEmail.trim() }
            : {}

    const payload = {
      requestId: props.requestId ?? undefined,
      ...buyerPayload,
      title: title.trim(),
      description: description.trim(),
      amountUsd: amountCents,
      depositPercent: parseInt(depositPercent || '0'),
      revisionsIncluded: parseInt(revisionsIncluded || '0'),
      turnaroundDays: parseInt(turnaroundDays || '0'),
      termsText: termsText.trim() || undefined,
      isMilestoneBased,
      milestones: isMilestoneBased
        ? milestones.map(m => ({ title: m.title.trim(), description: m.description.trim() || undefined, amountUsd: dollarsToCents(m.amountDollars) }))
        : undefined,
    }

    const url = editing ? `/api/commissions/quotes/${props.quoteId}` : '/api/commissions/quotes'
    const method = editing ? 'PATCH' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error ?? 'Failed to save')
      setBusy(false)
      return
    }
    const data = await res.json() as { quoteId?: string; ok?: boolean }
    const quoteId = data.quoteId ?? props.quoteId!

    if (send) {
      const sendRes = await fetch(`/api/commissions/quotes/${quoteId}/send`, { method: 'POST' })
      if (!sendRes.ok) {
        const j = await sendRes.json().catch(() => ({}))
        setError(j.error ?? 'Quote saved but send failed')
        setBusy(false)
        return
      }
    }

    router.push(`/dashboard/commissions/quotes/${quoteId}`)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {!props.requestId && !editing && (
        <BuyerPicker
          value={selectedBuyer}
          onChange={setSelectedBuyer}
          emailFallback={buyerEmail}
          onEmailFallback={setBuyerEmail}
        />
      )}

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Title</label>
        <input value={title} onChange={e => setTitle(e.target.value)} maxLength={200}
          className="w-full text-base sm:text-sm p-3 rounded-lg bg-card border border-border text-foreground" />
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Description</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={5}
          className="w-full text-base sm:text-sm p-3 rounded-lg bg-card border border-border text-foreground" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Total ($)</label>
          <input type="number" step="0.01" min="1" value={amountDollars} onChange={e => setAmountDollars(e.target.value)}
            className="w-full text-base sm:text-sm p-3 rounded-lg bg-card border border-border text-foreground" />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Deposit %</label>
          <input type="number" min="0" max="100" value={depositPercent} onChange={e => setDepositPercent(e.target.value)} disabled={isMilestoneBased}
            className="w-full text-base sm:text-sm p-3 rounded-lg bg-card border border-border text-foreground disabled:opacity-50" />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Revisions</label>
          <input type="number" min="0" max="20" value={revisionsIncluded} onChange={e => setRevisionsIncluded(e.target.value)}
            className="w-full text-base sm:text-sm p-3 rounded-lg bg-card border border-border text-foreground" />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Turnaround (d)</label>
          <input type="number" min="1" max="365" value={turnaroundDays} onChange={e => setTurnaroundDays(e.target.value)}
            className="w-full text-base sm:text-sm p-3 rounded-lg bg-card border border-border text-foreground" />
        </div>
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={isMilestoneBased} onChange={e => setMilestoneBased(e.target.checked)} className="size-4" />
          Milestone-based (split work into phases, each paid per approval)
        </label>
      </div>

      {isMilestoneBased && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Milestones ({milestones.length}/10)</p>
            <p className={`text-xs ${sumMatches ? 'text-muted-foreground' : 'text-red-400'}`}>
              Sum ${(milestoneSumCents/100).toFixed(2)} / Total ${(amountCents/100).toFixed(2)}
              {!sumMatches && ' — mismatch'}
            </p>
          </div>
          {milestones.map((m, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 space-y-2 relative">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-foreground">Milestone {i + 1}</p>
                {milestones.length > 2 && (
                  <button onClick={() => removeMilestone(i)} className="text-muted-foreground hover:text-red-400"><Trash2 className="size-4" /></button>
                )}
              </div>
              <input value={m.title} onChange={e => updateMilestone(i, { title: e.target.value })} placeholder="Title"
                className="w-full text-base sm:text-sm p-2 rounded-lg bg-background border border-border text-foreground" />
              <textarea value={m.description} onChange={e => updateMilestone(i, { description: e.target.value })} placeholder="Description (optional)" rows={2}
                className="w-full text-base sm:text-sm p-2 rounded-lg bg-background border border-border text-foreground" />
              <input type="number" step="0.01" min="1" value={m.amountDollars} onChange={e => updateMilestone(i, { amountDollars: e.target.value })} placeholder="Amount ($)"
                className="w-full text-base sm:text-sm p-2 rounded-lg bg-background border border-border text-foreground" />
            </div>
          ))}
          {milestones.length < 10 && (
            <button onClick={addMilestone} className="text-xs flex items-center gap-1 px-3 py-2 rounded-lg border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground">
              <Plus className="size-4" /> Add milestone
            </button>
          )}
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Terms (optional)</label>
        <textarea value={termsText} onChange={e => setTermsText(e.target.value)} rows={3}
          className="w-full text-base sm:text-sm p-3 rounded-lg bg-card border border-border text-foreground" />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex flex-col-reverse sm:flex-row sm:flex-wrap gap-2 pt-2">
        <button onClick={() => save(false)} disabled={busy} className="text-sm px-5 py-3 rounded-lg border border-border text-foreground hover:border-foreground disabled:opacity-50">
          {busy ? 'Saving…' : 'Save as draft'}
        </button>
        <button onClick={() => save(true)} disabled={busy} className="text-sm px-5 py-3 rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50">
          {busy ? 'Sending…' : 'Save & send to buyer'}
        </button>
      </div>
    </div>
  )
}
