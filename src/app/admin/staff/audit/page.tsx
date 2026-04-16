import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { loadStaffActor, can } from '@/lib/staffPolicy'
import Link from 'next/link'
import { AuditCleanupButton } from './AuditCleanupButton'

const PAGE_SIZE = 50

interface SearchParams {
  q?: string
  entityType?: string
  page?: string
}

function buildUrl(sp: SearchParams, page: number): string {
  const params = new URLSearchParams()
  if (sp.q) params.set('q', sp.q)
  if (sp.entityType) params.set('entityType', sp.entityType)
  params.set('page', String(page))
  return `/admin/staff/audit?${params.toString()}`
}

function getPageNumbers(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | '…')[] = [1]
  if (current > 3) pages.push('…')
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) pages.push(p)
  if (current < total - 2) pages.push('…')
  if (total > 1) pages.push(total)
  return pages
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const session = await auth()
  const isMainAdmin = session && (session.user as any).role === 'ADMIN'
  let isSuperAdmin = isMainAdmin ?? false
  if (!isMainAdmin) {
    const actor = await loadStaffActor()
    if (!actor || (!actor.isSuperAdmin && !can(actor, 'staff.view'))) redirect('/admin/staff')
    isSuperAdmin = actor.isSuperAdmin
  }

  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page ?? '1', 10))
  const skip = (page - 1) * PAGE_SIZE
  const q = sp.q?.trim() ?? ''
  const entityTypeFilter = sp.entityType?.trim() ?? ''

  const where: Record<string, unknown> = {}
  if (q) where.OR = [{ action: { contains: q } }, { actorName: { contains: q } }, { entityLabel: { contains: q } }]
  if (entityTypeFilter) where.entityType = entityTypeFilter

  const [events, total, entityTypes] = await Promise.all([
    prisma.auditEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: PAGE_SIZE,
      include: { actor: { select: { id: true, name: true } } },
    }),
    prisma.auditEvent.count({ where }),
    prisma.auditEvent.groupBy({ by: ['entityType'], orderBy: { entityType: 'asc' } }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const rangeStart = skip + 1
  const rangeEnd = Math.min(skip + PAGE_SIZE, total)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Audit Log</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Append-only event log. {total.toLocaleString()} total events.
          </p>
        </div>
        {isSuperAdmin && <AuditCleanupButton />}
      </div>

      {/* Search + filter */}
      <form method="GET" className="flex flex-wrap gap-2">
        <input
          suppressHydrationWarning
          name="q"
          defaultValue={q}
          placeholder="Search action, actor, entity…"
          className="flex-1 min-w-48 px-3 py-2 rounded-lg bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-primary outline-none transition-colors"
        />
        <select
          suppressHydrationWarning
          name="entityType"
          defaultValue={entityTypeFilter}
          className="px-3 py-2 rounded-lg bg-surface border border-border text-sm text-foreground outline-none focus-visible:border-primary transition-colors"
        >
          <option value="">All entity types</option>
          {entityTypes.map((e) => (
            <option key={e.entityType} value={e.entityType}>{e.entityType}</option>
          ))}
        </select>
        <button type="submit" className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors">
          Filter
        </button>
        {(q || entityTypeFilter) && (
          <Link href="/admin/staff/audit" className="px-4 py-2 rounded-lg text-sm font-medium bg-border text-muted-foreground hover:text-foreground transition-colors">
            Clear
          </Link>
        )}
      </form>

      {/* Range indicator */}
      {total > 0 && (
        <p className="text-xs text-muted-foreground">
          Showing {rangeStart}–{rangeEnd} of {total.toLocaleString()} total events
        </p>
      )}

      {/* Table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background/40">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">When</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actor</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Action</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Entity</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">IP</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {events.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No audit events found.
                  </td>
                </tr>
              )}
              {events.map((e) => (
                <tr key={e.id} className="hover:bg-background/40 transition-colors">
                  <td className="px-4 py-3">
                    <code className="text-[11px] font-mono text-muted-foreground">#{e.id.slice(0, 8)}</code>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="text-xs text-foreground">
                      {new Date(e.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                    <p className="text-[11px] text-muted-foreground font-mono">
                      {new Date(e.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-medium text-foreground">{e.actorName}</p>
                    <p className="text-[11px] text-muted-foreground font-mono">id={e.actorId.slice(0, 8)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-primary/10 text-primary whitespace-nowrap">
                      {e.action}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-foreground">{e.entityType}</p>
                    <p className="text-[11px] text-muted-foreground">#{e.entityId.slice(0, 8)}</p>
                    {e.entityLabel && (
                      <p className="text-[11px] text-muted-foreground truncate max-w-[120px]" title={e.entityLabel}>{e.entityLabel}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[11px] font-mono text-muted-foreground">
                    {e.ipAddress ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <code className="text-[11px] font-mono text-muted-foreground">
                      {e.id.slice(0, 12)}…
                    </code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4">
          <Link
            href={page > 1 ? buildUrl(sp, page - 1) : '#'}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              page > 1
                ? 'bg-surface border border-border text-foreground hover:bg-border'
                : 'opacity-40 pointer-events-none bg-surface border border-border text-muted-foreground'
            }`}
          >
            ← Previous
          </Link>

          <div className="flex gap-1">
            {getPageNumbers(page, totalPages).map((p, i) =>
              p === '…' ? (
                <span key={`ellipsis-${i}`} className="px-2 py-1.5 text-xs text-muted-foreground">…</span>
              ) : (
                <Link
                  key={p}
                  href={buildUrl(sp, p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    p === page
                      ? 'bg-primary text-white'
                      : 'bg-surface border border-border text-foreground hover:bg-border'
                  }`}
                >
                  {p}
                </Link>
              )
            )}
          </div>

          <Link
            href={page < totalPages ? buildUrl(sp, page + 1) : '#'}
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
    </div>
  )
}
