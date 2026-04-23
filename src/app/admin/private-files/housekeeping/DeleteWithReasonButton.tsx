'use client'

import { useState, useTransition } from 'react'
import {
  deleteKycRetentionAction,
  deleteDisputeEvidenceAction,
} from './actions'

type Kind = 'kyc' | 'dispute-evidence'

export type DeletionReasonCode =
  | 'ORPHAN_PURGE'
  | 'KYC_RETENTION_EXPIRED'
  | 'DISPUTE_RETENTION_EXPIRED'
  | 'LEGAL_REQUEST'
  | 'GDPR_ERASURE'
  | 'DUPLICATE'
  | 'TEST_DATA'
  | 'OTHER'

const DELETION_REASONS: { value: DeletionReasonCode; label: string }[] = [
  { value: 'KYC_RETENTION_EXPIRED',     label: 'KYC retention expired (rejected 90+ days)' },
  { value: 'DISPUTE_RETENTION_EXPIRED', label: 'Dispute evidence retention expired (closed 540+ days)' },
  { value: 'LEGAL_REQUEST',             label: 'Legal / subpoena-driven removal' },
  { value: 'GDPR_ERASURE',              label: 'GDPR / DPA right-to-erasure' },
  { value: 'DUPLICATE',                 label: 'Duplicate / corrupt upload' },
  { value: 'TEST_DATA',                 label: 'Test-data cleanup' },
  { value: 'OTHER',                     label: 'Other (explain in notes)' },
]

interface Props {
  kind: Kind
  targetId: string
  label?: string
}

export function DeleteWithReasonButton({ kind, targetId, label = 'Delete + audit' }: Props) {
  const [open, setOpen] = useState(false)
  const [reasonCode, setReasonCode] = useState<DeletionReasonCode>(
    kind === 'kyc' ? 'KYC_RETENTION_EXPIRED' : 'DISPUTE_RETENTION_EXPIRED',
  )
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  const requiresNote = reasonCode === 'OTHER'
  const canSubmit = !pending && (!requiresNote || note.trim().length > 0)

  function run(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    startTransition(async () => {
      const res =
        kind === 'kyc'
          ? await deleteKycRetentionAction({ uploadId: targetId, reasonCode, reasonNote: note.trim() })
          : await deleteDisputeEvidenceAction({ evidenceId: targetId, reasonCode, reasonNote: note.trim() })
      if (!res.ok) setError(res.error ?? 'Delete failed')
      else setOpen(false)
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); setError(''); setNote('') }}
        className="px-2 py-0.5 rounded text-xs font-medium bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors"
      >
        {label}
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => !pending && setOpen(false)}
        aria-hidden="true"
      />
      <div className="relative z-10 bg-surface border border-border rounded-xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="text-base font-semibold text-foreground">
            {kind === 'kyc' ? 'Delete KYC upload' : 'Delete dispute evidence'}
          </h3>
          <button
            type="button"
            onClick={() => !pending && setOpen(false)}
            className="text-muted-foreground hover:text-foreground transition-colors text-lg leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form onSubmit={run} className="px-6 py-4 space-y-4">
          <p className="text-xs text-muted-foreground">
            This writes a <code className="font-mono">PrivateFileDeletion</code> row
            before removing the R2 object. The action cannot be undone.
          </p>

          {error && (
            <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Reason code <span className="text-red-400">*</span>
            </label>
            <select
              value={reasonCode}
              onChange={(e) => setReasonCode(e.target.value as DeletionReasonCode)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
              required
            >
              {DELETION_REASONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Note{' '}
              {requiresNote ? (
                <span className="text-red-400">*</span>
              ) : (
                <span className="text-muted-foreground/50">(optional)</span>
              )}
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder={requiresNote ? 'Explain why this file must be removed…' : 'Optional context'}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={pending}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-border text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-500/90 transition-colors disabled:opacity-50"
            >
              {pending ? 'Deleting…' : 'Delete + audit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
