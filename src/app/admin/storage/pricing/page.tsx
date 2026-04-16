'use client'

import { useState, useEffect } from 'react'
import { Tag, Save, Check } from 'lucide-react'

interface Config {
  freePlanMb: number; proPlanGb: number; proPlanPriceCents: number
  studioPlanGb: number; studioPlanPriceCents: number
  topup1gbCents: number; topup5gbCents: number; topup10gbCents: number
  warningThreshold1: number; warningThreshold2: number
  gracePeriodDays: number; orphanAgeDays: number; deleteWarningHours: number
  feeGraceDays: number; feePayoutBlockDays: number; feeSuspendDays: number
  updatedAt?: string
}

const DEFAULT_CONFIG: Config = {
  freePlanMb: 500, proPlanGb: 5, proPlanPriceCents: 999,
  studioPlanGb: 20, studioPlanPriceCents: 1999,
  topup1gbCents: 299, topup5gbCents: 999, topup10gbCents: 1799,
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
        {suffix && <span className="text-xs text-muted-foreground w-12">{suffix}</span>}
      </div>
    </div>
  )
}

const EMAIL_TEMPLATES = [
  {
    key: '80pct',
    tab: '80% Warning',
    subject: 'Storage at 80% — NOIZU-DIRECT',
    body: `Hi [Creator Name],\n\nYour NOIZU-DIRECT storage is now at 80% of your [500MB] free quota.\n\nYou've used [400MB] of [500MB].\n\nConsider upgrading to Pro (5GB, USD 9.99/month) or deleting unused files.\n\nManage your storage: https://noizu.direct/dashboard/storage\n\nNOIZU-DIRECT`,
  },
  {
    key: '95pct',
    tab: '95% Warning',
    subject: 'Storage almost full — NOIZU-DIRECT',
    body: `Hi [Creator Name],\n\nYour storage is now at 95%. New uploads will be blocked when you reach 100%.\n\nUsed: [475MB] of [500MB]\n\nUpgrade now or free up space to keep uploading.\n\nhttps://noizu.direct/dashboard/storage\n\nNOIZU-DIRECT`,
  },
  {
    key: 'full',
    tab: 'Full',
    subject: 'Storage full — uploads blocked',
    body: `Hi [Creator Name],\n\nYour storage is full. New uploads are now blocked.\n\nDelete files or upgrade your plan to continue uploading.\n\nhttps://noizu.direct/dashboard/storage\n\nNOIZU-DIRECT`,
  },
  {
    key: 'grace',
    tab: 'Grace Started',
    subject: '7-day storage grace period started',
    body: `Hi [Creator Name],\n\nYour storage has been over quota for 24 hours. A 7-day grace period has started.\n\nAfter 7 days, orphaned files may be auto-deleted after a 48-hour final warning.\n\nYour active product images and portfolio are never auto-deleted.\n\nhttps://noizu.direct/dashboard/storage\n\nNOIZU-DIRECT`,
  },
  {
    key: 'delete_warn',
    tab: 'Delete Warning',
    subject: 'Orphaned files will be deleted in 48 hours',
    body: `Hi [Creator Name],\n\nYour grace period has ended. [N] orphaned files ([X MB]) will be automatically deleted in 48 hours.\n\nTo prevent deletion, either delete them manually or upgrade your plan.\n\nhttps://noizu.direct/dashboard/storage\n\nNOIZU-DIRECT`,
  },
  {
    key: 'deleted',
    tab: 'Auto Deleted',
    subject: 'Orphaned files auto-deleted — NOIZU-DIRECT',
    body: `Hi [Creator Name],\n\n[N] orphaned files ([X MB]) have been automatically deleted from your account to free up space.\n\nYour active product images, portfolio, and profile assets were not affected.\n\nhttps://noizu.direct/dashboard/storage\n\nNOIZU-DIRECT`,
  },
  {
    key: 'purchase',
    tab: 'Purchase Confirmed',
    subject: 'Storage upgrade confirmed — NOIZU-DIRECT',
    body: `Hi [Creator Name],\n\nYour storage upgrade is confirmed!\n\nPlan: [Plan Name]\nNew quota: [X GB]\nAmount: USD [X.XX]\n\nYour upgraded storage is now active.\n\nhttps://noizu.direct/dashboard/storage\n\nNOIZU-DIRECT`,
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
        <p className="text-sm text-muted-foreground mt-1">Configure storage plans, top-up pricing, and enforcement policies.</p>
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
          </div>

          <div className="p-4 rounded-xl border border-border space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pro Plan</p>
            <NumberField label="Storage" value={config.proPlanGb} onChange={v => set('proPlanGb', v)} min={1} suffix="GB" />
            <NumberField label="Monthly price" value={config.proPlanPriceCents} onChange={v => set('proPlanPriceCents', v)} min={0} suffix="USD cents" />
            <p className="text-xs text-muted-foreground">= USD {(config.proPlanPriceCents / 100).toFixed(2)}/month</p>
          </div>

          <div className="p-4 rounded-xl border border-border space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Studio Plan</p>
            <NumberField label="Storage" value={config.studioPlanGb} onChange={v => set('studioPlanGb', v)} min={1} suffix="GB" />
            <NumberField label="Monthly price" value={config.studioPlanPriceCents} onChange={v => set('studioPlanPriceCents', v)} min={0} suffix="USD cents" />
            <p className="text-xs text-muted-foreground">= USD {(config.studioPlanPriceCents / 100).toFixed(2)}/month</p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">Price changes apply to new subscriptions only.</p>
      </div>

      {/* Top-up pricing */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
        <h3 className="text-base font-semibold text-foreground">Top-up Pricing</h3>
        <div className="space-y-3">
          {[
            { label: '+1 GB',  key: 'topup1gbCents'  as keyof Config },
            { label: '+5 GB',  key: 'topup5gbCents'  as keyof Config },
            { label: '+10 GB', key: 'topup10gbCents' as keyof Config },
          ].map(({ label, key }) => (
            <div key={key} className="flex items-center gap-4">
              <span className="text-sm text-foreground w-16 font-medium">{label}</span>
              <input
                type="number"
                value={config[key] as number}
                min={0}
                onChange={e => set(key, Number(e.target.value) as Config[typeof key])}
                className="w-24 px-3 py-1.5 rounded-lg bg-background border border-border text-foreground text-sm text-right focus-visible:border-primary outline-none"
              />
              <span className="text-xs text-muted-foreground">USD cents = USD {((config[key] as number) / 100).toFixed(2)}</span>
            </div>
          ))}
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
            <span className="text-sm text-muted-foreground">Upload blocked at</span>
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
