'use client'

// Shared modal for capturing the staff access reason before opening a private
// bucket file. Every view of a private file writes a PrivateFileAccess row on
// the server; the staff-facing /api/files route rejects requests missing an
// X-Access-Reason header. This modal is the UI for that handshake.
//
// Callers pass `open`, `onClose`, and `onConfirm(reasonCode, reasonNote)` and
// then forward the values to `fetchPrivateBlobUrl` (see
// @/lib/private-file-fetch). Keep in mind OWNER_SELF_VIEW is synthesized
// server-side and is never a selectable option here.

import { useEffect, useState } from 'react'
import { X, ShieldAlert } from 'lucide-react'
import {
  ACCESS_REASON_CODES,
  ACCESS_REASON_LABELS,
  type AccessReasonCode,
} from '@/lib/private-file-audit'

const SELECTABLE_CODES: AccessReasonCode[] = (ACCESS_REASON_CODES as readonly AccessReasonCode[])
  .filter((c) => c !== 'OWNER_SELF_VIEW')

interface Props {
  open: boolean
  onClose: () => void
  onConfirm: (reasonCode: AccessReasonCode, reasonNote: string) => void | Promise<void>
  /** Prefill the reason code (e.g. KYC_REVIEW on the KYC review page). */
  defaultReasonCode?: AccessReasonCode
  /** Short description of the resource being opened (e.g. "ID — Front"). */
  resourceLabel?: string
  /** Optional title override. */
  title?: string
  /** Optional submit-button label override. */
  submitLabel?: string
}

export function AccessReasonModal({
  open,
  onClose,
  onConfirm,
  defaultReasonCode = 'KYC_REVIEW',
  resourceLabel,
  title = 'Confirm access reason',
  submitLabel = 'View file',
}: Props) {
  const [reasonCode, setReasonCode] = useState<AccessReasonCode>(defaultReasonCode)
  const [reasonNote, setReasonNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setReasonCode(defaultReasonCode)
      setReasonNote('')
      setError('')
      setSubmitting(false)
    }
  }, [open, defaultReasonCode])

  if (!open) return null

  const requiresNote = reasonCode === 'OTHER'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (requiresNote && reasonNote.trim().length < 3) {
      setError('Please add a short note (minimum 3 characters).')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await onConfirm(reasonCode, reasonNote.trim())
    } catch (err) {
      setError((err as Error).message || 'Request failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={submitting ? undefined : onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 bg-card border border-border rounded-xl w-full max-w-md shadow-2xl">
        <div className="flex items-start justify-between px-6 py-4 border-b border-border">
          <div className="flex items-start gap-3">
            <ShieldAlert className="size-5 text-amber-400 mt-0.5" />
            <div>
              <h3 className="text-base font-semibold text-foreground">{title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                This access is audited. Please state why you&apos;re viewing it.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {resourceLabel && (
            <div className="rounded-lg bg-surface border border-border px-3 py-2 text-xs text-muted-foreground">
              <span className="text-muted-foreground/80">Resource:</span>{' '}
              <span className="text-foreground font-medium">{resourceLabel}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground block">
              Reason <span className="text-red-400">*</span>
            </label>
            <select
              value={reasonCode}
              onChange={(e) => setReasonCode(e.target.value as AccessReasonCode)}
              disabled={submitting}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
              required
            >
              {SELECTABLE_CODES.map((c) => (
                <option key={c} value={c}>
                  {ACCESS_REASON_LABELS[c]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground block">
              Note{' '}
              {requiresNote ? (
                <span className="text-red-400">*</span>
              ) : (
                <span className="text-muted-foreground/50">(optional)</span>
              )}
            </label>
            <textarea
              value={reasonNote}
              onChange={(e) => setReasonNote(e.target.value)}
              rows={3}
              disabled={submitting}
              placeholder={
                requiresNote
                  ? 'Briefly describe why you need to see this file.'
                  : 'Optional context — e.g. ticket number.'
              }
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary resize-none"
            />
          </div>

          {error && (
            <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-border text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Loading…' : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
