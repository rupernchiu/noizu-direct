import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

const PER_PAGE = 20

interface SearchParams {
  type?: string
  status?: string
  page?: string
}

export default async function AdminEmailsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/')

  const params = await searchParams
  const type = params.type ?? undefined
  const status = params.status ?? undefined
  const page = Math.max(1, parseInt(params.page ?? '1') || 1)
  const skip = (page - 1) * PER_PAGE

  const where: any = {}
  if (type) where.type = type
  if (status) where.status = status

  const [total, logs, types] = await Promise.all([
    prisma.emailLog.count({ where }),
    prisma.emailLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: PER_PAGE,
      select: {
        id: true,
        to: true,
        subject: true,
        type: true,
        status: true,
        resendId: true,
        error: true,
        createdAt: true,
      },
    }),
    prisma.emailLog.groupBy({ by: ['type'], orderBy: { type: 'asc' } }),
  ])

  const start = skip + 1
  const end = Math.min(skip + logs.length, total)

  const buildUrl = (overrides: Record<string, string | undefined>) => {
    const p: Record<string, string> = {}
    if (type) p.type = type
    if (status) p.status = status
    if (page > 1) p.page = String(page)
    Object.assign(p, overrides)
    for (const key of Object.keys(p)) {
      if (p[key] === undefined) delete p[key]
    }
    const qs = new URLSearchParams(p).toString()
    return `/admin/emails${qs ? `?${qs}` : ''}`
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          Email Log{' '}
          <span className="text-sm font-normal text-muted-foreground">({total})</span>
        </h2>
      </div>

      {/* Filters */}
      <form method="GET" action="/admin/emails" className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground font-medium">Type</label>
          <select
            name="type"
            defaultValue={type ?? ''}
            className="rounded-lg border border-border bg-card text-foreground text-sm px-3 py-2 focus:outline-none focus:border-primary"
          >
            <option value="">All Types</option>
            {types.map((t) => (
              <option key={t.type} value={t.type}>
                {t.type}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground font-medium">Status</label>
          <select
            name="status"
            defaultValue={status ?? ''}
            className="rounded-lg border border-border bg-card text-foreground text-sm px-3 py-2 focus:outline-none focus:border-primary"
          >
            <option value="">All</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <button
          type="submit"
          className="rounded-lg bg-primary text-white text-sm font-medium px-4 py-2 hover:bg-primary/90 transition-colors"
        >
          Filter
        </button>

        <Link
          href="/admin/emails"
          className="rounded-lg border border-border text-muted-foreground text-sm font-medium px-4 py-2 hover:text-foreground hover:border-primary/40 transition-colors"
        >
          Clear
        </Link>
      </form>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm [&_td]:whitespace-nowrap">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">To</th>
                <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">Subject</th>
                <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">Type</th>
                <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">Status</th>
                <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">Resend ID</th>
                <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-border last:border-0 hover:bg-surface">
                  <td className="px-3 py-1.5 text-foreground text-xs max-w-[160px] truncate">
                    {log.to}
                  </td>
                  <td className="px-3 py-1.5 text-muted-foreground text-xs max-w-[200px] truncate">
                    {log.subject}
                  </td>
                  <td className="px-3 py-1.5 text-xs">
                    <span className="px-2 py-0.5 rounded bg-border text-muted-foreground font-medium">
                      {log.type}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-xs">
                    {log.status === 'sent' ? (
                      <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-400 font-medium">
                        sent
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-medium" title={log.error ?? undefined}>
                        failed
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-muted-foreground text-xs font-mono">
                    {log.resendId ? log.resendId.slice(0, 16) + '…' : <span className="text-muted-foreground/40">—</span>}
                  </td>
                  <td className="px-3 py-1.5 text-muted-foreground text-xs whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No email logs match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {start}–{end} of {total} email{total !== 1 ? 's' : ''}
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link
                href={buildUrl({ page: String(page - 1) })}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:text-foreground hover:border-primary/40 transition-colors"
              >
                Previous
              </Link>
            ) : (
              <span className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium opacity-40 cursor-not-allowed">
                Previous
              </span>
            )}
            {end < total ? (
              <Link
                href={buildUrl({ page: String(page + 1) })}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:text-foreground hover:border-primary/40 transition-colors"
              >
                Next
              </Link>
            ) : (
              <span className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium opacity-40 cursor-not-allowed">
                Next
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
