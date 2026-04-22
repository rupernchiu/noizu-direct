'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface ApplicationData {
  id: string
  userId: string
  status: string
  displayName: string
  username: string
  bio: string
  categoryTags: string
  legalFullName: string
  dateOfBirth: string | null
  nationality: string
  country: string
  phone: string
  idType: string
  idNumber: string
  idFrontImage: string | null
  idBackImage: string | null
  selfieImage: string | null
  kycCompleted: boolean
  bankName: string
  bankAccountNumber: string
  bankAccountName: string
  paypalEmail: string | null
  adminNote: string | null
  rejectionReason: string | null
  submittedAt: string | null
  reviewedAt: string | null
  createdAt: string
  userName: string
  userEmail: string
}

interface AgreementRecord {
  id: string
  type: string
  title: string
  version: string
  signedName: string
  agreedAt: string
  templateIsActive: boolean
}

interface ActiveTemplate {
  id: string
  type: string
  title: string
  version: string
}

interface Props {
  application: ApplicationData
  agreements: AgreementRecord[]
  activeTemplates: ActiveTemplate[]
}

const REJECTION_REASONS = [
  'ID unclear/unreadable',
  'ID expired',
  'Under 18',
  'Name mismatch',
  'Incomplete documents',
  'Suspicious activity',
  'Other',
]

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'SUBMITTED':
      return <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/20 text-yellow-400">⏳ Pending</span>
    case 'UNDER_REVIEW':
      return <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-400">🔍 Under Review</span>
    case 'APPROVED':
      return <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-400">✅ Approved</span>
    case 'REJECTED':
      return <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-400">❌ Rejected</span>
    default:
      return <span className="px-2 py-0.5 rounded text-xs font-medium bg-border text-muted-foreground">Draft</span>
  }
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-2 border-b border-border last:border-0">
      <span className="text-xs text-muted-foreground w-36 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-foreground flex-1">{value || <span className="text-muted-foreground/40">—</span>}</span>
    </div>
  )
}

export function ApplicationReviewClient({ application, agreements, activeTemplates }: Props) {
  const router = useRouter()

  // Parse category tags
  let tags: string[] = []
  try {
    tags = JSON.parse(application.categoryTags)
  } catch {
    tags = []
  }

  // Agreement lookup by type
  const agreementByType: Record<string, AgreementRecord> = {}
  for (const a of agreements) {
    // Keep the most recent per type
    if (!agreementByType[a.type]) agreementByType[a.type] = a
  }

  // Action states
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState('')

  // Rejection modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState(REJECTION_REASONS[0])
  const [rejectNotes, setRejectNotes] = useState('')

  // Admin note
  const [adminNote, setAdminNote] = useState(application.adminNote ?? '')

  // Legal name edit
  const [legalName, setLegalName] = useState(application.legalFullName ?? '')
  const [legalNameSaving, setLegalNameSaving] = useState(false)
  const [legalNameSaved, setLegalNameSaved] = useState(false)
  const [legalNameError, setLegalNameError] = useState('')

  async function handleSaveLegalName() {
    if (!legalName.trim()) return
    setLegalNameSaving(true)
    setLegalNameError('')
    try {
      const res = await fetch(`/api/admin/applications/${application.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'UPDATE_LEGAL_NAME', legalFullName: legalName.trim() }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setLegalNameError(data.error ?? 'Failed to save')
      } else {
        setLegalNameSaved(true)
        setTimeout(() => setLegalNameSaved(false), 2500)
        router.refresh()
      }
    } catch {
      setLegalNameError('Network error')
    }
    setLegalNameSaving(false)
  }
  const [noteSaving, setNoteSaving] = useState(false)
  const [noteSaved, setNoteSaved] = useState(false)

  async function patch(body: Record<string, unknown>) {
    setActionLoading(true)
    setActionError('')
    try {
      const res = await fetch(`/api/admin/applications/${application.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setActionError(data.error ?? 'Request failed.')
        return false
      }
      return true
    } catch {
      setActionError('Network error. Please try again.')
      return false
    } finally {
      setActionLoading(false)
    }
  }

  async function handleApprove() {
    if (!confirm('Approve this creator application? This will grant creator access.')) return
    const ok = await patch({ action: 'APPROVE' })
    if (ok) router.refresh()
  }

  async function handleRejectSubmit(e: React.FormEvent) {
    e.preventDefault()
    const ok = await patch({ action: 'REJECT', rejectionReason: rejectReason, adminNote: rejectNotes || undefined })
    if (ok) {
      setRejectModalOpen(false)
      router.refresh()
    }
  }

  async function handleSaveNote() {
    setNoteSaving(true)
    setNoteSaved(false)
    try {
      await fetch(`/api/admin/applications/${application.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminNote }),
      })
      setNoteSaved(true)
      setTimeout(() => setNoteSaved(false), 2500)
      router.refresh()
    } finally {
      setNoteSaving(false)
    }
  }

  const isActionable = application.status === 'SUBMITTED' || application.status === 'UNDER_REVIEW'

  return (
    <div className="space-y-6">
      {/* H5 — strip Referer from any outbound request on this page so that
          the signed-in KYC viewer URL never leaks as a Referer header to
          third-party scripts (Clarity, analytics). Works in tandem with the
          Referrer-Policy header the /api/files route sets. */}
      <meta name="referrer" content="no-referrer" />

      {/* Header */}
      <div className="flex items-start gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <Link
              href="/admin/creators/applications"
              className="text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              ← Applications
            </Link>
            <span className="text-muted-foreground">/</span>
            <h2 className="text-lg font-semibold text-foreground">
              {application.displayName || application.userName}
            </h2>
            <StatusBadge status={application.status} />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {application.userEmail}
            {application.submittedAt && (
              <> · Submitted {new Date(application.submittedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</>
            )}
          </p>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        {/* Left column — 60% */}
        <div className="lg:col-span-3 space-y-6">
          {/* Store Profile */}
          <section className="bg-surface border border-border rounded-xl p-6 space-y-1">
            <h3 className="text-sm font-semibold text-foreground mb-3">Store Profile</h3>
            <InfoRow label="Display Name" value={application.displayName} />
            <InfoRow
              label="Username"
              value={
                application.username ? (
                  <span className="font-mono text-xs">@{application.username}</span>
                ) : null
              }
            />
            <InfoRow
              label="Bio"
              value={
                application.bio ? (
                  <span className="whitespace-pre-wrap leading-relaxed">{application.bio}</span>
                ) : null
              }
            />
            <InfoRow
              label="Category Tags"
              value={
                tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/15 text-primary border border-primary/20"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null
              }
            />
          </section>

          {/* Personal Details */}
          <section className="bg-surface border border-border rounded-xl p-6 space-y-1">
            <h3 className="text-sm font-semibold text-foreground mb-3">Personal Details</h3>
            <div className="flex gap-3 py-2 border-b border-border items-start">
              <span className="text-xs text-muted-foreground w-36 shrink-0 pt-2">Legal Full Name</span>
              <div className="flex-1 space-y-1">
                <div className="flex gap-2">
                  <input
                    value={legalName}
                    onChange={e => setLegalName(e.target.value)}
                    placeholder="Enter legal full name"
                    className="flex-1 px-2 py-1 text-sm bg-background border border-border rounded text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    onClick={handleSaveLegalName}
                    disabled={legalNameSaving || !legalName.trim()}
                    className="px-3 py-1 text-xs font-medium bg-primary/20 text-primary rounded hover:bg-primary/30 disabled:opacity-40 transition-colors"
                  >
                    {legalNameSaving ? 'Saving…' : legalNameSaved ? 'Saved ✓' : 'Save'}
                  </button>
                </div>
                {!application.legalFullName && (
                  <p className="text-xs text-amber-400">⚠ No legal name on file — creator cannot sign agreements until this is set</p>
                )}
                {legalNameError && <p className="text-xs text-red-400">{legalNameError}</p>}
              </div>
            </div>
            <InfoRow
              label="Date of Birth"
              value={
                application.dateOfBirth
                  ? new Date(application.dateOfBirth).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : null
              }
            />
            <InfoRow label="Nationality" value={application.nationality} />
            <InfoRow label="Country" value={application.country} />
            <InfoRow label="Phone" value={application.phone} />
            <InfoRow
              label="ID Type"
              value={
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-border text-muted-foreground">
                  {application.idType}
                </span>
              }
            />
            <InfoRow label="ID Number" value={application.idNumber} />
          </section>

          {/* Bank Details */}
          <section className="bg-surface border border-border rounded-xl p-6 space-y-1">
            <h3 className="text-sm font-semibold text-foreground mb-3">Bank Details</h3>
            <InfoRow label="Bank Name" value={application.bankName} />
            <InfoRow label="Account Number" value={application.bankAccountNumber} />
            <InfoRow label="Account Holder" value={application.bankAccountName} />
            {application.paypalEmail && (
              <InfoRow label="PayPal Email" value={application.paypalEmail} />
            )}
          </section>

          {/* Agreements */}
          <section className="bg-surface border border-border rounded-xl p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">Agreements</h3>
            {activeTemplates.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active agreements configured.</p>
            ) : (
              <div className="space-y-3">
                {activeTemplates.map((tmpl) => {
                  const signed = agreementByType[tmpl.type]
                  return (
                    <div
                      key={tmpl.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border ${
                        signed
                          ? 'border-green-500/20 bg-green-500/5'
                          : 'border-border bg-background/40'
                      }`}
                    >
                      <span className="mt-0.5 text-base leading-none">
                        {signed ? '✅' : '⬜'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{tmpl.title}</p>
                        <p className="text-xs text-muted-foreground font-mono">{tmpl.type}</p>
                        {signed ? (
                          <div className="mt-1 text-xs text-muted-foreground">
                            Signed as <span className="text-foreground font-medium">"{signed.signedName}"</span>
                            {' · '}
                            {new Date(signed.agreedAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                            {' · '}v{signed.version}
                          </div>
                        ) : (
                          <p className="mt-1 text-xs text-red-400">Not signed</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>

        {/* Right column — 40% */}
        <div className="lg:col-span-2 space-y-6">
          {/* Documents */}
          <section className="bg-surface border border-border rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Documents</h3>

            {!application.idFrontImage && !application.idBackImage && !application.selfieImage ? (
              <p className="text-sm text-muted-foreground">No documents uploaded.</p>
            ) : (
              <>
                {application.idFrontImage && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">ID Front</p>
                    <a href={application.idFrontImage} target="_blank" rel="noopener noreferrer">
                      <img
                        src={application.idFrontImage}
                        alt="ID Front"
                        className="w-full rounded-lg border border-border cursor-pointer hover:border-primary/50 transition-colors"
                      />
                    </a>
                  </div>
                )}
                {application.idBackImage && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">ID Back</p>
                    <a href={application.idBackImage} target="_blank" rel="noopener noreferrer">
                      <img
                        src={application.idBackImage}
                        alt="ID Back"
                        className="w-full rounded-lg border border-border cursor-pointer hover:border-primary/50 transition-colors"
                      />
                    </a>
                  </div>
                )}
                {application.selfieImage && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Selfie with ID</p>
                    <a href={application.selfieImage} target="_blank" rel="noopener noreferrer">
                      <img
                        src={application.selfieImage}
                        alt="Selfie with ID"
                        className="w-full rounded-lg border border-border cursor-pointer hover:border-primary/50 transition-colors"
                      />
                    </a>
                  </div>
                )}
              </>
            )}
          </section>

          {/* Admin Decision */}
          <section className="bg-surface border border-border rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Admin Decision</h3>
              <StatusBadge status={application.status} />
            </div>

            {actionError && (
              <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {actionError}
              </div>
            )}

            {isActionable && (
              <div className="space-y-2">
                {!application.kycCompleted && (
                  <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2.5 text-xs text-amber-400">
                    ⚠️ <span className="font-semibold">KYC documents not submitted.</span> This creator skipped identity verification. Store can be approved but will show as <span className="font-semibold">Unverified</span> to buyers.
                  </div>
                )}
                <button
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-green-500/15 text-green-400 hover:bg-green-500/25 border border-green-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ✅ Approve Application {!application.kycCompleted && '(Unverified)'}
                </button>
                <button
                  onClick={() => { setRejectModalOpen(true); setActionError('') }}
                  disabled={actionLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ❌ Reject Application
                </button>
              </div>
            )}

            {application.status === 'APPROVED' && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-green-500/10 border border-green-500/20">
                <span>✅</span>
                <div>
                  <p className="text-sm font-medium text-green-400">Approved</p>
                  {application.reviewedAt && (
                    <p className="text-xs text-muted-foreground">
                      on {new Date(application.reviewedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} by Admin
                    </p>
                  )}
                </div>
              </div>
            )}

            {application.status === 'REJECTED' && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
                <span className="mt-0.5">❌</span>
                <div>
                  <p className="text-sm font-medium text-red-400">Rejected</p>
                  {application.rejectionReason && (
                    <p className="text-xs text-muted-foreground mt-0.5">{application.rejectionReason}</p>
                  )}
                </div>
              </div>
            )}

            {/* Admin notes */}
            <div className="space-y-2 pt-2 border-t border-border">
              <label className="text-xs font-medium text-muted-foreground block">Admin Notes</label>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                rows={4}
                placeholder="Internal notes (not visible to creator)…"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary resize-y"
              />
              <button
                onClick={handleSaveNote}
                disabled={noteSaving}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-border text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                {noteSaving ? 'Saving…' : noteSaved ? '✓ Saved' : 'Save Note'}
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* Rejection Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setRejectModalOpen(false)}
          />
          <div className="relative z-10 bg-surface border border-border rounded-xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-base font-semibold text-foreground">Reject Application</h3>
              <button
                onClick={() => setRejectModalOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors text-lg leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleRejectSubmit} className="px-6 py-4 space-y-4">
              {actionError && (
                <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {actionError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Rejection Reason <span className="text-red-400">*</span>
                </label>
                <select
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                  required
                >
                  {REJECTION_REASONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Additional Notes <span className="text-muted-foreground/50">(optional)</span>
                </label>
                <textarea
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                  rows={3}
                  placeholder="Internal notes about this rejection…"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-border text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-500/90 transition-colors disabled:opacity-50"
                >
                  {actionLoading ? 'Rejecting…' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
