'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export interface TemplateRow {
  id: string
  type: string
  version: string
  title: string
  isActive: boolean
  publishedAt: string | null
  signedCount: number
  totalCreators: number
}

interface Props {
  templates: TemplateRow[]
  totalCreators: number
}

const AGREEMENT_TYPES = [
  'CREATOR_TOS',
  'IP_DECLARATION',
  'PAYMENT_TERMS',
  'PRIVACY_POLICY',
  'COMMUNITY_GUIDELINES',
]

function formatType(type: string) {
  return type.replace(/_/g, ' ')
}

interface PublishForm {
  type: string
  version: string
  title: string
  effectiveDate: string
  summary: string
  content: string
  changeLog: string
}

const EMPTY_FORM: PublishForm = {
  type: '',
  version: '',
  title: '',
  effectiveDate: '',
  summary: '',
  content: '',
  changeLog: '',
}

export function AdminAgreementsClient({ templates, totalCreators }: Props) {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<PublishForm>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  function openModal(prefillType?: string) {
    setForm({ ...EMPTY_FORM, type: prefillType ?? '' })
    setError('')
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setError('')
  }

  function set(field: keyof PublishForm, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.type || !form.version || !form.title || !form.effectiveDate || !form.summary || !form.content) {
      setError('Please fill in all required fields.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/admin/agreements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: form.type,
          version: form.version,
          title: form.title,
          effectiveDate: form.effectiveDate,
          summary: form.summary,
          content: form.content,
          changeLog: form.changeLog || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Failed to publish agreement.')
        return
      }
      closeModal()
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {/* Table card */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Agreement Types</h3>
          <button
            onClick={() => openModal()}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-white hover:bg-primary/90 transition-colors"
          >
            + Publish New Version
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm [&_td]:whitespace-nowrap">
            <thead>
              <tr className="border-b border-border bg-background/40">
                <th className="text-left px-3 py-1.5 text-xs uppercase text-muted-foreground font-semibold tracking-wide">Type</th>
                <th className="text-left px-3 py-1.5 text-xs uppercase text-muted-foreground font-semibold tracking-wide">Title</th>
                <th className="text-left px-3 py-1.5 text-xs uppercase text-muted-foreground font-semibold tracking-wide">Version</th>
                <th className="text-left px-3 py-1.5 text-xs uppercase text-muted-foreground font-semibold tracking-wide">Status</th>
                <th className="text-left px-3 py-1.5 text-xs uppercase text-muted-foreground font-semibold tracking-wide">Signed</th>
                <th className="text-left px-3 py-1.5 text-xs uppercase text-muted-foreground font-semibold tracking-wide">Last Published</th>
                <th className="text-left px-3 py-1.5 text-xs uppercase text-muted-foreground font-semibold tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => {
                const pct = totalCreators > 0 ? Math.round((t.signedCount / totalCreators) * 100) : 0
                return (
                  <tr key={t.id} className="border-b border-border last:border-0 hover:bg-background/30 transition-colors">
                    <td className="py-1.5 px-3">
                      <span className="font-mono text-xs text-muted-foreground">{t.type}</span>
                    </td>
                    <td className="py-1.5 px-3 text-foreground font-medium max-w-xs truncate">{t.title}</td>
                    <td className="py-1.5 px-3">
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-border text-muted-foreground">
                        v{t.version}
                      </span>
                    </td>
                    <td className="py-1.5 px-3">
                      {t.isActive ? (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-400">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-border text-muted-foreground">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 px-3">
                      <div className="flex items-center gap-2 min-w-[140px]">
                        <span className="text-foreground text-xs whitespace-nowrap">
                          {t.signedCount}/{totalCreators} ({pct}%)
                        </span>
                        <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden min-w-[60px]">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-1.5 px-3 text-muted-foreground text-xs">
                      {t.publishedAt
                        ? new Date(t.publishedAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })
                        : '—'}
                    </td>
                    <td className="py-1.5 px-3">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/agreements/${t.id}`}
                          className="px-2 py-0.5 rounded text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                        >
                          View →
                        </Link>
                        <button
                          onClick={() => openModal(t.type)}
                          className="px-2 py-0.5 rounded text-xs font-medium bg-border text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
                        >
                          New Version
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {templates.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-muted-foreground text-sm">
                    No agreement templates yet. Publish your first version to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Publish Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeModal}
          />

          {/* Modal panel */}
          <div className="relative z-10 bg-surface border border-border rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <h3 className="text-base font-semibold text-foreground">Publish New Agreement Version</h3>
              <button
                onClick={closeModal}
                className="text-muted-foreground hover:text-foreground transition-colors text-lg leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
                {error && (
                  <div id="agreement-error" role="alert" className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {/* Type */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Agreement Type <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={form.type}
                      onChange={(e) => set('type', e.target.value)}
                      aria-invalid={!!error || undefined}
                      aria-describedby={error ? 'agreement-error' : undefined}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                      required
                    >
                      <option value="">Select type…</option>
                      {AGREEMENT_TYPES.map((t) => (
                        <option key={t} value={t}>{formatType(t)}</option>
                      ))}
                    </select>
                  </div>

                  {/* Version */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Version <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.version}
                      onChange={(e) => set('version', e.target.value)}
                      aria-invalid={!!error || undefined}
                      aria-describedby={error ? 'agreement-error' : undefined}
                      placeholder="e.g. 1.0, 2.1"
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary"
                      required
                    />
                  </div>
                </div>

                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Title <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => set('title', e.target.value)}
                    aria-invalid={!!error || undefined}
                    aria-describedby={error ? 'agreement-error' : undefined}
                    placeholder="e.g. Creator Terms of Service"
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary"
                    required
                  />
                </div>

                {/* Effective Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Effective Date <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.effectiveDate}
                    onChange={(e) => set('effectiveDate', e.target.value)}
                    aria-invalid={!!error || undefined}
                    aria-describedby={error ? 'agreement-error' : undefined}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                    required
                  />
                </div>

                {/* Summary */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Summary <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={form.summary}
                    onChange={(e) => set('summary', e.target.value)}
                    aria-invalid={!!error || undefined}
                    aria-describedby={error ? 'agreement-error' : undefined}
                    placeholder="Plain-language summary shown to creators before signing…"
                    rows={3}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary resize-y"
                    required
                  />
                </div>

                {/* Content */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Full Agreement Content <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={form.content}
                    onChange={(e) => set('content', e.target.value)}
                    aria-invalid={!!error || undefined}
                    aria-describedby={error ? 'agreement-error' : undefined}
                    placeholder="Full legal text of the agreement…"
                    rows={12}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary resize-y"
                    required
                  />
                </div>

                {/* Changelog */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    What Changed <span className="text-muted-foreground/50">(optional)</span>
                  </label>
                  <textarea
                    value={form.changeLog}
                    onChange={(e) => set('changeLog', e.target.value)}
                    aria-invalid={!!error || undefined}
                    aria-describedby={error ? 'agreement-error' : undefined}
                    placeholder="Describe changes from the previous version…"
                    rows={3}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary resize-y"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border shrink-0">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-border text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Publishing…' : 'Publish Agreement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
