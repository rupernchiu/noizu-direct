'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface AgreementTemplate {
  id: string
  type: string
  version: string
  title: string
  content: string
  summary: string
  changeLog: string | null
  effectiveDate: string
  isActive: boolean
  publishedAt: string | null
  createdAt: string
}

interface SigningRecord {
  id: string
  signedName: string
  agreementVersion: string
  agreedAt: string
  ipAddress: string
  userName: string
  userEmail: string
}

interface UnsignedCreator {
  id: string
  name: string
  email: string
  memberSince: string
}

interface Props {
  template: AgreementTemplate
  signingRecords: SigningRecord[]
  totalSigned: number
  totalCreators: number
  page: number
  totalPages: number
  unsignedCreators: UnsignedCreator[]
}

export function AgreementDetailClient({
  template,
  signingRecords,
  totalSigned,
  totalCreators,
  page,
  totalPages,
  unsignedCreators,
}: Props) {
  const router = useRouter()
  const [toggling, setToggling] = useState(false)
  const [forceSigning, setForceSigning] = useState<string | null>(null) // userId being force-signed
  const [forceError, setForceError] = useState<Record<string, string>>({})

  async function toggleActive() {
    setToggling(true)
    try {
      await fetch(`/api/admin/agreements/${template.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !template.isActive }),
      })
      router.refresh()
    } finally {
      setToggling(false)
    }
  }

  async function forceSign(userId: string) {
    setForceSigning(userId)
    setForceError((e) => { const n = { ...e }; delete n[userId]; return n })
    try {
      const res = await fetch('/api/admin/agreements/force-sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, templateId: template.id }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setForceError((e) => ({ ...e, [userId]: data.error ?? 'Failed' }))
        return
      }
      router.refresh()
    } catch {
      setForceError((e) => ({ ...e, [userId]: 'Network error' }))
    } finally {
      setForceSigning(null)
    }
  }

  function exportCSV() {
    const header = 'Creator,Email,Signed Name,Version,Signed At,IP Address'
    const rows = signingRecords.map((r) =>
      [
        `"${r.userName.replace(/"/g, '""')}"`,
        `"${r.userEmail.replace(/"/g, '""')}"`,
        `"${r.signedName.replace(/"/g, '""')}"`,
        `"${r.agreementVersion}"`,
        `"${new Date(r.agreedAt).toLocaleString()}"`,
        `"${r.ipAddress}"`,
      ].join(',')
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `agreement-${template.type}-v${template.version}-signings.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const prevPage = page > 1 ? page - 1 : null
  const nextPage = page < totalPages ? page + 1 : null
  const compliancePct = totalCreators > 0 ? Math.round((totalSigned / totalCreators) * 100) : 100

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <Link
              href="/admin/agreements"
              className="text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              ← Agreements
            </Link>
            <span className="text-muted-foreground">/</span>
            <h2 className="text-lg font-semibold text-foreground">{template.title}</h2>
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-border text-muted-foreground">
              v{template.version}
            </span>
            {template.isActive ? (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-400">
                Active
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-border text-muted-foreground">
                Inactive
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 font-mono">{template.type}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleActive}
            disabled={toggling}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
              template.isActive
                ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20'
                : 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20'
            }`}
          >
            {toggling ? 'Updating…' : template.isActive ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      </div>

      {/* Meta row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Effective Date', value: new Date(template.effectiveDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) },
          { label: 'Published', value: template.publishedAt ? new Date(template.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Not published' },
          { label: 'Created', value: new Date(template.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) },
          { label: 'Compliance', value: `${totalSigned}/${totalCreators} (${compliancePct}%)` },
        ].map(({ label, value }) => (
          <div key={label} className="bg-surface border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">{label}</p>
            <p className="text-sm font-medium text-foreground mt-1">{value}</p>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="bg-surface border border-border rounded-xl p-6 space-y-2">
        <h3 className="text-sm font-semibold text-foreground">Summary</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{template.summary}</p>
      </div>

      {/* What Changed */}
      {template.changeLog && (
        <div className="bg-surface border border-border rounded-xl p-6 space-y-2">
          <h3 className="text-sm font-semibold text-foreground">What Changed</h3>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{template.changeLog}</p>
        </div>
      )}

      {/* Full content */}
      <div className="bg-surface border border-border rounded-xl p-6 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Full Agreement Content</h3>
        <div className="font-mono text-sm bg-background rounded-lg p-4 max-h-96 overflow-y-auto border border-border text-foreground whitespace-pre-wrap leading-relaxed">
          {template.content}
        </div>
      </div>

      {/* Unsigned creators */}
      {unsignedCreators.length > 0 && (
        <div className="bg-surface border border-red-500/20 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Unsigned Creators</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {unsignedCreators.length} creator{unsignedCreators.length !== 1 ? 's' : ''} have not signed this agreement
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm [&_td]:whitespace-nowrap">
              <thead>
                <tr className="border-b border-border bg-background/40">
                  <th className="text-left px-3 py-1.5 text-xs uppercase text-muted-foreground font-semibold tracking-wide">Creator</th>
                  <th className="text-left px-3 py-1.5 text-xs uppercase text-muted-foreground font-semibold tracking-wide">Email</th>
                  <th className="text-left px-3 py-1.5 text-xs uppercase text-muted-foreground font-semibold tracking-wide">Member Since</th>
                  <th className="text-left px-3 py-1.5 text-xs uppercase text-muted-foreground font-semibold tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {unsignedCreators.map((u) => (
                  <tr key={u.id} className="border-b border-border last:border-0 hover:bg-background/30 transition-colors">
                    <td className="py-1.5 px-3 text-foreground font-medium">{u.name}</td>
                    <td className="py-1.5 px-3 text-muted-foreground text-xs">{u.email}</td>
                    <td className="py-1.5 px-3 text-muted-foreground text-xs">
                      {new Date(u.memberSince).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="py-1.5 px-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => forceSign(u.id)}
                          disabled={forceSigning === u.id}
                          className="px-2 py-1 rounded text-xs font-medium bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 transition-colors disabled:opacity-50"
                        >
                          {forceSigning === u.id ? 'Signing…' : 'Force Sign'}
                        </button>
                        {forceError[u.id] && (
                          <span className="text-xs text-red-400">{forceError[u.id]}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Signing records */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Signing Records</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{totalSigned} total signatures</p>
          </div>
          <button
            onClick={exportCSV}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-border text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
          >
            Export CSV
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm [&_td]:whitespace-nowrap">
            <thead>
              <tr className="border-b border-border bg-background/40">
                <th className="text-left px-3 py-1.5 text-xs uppercase text-muted-foreground font-semibold tracking-wide">Creator</th>
                <th className="text-left px-3 py-1.5 text-xs uppercase text-muted-foreground font-semibold tracking-wide">Email</th>
                <th className="text-left px-3 py-1.5 text-xs uppercase text-muted-foreground font-semibold tracking-wide">Signed Name</th>
                <th className="text-left px-3 py-1.5 text-xs uppercase text-muted-foreground font-semibold tracking-wide">Version</th>
                <th className="text-left px-3 py-1.5 text-xs uppercase text-muted-foreground font-semibold tracking-wide">Signed At</th>
                <th className="text-left px-3 py-1.5 text-xs uppercase text-muted-foreground font-semibold tracking-wide">IP Address</th>
              </tr>
            </thead>
            <tbody>
              {signingRecords.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-background/30 transition-colors">
                  <td className="py-1.5 px-3 text-foreground font-medium">{r.userName}</td>
                  <td className="py-1.5 px-3 text-muted-foreground text-xs">{r.userEmail}</td>
                  <td className="py-1.5 px-3 text-foreground">{r.signedName}</td>
                  <td className="py-1.5 px-3">
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-border text-muted-foreground">
                      v{r.agreementVersion}
                    </span>
                  </td>
                  <td className="py-1.5 px-3 text-muted-foreground text-xs">
                    {new Date(r.agreedAt).toLocaleString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="py-1.5 px-3 text-muted-foreground font-mono text-xs">{r.ipAddress}</td>
                </tr>
              ))}
              {signingRecords.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-muted-foreground text-sm">
                    No signatures recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Page {page} of {totalPages} · {totalSigned} total
            </p>
            <div className="flex items-center gap-2">
              {prevPage ? (
                <Link
                  href={`?page=${prevPage}`}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-border text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Previous
                </Link>
              ) : (
                <span className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground/40 cursor-not-allowed">
                  ← Previous
                </span>
              )}
              {nextPage ? (
                <Link
                  href={`?page=${nextPage}`}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-border text-muted-foreground hover:text-foreground transition-colors"
                >
                  Next →
                </Link>
              ) : (
                <span className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground/40 cursor-not-allowed">
                  Next →
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
