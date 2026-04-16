import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

const PER_PAGE = 20

type AppStatus = 'ALL' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'DRAFT'

const TABS: { label: string; value: AppStatus; dbValue?: string }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Pending', value: 'SUBMITTED', dbValue: 'SUBMITTED' },
  { label: 'Under Review', value: 'UNDER_REVIEW', dbValue: 'UNDER_REVIEW' },
  { label: 'Approved', value: 'APPROVED', dbValue: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED', dbValue: 'REJECTED' },
  { label: 'Draft', value: 'DRAFT', dbValue: 'DRAFT' },
]

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'SUBMITTED':
      return (
        <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/20 text-yellow-400">
          ⏳ Pending
        </span>
      )
    case 'UNDER_REVIEW':
      return (
        <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-400">
          🔍 Under Review
        </span>
      )
    case 'APPROVED':
      return (
        <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-400">
          ✅ Approved
        </span>
      )
    case 'REJECTED':
      return (
        <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-400">
          ❌ Rejected
        </span>
      )
    default:
      return (
        <span className="px-2 py-0.5 rounded text-xs font-medium bg-border text-muted-foreground">
          Draft
        </span>
      )
  }
}

export default async function CreatorApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>
}) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/')

  const sp = await searchParams
  const activeTab = (sp.status?.toUpperCase() as AppStatus) || 'SUBMITTED'
  const page = Math.max(1, parseInt(sp.page ?? '1') || 1)

  // Default to showing SUBMITTED when no filter
  const statusFilter =
    activeTab === 'ALL'
      ? undefined
      : activeTab === 'SUBMITTED' && !sp.status
      ? 'SUBMITTED'
      : activeTab

  const where = statusFilter ? { status: statusFilter } : {}

  const [statusCountsRaw, total, applications] = await Promise.all([
    prisma.creatorApplication.groupBy({
      by: ['status'],
      _count: { id: true },
    }),
    prisma.creatorApplication.count({ where }),
    prisma.creatorApplication.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
      },
      orderBy: [
        // Prioritize active statuses first
        { submittedAt: 'desc' },
        { createdAt: 'desc' },
      ],
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
  ])

  const countMap: Record<string, number> = {}
  let totalAll = 0
  for (const row of statusCountsRaw) {
    countMap[row.status] = row._count.id
    totalAll += row._count.id
  }

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))

  function buildHref(tab: AppStatus, p = 1) {
    const params = new URLSearchParams()
    if (tab !== 'ALL') params.set('status', tab)
    if (p > 1) params.set('page', String(p))
    const q = params.toString()
    return `/admin/creators/applications${q ? `?${q}` : ''}`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">Creator Applications</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Review and process creator onboarding applications.
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 flex-wrap">
        {TABS.map((tab) => {
          const count = tab.value === 'ALL' ? totalAll : (countMap[tab.value] ?? 0)
          const isActive =
            tab.value === activeTab ||
            (tab.value === 'SUBMITTED' && !sp.status)

          return (
            <Link
              key={tab.value}
              href={buildHref(tab.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-white'
                  : 'bg-surface border border-border text-muted-foreground hover:text-foreground hover:border-border/80'
              }`}
            >
              {tab.label}
              <span
                className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-border text-muted-foreground'
                }`}
              >
                {count}
              </span>
            </Link>
          )
        })}
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background/40">
                <th className="text-left px-4 py-3 text-xs uppercase text-muted-foreground font-semibold tracking-wide">Name</th>
                <th className="text-left px-4 py-3 text-xs uppercase text-muted-foreground font-semibold tracking-wide">Email</th>
                <th className="text-left px-4 py-3 text-xs uppercase text-muted-foreground font-semibold tracking-wide">Username</th>
                <th className="text-left px-4 py-3 text-xs uppercase text-muted-foreground font-semibold tracking-wide">Submitted</th>
                <th className="text-left px-4 py-3 text-xs uppercase text-muted-foreground font-semibold tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs uppercase text-muted-foreground font-semibold tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr
                  key={app.id}
                  className="border-b border-border last:border-0 hover:bg-background/30 transition-colors"
                >
                  <td className="py-3 px-4">
                    <div>
                      <p className="text-foreground font-medium">
                        {app.displayName || app.user.name || '—'}
                      </p>
                      {app.legalFullName && app.legalFullName !== app.displayName && (
                        <p className="text-muted-foreground text-xs">{app.legalFullName}</p>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground text-xs">{app.user.email}</td>
                  <td className="py-3 px-4">
                    {app.username ? (
                      <span className="text-muted-foreground font-mono text-xs">@{app.username}</span>
                    ) : (
                      <span className="text-muted-foreground/40 text-xs">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-muted-foreground text-xs">
                    {app.submittedAt
                      ? new Date(app.submittedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })
                      : '—'}
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={app.status} />
                  </td>
                  <td className="py-3 px-4">
                    <Link
                      href={`/admin/creators/applications/${app.id}`}
                      className="px-2 py-0.5 rounded text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                    >
                      Review →
                    </Link>
                  </td>
                </tr>
              ))}
              {applications.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-muted-foreground text-sm">
                    No applications found.
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
              Page {page} of {totalPages} · {total} total
            </p>
            <div className="flex items-center gap-2">
              {page > 1 ? (
                <Link
                  href={buildHref(activeTab, page - 1)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-border text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Previous
                </Link>
              ) : (
                <span className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground/40 cursor-not-allowed">
                  ← Previous
                </span>
              )}
              {page < totalPages ? (
                <Link
                  href={buildHref(activeTab, page + 1)}
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
