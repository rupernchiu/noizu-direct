'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

const TAX_LABELS = ['SST', 'GST', 'VAT', 'PPN'] as const
type TaxLabel = (typeof TAX_LABELS)[number]
type Status = 'NONE' | 'REQUESTED' | 'APPROVED' | 'REJECTED'

interface Props {
  status: Status
  collectsSalesTax: boolean
  existingRate: number | null
  existingLabel: TaxLabel | null
  existingCertificateUrl: string | null
  approvedAt: string | null
  taxId: string
  taxJurisdiction: string
  suggestedLabel: TaxLabel
}

const inputCls =
  'w-full px-3 py-2 rounded-lg bg-surface border border-border text-foreground placeholder:text-muted-foreground focus-visible:border-primary outline-none transition-colors'

export function SalesTaxOptInForm(props: Props) {
  const router = useRouter()
  const [resubmitOpen, setResubmitOpen] = useState(false)

  if (props.status === 'APPROVED') {
    return <ApprovedState {...props} />
  }
  if (props.status === 'REQUESTED') {
    return (
      <RequestedState
        {...props}
        onEdit={() => setResubmitOpen(true)}
        editing={resubmitOpen}
        onCancel={() => setResubmitOpen(false)}
        onSubmitted={() => {
          setResubmitOpen(false)
          router.refresh()
        }}
      />
    )
  }
  if (props.status === 'REJECTED') {
    return (
      <RejectedState
        {...props}
        onSubmitted={() => router.refresh()}
      />
    )
  }
  // NONE
  return <RequestForm {...props} onSubmitted={() => router.refresh()} />
}

// ─── Approved ────────────────────────────────────────────────────────────────

function ApprovedState(props: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function toggle() {
    setBusy(true)
    try {
      const fd = new FormData()
      fd.set('toggleCollect', props.collectsSalesTax ? 'off' : 'on')
      const res = await fetch('/api/dashboard/finance/tax/sales-tax-request', {
        method: 'POST',
        body: fd,
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        toast.error(body.error ?? 'Could not update your collection setting.')
        return
      }
      toast.success(props.collectsSalesTax ? 'Sales tax collection paused' : 'Sales tax collection resumed')
      router.refresh()
    } catch {
      toast.error('Network error — please try again.')
    } finally {
      setBusy(false)
    }
  }

  const ratePct = props.existingRate != null ? (props.existingRate * 100).toFixed(2) : '—'
  const approvedDate = props.approvedAt ? new Date(props.approvedAt).toLocaleDateString() : null

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-wide text-emerald-400 font-semibold">
              Active
            </p>
            <p className="text-base font-semibold text-foreground mt-1">
              {props.existingLabel ?? '—'} {ratePct}%
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              noizu.direct collects this tax on each of your orders and passes it through in your
              payout for you to remit.
            </p>
          </div>
          <span
            className={`px-2 py-0.5 rounded text-xs font-semibold ${
              props.collectsSalesTax
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-yellow-500/20 text-yellow-400'
            }`}
          >
            {props.collectsSalesTax ? 'Collecting' : 'Paused'}
          </span>
        </div>
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <Field label="Tax ID" value={props.taxId} />
        <Field label="Jurisdiction" value={props.taxJurisdiction} />
        <Field label="Approved" value={approvedDate ?? '—'} />
        <Field
          label="Certificate"
          value={
            props.existingCertificateUrl ? (
              <a
                href={props.existingCertificateUrl}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline"
              >
                View
              </a>
            ) : (
              '—'
            )
          }
        />
      </dl>

      <div className="rounded-lg border border-border bg-surface/50 p-4 space-y-2">
        <p className="text-sm font-medium text-foreground">
          {props.collectsSalesTax ? 'Pause collection' : 'Resume collection'}
        </p>
        <p className="text-xs text-muted-foreground">
          You can pause collection without losing your approval. Resuming does not require another
          admin review — collection restarts on the next order. To change your rate, label, or
          certificate, contact admin.
        </p>
        <button
          type="button"
          onClick={toggle}
          disabled={busy}
          className="mt-2 px-4 py-2 rounded-lg border border-border text-sm font-semibold text-foreground hover:border-primary transition-colors disabled:opacity-60"
        >
          {busy
            ? 'Saving…'
            : props.collectsSalesTax
            ? 'Pause collection'
            : 'Resume collection'}
        </button>
      </div>
    </div>
  )
}

// ─── Requested (pending review) ──────────────────────────────────────────────

function RequestedState(
  props: Props & {
    onEdit: () => void
    editing: boolean
    onCancel: () => void
    onSubmitted: () => void
  },
) {
  const ratePct = props.existingRate != null ? (props.existingRate * 100).toFixed(2) : '—'

  if (props.editing) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Update your request. Submitting again replaces the previous certificate and keeps the
          status pending until admin re-reviews.
        </p>
        <RequestForm
          {...props}
          submitLabel="Update request"
          onSubmitted={props.onSubmitted}
          onCancel={props.onCancel}
        />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
        <p className="text-xs uppercase tracking-wide text-yellow-400 font-semibold">
          Pending admin review
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Your sales tax collection request is in the review queue. You&apos;ll be emailed once a
          decision is made — usually within a couple of business days.
        </p>
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <Field label="Label" value={props.existingLabel ?? '—'} />
        <Field label="Rate" value={`${ratePct}%`} />
        <Field label="Tax ID" value={props.taxId} />
        <Field label="Jurisdiction" value={props.taxJurisdiction} />
        <Field
          label="Certificate"
          value={
            props.existingCertificateUrl ? (
              <a
                href={props.existingCertificateUrl}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline"
              >
                View
              </a>
            ) : (
              '—'
            )
          }
        />
      </dl>

      <button
        type="button"
        onClick={props.onEdit}
        className="px-4 py-2 rounded-lg border border-border text-sm font-semibold text-foreground hover:border-primary transition-colors"
      >
        Edit request
      </button>
    </div>
  )
}

// ─── Rejected ────────────────────────────────────────────────────────────────

function RejectedState(props: Props & { onSubmitted: () => void }) {
  const [resubmitting, setResubmitting] = useState(false)

  if (resubmitting) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Submit a fresh request. Make sure the new certificate addresses the reason your previous
          request was declined.
        </p>
        <RequestForm
          {...props}
          submitLabel="Submit request"
          onSubmitted={props.onSubmitted}
          onCancel={() => setResubmitting(false)}
        />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4">
        <p className="text-xs uppercase tracking-wide text-rose-400 font-semibold">
          Request declined
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Your previous request was not approved. Check your email for the reason. You can submit a
          fresh request with an updated certificate or rate at any time.
        </p>
      </div>

      <button
        type="button"
        onClick={() => setResubmitting(true)}
        className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
      >
        Submit again
      </button>
    </div>
  )
}

// ─── Request form (used by NONE / re-submit) ─────────────────────────────────

interface RequestFormProps {
  status: Status
  existingRate: number | null
  existingLabel: TaxLabel | null
  suggestedLabel: TaxLabel
  submitLabel?: string
  onSubmitted: () => void
  onCancel?: () => void
}

function RequestForm(props: RequestFormProps) {
  const [rate, setRate] = useState<string>(
    props.existingRate != null ? (props.existingRate * 100).toFixed(2) : '6',
  )
  const [label, setLabel] = useState<TaxLabel>(props.existingLabel ?? props.suggestedLabel)
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return

    const rateNum = parseFloat(rate)
    if (!Number.isFinite(rateNum) || rateNum <= 0 || rateNum >= 25) {
      toast.error('Rate must be a number between 0 and 25 (percent).')
      return
    }
    if (!file) {
      toast.error('Upload your registration certificate (PDF or image).')
      return
    }

    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.set('rate', String(rateNum / 100)) // store as decimal (0.06 for 6%)
      fd.set('label', label)
      fd.set('certificate', file)

      const res = await fetch('/api/dashboard/finance/tax/sales-tax-request', {
        method: 'POST',
        body: fd,
      })

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        toast.error(body.error ?? 'Could not submit request. Please try again.')
        return
      }

      toast.success('Sales tax request submitted — pending admin review.')
      props.onSubmitted()
    } catch {
      toast.error('Network error — please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="rate" className="text-sm font-medium text-foreground">
            Tax rate (%)
          </label>
          <input
            id="rate"
            type="number"
            min={0}
            max={25}
            step={0.1}
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            placeholder="6"
            className={inputCls}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Most jurisdictions are 5–15%. Enter the rate registered with your tax authority.
          </p>
        </div>

        <div className="space-y-1">
          <label htmlFor="label" className="text-sm font-medium text-foreground">
            Tax label
          </label>
          <select
            id="label"
            value={label}
            onChange={(e) => setLabel(e.target.value as TaxLabel)}
            className={inputCls}
          >
            {TAX_LABELS.map((l) => (
              <option key={l} value={l}>
                {l}
                {l === props.suggestedLabel ? ' (suggested for your country)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="certificate" className="text-sm font-medium text-foreground">
          Registration certificate
        </label>
        <input
          id="certificate"
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-muted-foreground file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-white file:font-medium hover:file:bg-primary/90"
          required={props.status === 'NONE' || props.status === 'REJECTED'}
        />
        <p className="text-xs text-muted-foreground mt-1">
          PDF, JPG, or PNG. Max 5 MB. Stored privately and only visible to you and noizu.direct
          admin.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface/40 p-4 text-xs text-muted-foreground space-y-1">
        <p>
          <span className="font-semibold text-foreground">Important:</span> noizu.direct collects
          the tax at checkout on your behalf and passes it through in your payout. You remit it to
          your tax authority yourself under your own registration. We do not file or remit on your
          behalf.
        </p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <button
          type="submit"
          disabled={submitting}
          className="bg-primary hover:bg-primary/90 text-white font-semibold py-2.5 px-5 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? 'Submitting…' : props.submitLabel ?? 'Submit for review'}
        </button>
        {props.onCancel && (
          <button
            type="button"
            onClick={props.onCancel}
            className="border border-border text-muted-foreground hover:text-foreground hover:border-primary font-semibold py-2.5 px-5 rounded-lg transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}

// ─── Field row ───────────────────────────────────────────────────────────────

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-surface/40 p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground mt-1 break-all">{value}</p>
    </div>
  )
}
