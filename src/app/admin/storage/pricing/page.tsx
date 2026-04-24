'use client'

import { useState, useEffect } from 'react'
import { Tag, Save, Check } from 'lucide-react'

interface Config {
  freePlanMb: number
  creatorPlanGb: number; creatorPlanPriceCents: number
  proPlanGb: number; proPlanPriceCents: number
  overageCentsPerGb: number; overageGracePercent: number
  warningThreshold1: number; warningThreshold2: number
  gracePeriodDays: number; orphanAgeDays: number; deleteWarningHours: number
  feeGraceDays: number; feePayoutBlockDays: number; feeSuspendDays: number
  updatedAt?: string
}

const DEFAULT_CONFIG: Config = {
  freePlanMb: 2048,
  creatorPlanGb: 25, creatorPlanPriceCents: 690,
  proPlanGb: 100, proPlanPriceCents: 1490,
  overageCentsPerGb: 8, overageGracePercent: 10,
  warningThreshold1: 80, warningThreshold2: 95,
  gracePeriodDays: 7, orphanAgeDays: 30, deleteWarningHours: 48,
  feeGraceDays: 7, feePayoutBlockDays: 14, feeSuspendDays: 30,
}

type SaveStatus = 'idle' | 'saving' | 'saved'

function NumberField({ label, value, onChange, min, max, suffix }: {
  label: string; value: number; onChange: (v: number) => void
  min?: number; max?: number; suffix?: string
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <label className="text-sm text-foreground">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={e => onChange(Number(e.target.value))}
          className="w-24 px-3 py-1.5 rounded-lg bg-background border border-border text-foreground text-sm text-right focus-visible:border-primary outline-none"
        />
        {suffix && <span className="text-xs text-muted-foreground w-20">{suffix}</span>}
      </div>
    </div>
  )
}

const EMAIL_TEMPLATES = [
  {
    key: '80pct',
    tab: '80% Warning',
    subject: 'Storage at 80% — noizu.direct',
    body: `Hi [Creator Name],\n\nYour noizu.direct storage is now at 80% of your plan quota.\n\nUsed: [1.6 GB] of [2 GB]\n\nConsider upgrading to Creator (25 GB, USD 6.90/month) or Pro (100 GB, USD 14.90/month), or remove unused files.\n\nManage your storage: https://noizu.direct/dashboard/storage\n\nnoizu.direct`,
  },
  {
    key: '95pct',
    tab: '95% Warning',
    subject: 'Storage almost full — noizu.direct',
    body: `Hi [Creator Name],\n\nYour storage is now at 95%. On the Free plan, new uploads will be blocked at 100%. On paid plans, overage begins at $0.08/GB/month above your quota.\n\nUsed: [1.9 GB] of [2 GB]\n\nUpgrade or free up space:\nhttps://noizu.direct/dashboard/storage\n\nnoizu.direct`,
  },
  {
    key: 'full',
    tab: 'Full (Free plan only)',
    subject: 'Storage full — uploads blocked',
    body: `Hi [Creator Name],\n\nYou've reached the 2 GB limit of the Free plan. New uploads are now blocked.\n\nUpgrade to keep uploading:\n- Creator: 25 GB, USD 6.90/month\n- Pro: 100 GB, USD 14.90/month\n\nhttps://noizu.direct/dashboard/storage\n\nnoizu.direct`,
  },
  {
    key: 'overage',
    tab: 'Overage Started (paid)',
    subject: 'Storage overage started — noizu.direct',
    body: `Hi [Creator Name],\n\nYou've exceeded your plan quota. Overage at $0.08/GB/month is now accruing and will be billed with your next renewal.\n\nUsed: [27 GB] of [25 GB]\nEstimated overage this month: [USD 0.16]\n\nConsider upgrading to Pro (100 GB, USD 14.90/month) if you expect to stay above quota.\n\nhttps://noizu.direct/dashboard/storage\n\nnoizu.direct`,
  },
  {
    key: 'grace',
    tab: 'Grace Started',
    subject: '7-day storage grace period started',
    body: `Hi [Creator Name],\n\nYour storage has been over the hard limit for 24 hours. A 7-day grace period has started.\n\nAfter 7 days, orphaned files may be auto-deleted after a 48-hour final warning.\n\nYour active product images, portfolio, and profile assets are never auto-deleted.\n\nhttps://noizu.direct/dashboard/storage\n\nnoizu.direct`,
  },
  {
    key: 'delete_warn',
    tab: 'Delete Warning',
    subject: 'Orphaned files will be deleted in 48 hours',
    body: `Hi [Creator Name],\n\nYour grace period has ended. [N] orphaned files ([X MB]) will be automatically deleted in 48 hours.\n\nTo prevent deletion, either delete them manually or upgrade your plan.\n\nhttps://noizu.direct/dashboard/storage\n\nnoizu.direct`,
  },
  {
    key: 'deleted',
    tab: 'Auto Deleted',
    subject: 'Orphaned files auto-deleted — noizu.direct',
    body: `Hi [Creator Name],\n\n[N] orphaned files ([X MB]) have been automatically deleted from your account to free up space.\n\nYour active product images, portfolio, and profile assets were not affected.\n\nhttps://noizu.direct/dashboard/storage\n\nnoizu.direct`,
  },
  {
    key: 'subscribed',
    tab: 'Subscription Confirmed',
    subject: 'Storage plan activated — noizu.direct',
    body: `Hi [Creator Name],\n\nYour storage plan is active.\n\nPlan: [Creator / Pro]\nQuota: [25 GB / 100 GB]\nMonthly: USD [6.90 / 14.90]\nRenews: [Date]\n\nOverage (if any) is billed at $0.08/GB/month with your next renewal.\n\nhttps://noizu.direct/dashboard/storage\n\nnoizu.direct`,
  },
]

export default function AdminStoragePricingPage() {
  const [config, setConfig]     = useState<Config>(DEFAULT_CONFIG)
  const [loading, setLoading]   = useState(true)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [emailTab, setEmailTab] = useState(EMAIL_TEMPLATES[0].key)

  useEffect(() => {
    fetch('/api/admin/storage-pricing')
      .then(r => r.json())
      .then((data: { config?: Config }) => {
        if (data.config) setConfig({ ...DEFAULT_CONFIG, ...data.config })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function set<K extends keyof Config>(key: K, value: Config[K]) {
    setConfig(prev => ({ ...prev, [key]: value }))
    setSaveStatus('idle')
  }

  async function savePlan() {
    setSaveStatus('saving')
    try {
      const res = await fetch('/api/admin/storage-pricing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      if (res.ok) { setSaveStatus('saved'); setTimeout(() => setSaveStatus('idle'), 2000) }
    } catch {
      setSaveStatus('idle')
    }
  }

  const activeTemplate = EMAIL_TEMPLATES.find(t => t.key === emailTab)!

  if (loading) return <div className="text-muted-foreground text-sm p-6">Loading…</div>

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Tag className="size-6" /> Storage Pricing & Plans
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure the three-tier storage policy (Free / Creator / Pro) and enforcement thresholds.
          Overage is billed monthly; flat-pack top-ups are not offered.
        </p>
      </div>

      {/* Plan pricing */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
        <h3 className="text-base font-semibold text-foreground">Plan Pricing</h3>

        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-border bg-border/10 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Free Plan</p>
            <NumberField label="Storage" value={config.freePlanMb} onChange={v => set('freePlanMb', v)} min={100} suffix="MB" />
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-muted-foreground">Price</span>
              <span className="text-sm text-muted-foreground">USD 0 (always free)</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-muted-foreground">Overage</span>
              <span className="text-sm text-muted-foreground">Hard block at 100%</span>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-border space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Creator Plan</p>
            <NumberField label="Storage" value={config.creatorPlanGb} onChange={v => set('creatorPlanGb', v)} min={1} suffix="GB" />
            <NumberField label="Monthly price" value={config.creatorPlanPriceCents} onChange={v => set('creatorPlanPriceCents', v)} min={0} suffix="USD cents" />
            <p className="text-xs text-muted-foreground">= USD {(config.creatorPlanPriceCents / 100).toFixed(2)}/month</p>
          </div>

          <div className="p-4 rounded-xl border border-border space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pro Plan</p>
            <NumberField label="Storage" value={config.proPlanGb} onChange={v => set('proPlanGb', v)} min={1} suffix="GB" />
            <NumberField label="Monthly price" value={config.proPlanPriceCents} onChange={v => set('proPlanPriceCents', v)} min={0} suffix="USD cents" />
            <p className="text-xs text-muted-foreground">= USD {(config.proPlanPriceCents / 100).toFixed(2)}/month</p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">Price changes apply to new subscriptions only.</p>
      </div>

      {/* Overage policy */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
        <h3 className="text-base font-semibold text-foreground">Overage Policy (paid plans)</h3>
        <p className="text-xs text-muted-foreground">
          Creator and Pro subscribers may exceed their quota and are billed monthly for the excess.
          A soft grace band prevents nuisance charges for small spillovers. The Free plan is hard-blocked at 100%.
        </p>
        <div className="space-y-4">
          <NumberField
            label="Overage rate"
            value={config.overageCentsPerGb}
            onChange={v => set('overageCentsPerGb', v)}
            min={0}
            suffix="USD cents / GB"
          />
          <p className="text-xs text-muted-foreground">
            = USD {(config.overageCentsPerGb / 100).toFixed(2)}/GB/month above quota
          </p>
          <NumberField
            label="Soft grace band"
            value={config.overageGracePercent}
            onChange={v => set('overageGracePercent', v)}
            min={0}
            max={100}
            suffix="%"
          />
          <p className="text-xs text-muted-foreground">
            Usage up to {config.overageGracePercent}% over quota is free; above that, overage accrues.
          </p>
        </div>
      </div>

      {/* Enforcement policy */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-6">
        <h3 className="text-base font-semibold text-foreground">Enforcement Policy</h3>

        <div className="space-y-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Warning Thresholds</p>
          <NumberField label="First warning at" value={config.warningThreshold1} onChange={v => set('warningThreshold1', v)} min={1} max={99} suffix="%" />
          <NumberField label="Second warning at" value={config.warningThreshold2} onChange={v => set('warningThreshold2', v)} min={1} max={99} suffix="%" />
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">Free plan blocked at</span>
            <span className="text-sm text-muted-foreground">100% (fixed)</span>
          </div>
        </div>

        <div className="space-y-4 pt-2 border-t border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Grace Period</p>
          <NumberField label="Grace period duration" value={config.gracePeriodDays} onChange={v => set('gracePeriodDays', v)} min={1} suffix="days" />
          <NumberField label="Orphan file age threshold" value={config.orphanAgeDays} onChange={v => set('orphanAgeDays', v)} min={1} suffix="days" />
          <NumberField label="Pre-delete warning time" value={config.deleteWarningHours} onChange={v => set('deleteWarningHours', v)} min={1} suffix="hours" />
        </div>

        <div className="space-y-4 pt-2 border-t border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fee Enforcement</p>
          <NumberField label="Grace before payouts blocked" value={config.feeGraceDays} onChange={v => set('feeGraceDays', v)} min={1} suffix="days" />
          <NumberField label="Grace before listings blocked" value={config.feePayoutBlockDays} onChange={v => set('feePayoutBlockDays', v)} min={1} suffix="days" />
          <NumberField label="Grace before suspended" value={config.feeSuspendDays} onChange={v => set('feeSuspendDays', v)} min={1} suffix="days" />
        </div>
      </div>

      {/* Save button */}
      <div className="flex items-center gap-3">
        <button
          onClick={savePlan}
          disabled={saveStatus === 'saving'}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white hover:bg-primary/90 disabled:opacity-60 transition-colors font-medium text-sm"
        >
          {saveStatus === 'saving' ? (
            <><Save className="size-4 animate-pulse" /> Saving…</>
          ) : saveStatus === 'saved' ? (
            <><Check className="size-4" /> Saved!</>
          ) : (
            <><Save className="size-4" /> Save All Settings</>
          )}
        </button>
        {config.updatedAt && (
          <span className="text-xs text-muted-foreground">
            Last updated: {new Date(config.updatedAt).toLocaleString()}
          </span>
        )}
      </div>

      {/* Email templates preview */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-base font-semibold text-foreground">Notification Templates Preview</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Read-only preview. Edit templates coming in V2.</p>
        </div>

        {/* Template tabs */}
        <div className="flex overflow-x-auto border-b border-border px-3 gap-1">
          {EMAIL_TEMPLATES.map(t => (
            <button
              key={t.key}
              onClick={() => setEmailTab(t.key)}
              className={`shrink-0 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors ${emailTab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              {t.tab}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Subject</p>
            <div className="px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground">{activeTemplate.subject}</div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Body</p>
            <pre className="px-3 py-3 rounded-lg border border-border bg-background text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">{activeTemplate.body}</pre>
          </div>
        </div>
      </div>
    </div>
  )
}
