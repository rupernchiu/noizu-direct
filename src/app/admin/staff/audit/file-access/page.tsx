import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { requireAdminOrStaffActor } from '@/lib/staffPolicy'
import {
  ACCESS_REASON_CODES,
  ACCESS_REASON_LABELS,
  type AccessReasonCode,
} from '@/lib/private-file-audit'

const PAGE_SIZE = 50
const CATEGORIES = ['identity', 'dispute-evidence', 'message-attachment', 'kyc'] as const
const ACTOR_TYPES = ['STAFF', 'OWNER', 'SYSTEM'] as const

interface SearchParams {
  page?: string
  actorType?: string
  category?: string
  targetUserId?: string
  reasonCode?: string
  from?: string
  to?: string
}

function fmtDateTime(d: Date | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function buildQuery(sp: SearchParams, overrides: Partial<SearchParams> = {}): string {
  const merged = { ...sp, ...overrides }
  const params = new URLSearchParams()
  if (merged.page) params.set('page', merged.page)
  if (merged.actorType) params.set('actorType', merged.actorType)
  if (merged.category) params.set('category', merged.category)
  if (merged.targetUserId) params.set('targetUserId', merged.targetUserId)
  if (merged.reasonCode) params.set('reasonCode', merged.reasonCode)
  if (merged.from) params.set('from', merged.from)
  if (merged.to) params.set('to', merged.to)
  const q = params.toString()
  return `/admin/staff/audit/file-access${q ? `?${q}` : ''}`
}

function parseDate(raw: string | undefined, endOfDay = false): Date | null {
  if (!raw) return null
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return null
  if (endOfDay) d.setHours(23, 59, 59, 999)
  else d.setHours(0, 0, 0, 0)
  return d
}

function truncateKey(key: string): string {
  if (key.length <= 40) return key
  return `${key.slice(0, 20)}…${key.slice(-16)}`
}

function actorBadgeClass(type: string): string {
  if (type === 'STAFF') return 'bg-primary/15 text-primary'
  if (type === 'OWNER') return 'bg-amber-500/15 text-amber-400'
  if (type === 'SYSTEM') return 'bg-border text-muted-foreground'
  return 'bg-border text-muted-foreground'
}

export default async function FileAccessAuditPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  await requireAdminOrStaffActor('files.audit')

  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)
  const skip = (page - 1) * PAGE_SIZE

  const actorType = sp.actorType?.trim() ?? ''
  const category = sp.category?.trim() ?? ''
  const targetUserId = sp.targetUserId?.trim() ?? ''
  const reasonCode = sp.reasonCode?.trim() ?? ''
  const from = parseDate(sp.from)
  const to = parseDate(sp.to, true)

  const where: Record<string, unknown> = {}
  if (actorType) where.actorType = actorType
  if (category) where.category = category
  if (targetUserId) where.targetUserId = targetUserId
  if (reasonCode) where.reasonCode = reasonCode
  if (from || to) {
    const range: Record<string, Date> = {}
    if (from) range.gte = from
    if (to) range.lte = to
    where.accessedAt = range
  }

  const [events, total] = await Promise.all([
    prisma.privateFileAccess.findMany({
      where,
      orderBy: { accessedAt: 'desc' },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.privateFileAccess.count({ where }),
  ])

  // Batch-lookup target users
  const targetIds = Array.from(new Set(events.map((e) => e.targetUserId).filter((v): v is string => !!v)))
  const targetUsers = targetIds.length
    ? await prisma.user.findMany({
        where: { id: { in: targetIds } },
        select: { id: true, email: true, name: true },
      })
    : []
  const targetById = new Map(targetUsers.map((u) => [u.id, u]))

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const rangeStart = total === 0 ? 0 : skip + 1
  const rangeEnd = Math.min(skip + PAGE_SIZE, total)

  const hasFilters =
    !!actorType || !!category || !!targetUserId || !!reasonCode || !!sp.from || !!sp.to

  const inputClass =
    'px-3 py-2 rounded-lg bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:border-primary transition-colors'

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Private File Access Log</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Every read of a private bucket file (KYC image, dispute evidence, message attachment).
            {' '}{total.toLocaleString()} total access events.
          </p>
        </div>
      </div>

      {/* Filters */}
      <form method="GET" className="bg-surface border border-border rounded-xl p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Filters</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <select name="actorType" defaultValue={actorType} className={inputClass}>
            <option value="">All actor types</option>
            {ACTOR_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select name="category" defaultValue={category} className={inputClass}>
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select name="reasonCode" defaultValue={reasonCode} className={inputClass}>
            <option value="">All reason codes</option>
            {ACCESS_REASON_CODES.map((code) => (
              <option key={code} value={code}>
                {code} — {ACCESS_REASON_LABELS[code as AccessReasonCode]}
              </option>
            ))}
          </select>
          <input
            type="text"
            name="targetUserId"
            defaultValue={targetUserId}
            placeholder="Target user ID"
            className={inputClass}
          />
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground shrink-0">From</label>
            <input type="date" name="from" defaultValue={sp.from ?? ''} className={`${inputClass} flex-1`} />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground shrink-0">To</label>
            <input type="date" name="to" defaultValue={sp.to ?? ''} className={`${inputClass} flex-1`} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors"
          >
            Apply
          </button>
          {hasFilters && (
            <Link
              href="/admin/staff/audit/file-access"
              className="px-4 py-2 rounded-lg text-sm font-medium bg-border text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear
            </Link>
          )}
        </div>
      </form>

      {total > 0 && (
        <p className="text-xs text-muted-foreground">
          Showing {rangeStart}–{rangeEnd} of {total.toLocaleString()}
        </p>
      )}

      {/* Table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm [&_td]:whitespace-nowrap">
            <thead>
              <tr className="border-b border-border bg-background/40">
                <th className="px-3 py-1.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Accessed at</th>
                <th className="px-3 py-1.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Actor</th>
                <th className="px-3 py-1.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Target user</th>
                <th className="px-3 py-1.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Category</th>
                <th className="px-3 py-1.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">r2Key</th>
                <th className="px-3 py-1.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Reason</th>
                <th className="px-3 py-1.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Note</th>
                <th className="px-3 py-1.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {events.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No file access events found.
                  </td>
                </tr>
              )}
              {events.map((e) => {
                const target = e.targetUserId ? targetById.get(e.targetUserId) : null
                return (
                  <tr key={e.id} className="hover:bg-background/40 transition-colors">
                    <td className="px-3 py-1.5">
                      <p className="text-xs text-foreground">
                        {new Date(e.accessedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                      <p className="text-[11px] font-mono text-muted-foreground">
                        {new Date(e.accessedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </p>
                    </td>
                    <td className="px-3 py-1.5">
                      <p className="text-xs font-medium text-foreground">{e.actorName}</p>
                      <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium ${actorBadgeClass(e.actorType)}`}>
                        {e.actorType}
                      </span>
                    </td>
                    <td className="px-3 py-1.5">
                      {target ? (
                        <>
                          <p className="text-xs text-foreground">{target.name || '—'}</p>
                          <Link
                            href={buildQuery(sp, { targetUserId: target.id, page: undefined })}
                            className="text-[11px] text-primary hover:underline font-mono"
                          >
                            {target.email}
                          </Link>
                        </>
                      ) : e.targetUserId ? (
                        <code className="text-[11px] font-mono text-muted-foreground">{e.targetUserId.slice(0, 10)}…</code>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-1.5">
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-border text-muted-foreground">
                        {e.category}
                      </span>
                    </td>
                    <td className="px-3 py-1.5">
                      <code className="text-[11px] font-mono text-muted-foreground" title={e.r2Key}>
                        {truncateKey(e.r2Key)}
                      </code>
                    </td>
                    <td className="px-3 py-1.5">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-primary/10 text-primary">
                        {e.reasonCode}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 max-w-[200px]">
                      {e.reasonNote ? (
                        <span
                          className="text-[11px] text-muted-foreground block truncate"
                          title={e.reasonNote}
                        >
                          {e.reasonNote}
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground/40">—</span>
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-[11px] font-mono text-muted-foreground">
                      {e.ipAddress ?? '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4">
          <Link
            href={page > 1 ? buildQuery(sp, { page: String(page - 1) }) : '#'}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              page > 1
                ? 'bg-surface border border-border text-foreground hover:bg-border'
                : 'opacity-40 pointer-events-none bg-surface border border-border text-muted-foreground'
            }`}
          >
            ← Previous
          </Link>
          <p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p>
          <Link
            href={page < totalPages ? buildQuery(sp, { page: String(page + 1) }) : '#'}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              page < totalPages
                ? 'bg-surface border border-border text-foreground hover:bg-border'
                : 'opacity-40 pointer-events-none bg-surface border border-border text-muted-foreground'
            }`}
          >
            Next →
          </Link>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        Tip: click a target user email to filter by that user only. Audit rows are append-only.
      </p>
    </div>
  )
}

export const metadata = {
  title: 'Private File Access Log · noizu.direct Admin',
}
