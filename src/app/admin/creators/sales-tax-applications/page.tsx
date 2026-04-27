/**
 * Phase 7 — Admin queue for creator sales-tax collection requests.
 *
 * Lists CreatorProfile rows with `salesTaxStatus = 'REQUESTED'` and renders
 * approve / reject actions. State machine:
 *
 *   NONE ──(creator submits)──→ REQUESTED ──(admin approves)──→ APPROVED
 *                                          ──(admin rejects)──→ REJECTED
 *   REJECTED ──(creator re-submits)──→ REQUESTED
 *
 * Approval also flips `collectsSalesTax = true`, which is the gate that
 * actually activates collection at order time (see Phase 8 application logic
 * for `creatorSalesTaxAmountUsd`).
 */
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { SalesTaxApplicationActions } from './SalesTaxApplicationActions'

export const dynamic = 'force-dynamic'

const PER_PAGE = 25

type TabValue = 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'ALL'

const TABS: { label: string; value: TabValue }[] = [
  { label: 'Pending', value: 'REQUESTED' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'All', value: 'ALL' },
]

export default async function SalesTaxApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>
}) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/')

  const sp = await searchParams
  const activeTab = (sp.status?.toUpperCase() as TabValue) || 'REQUESTED'
  const page = Math.max(1, parseInt(sp.page ?? '1') || 1)

  const where =
    activeTab === 'ALL'
      ? { salesTaxStatus: { in: ['REQUESTED', 'APPROVED', 'REJECTED'] } }
      : { salesTaxStatus: activeTab }

  const [counts, total, rows] = await Promise.all([
    prisma.creatorProfile.groupBy({
      by: ['salesTaxStatus'],
      _count: { id: true },
    }),
    prisma.creatorProfile.count({ where }),
    prisma.creatorProfile.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: [
        { salesTaxApprovedAt: 'desc' },
        { createdAt: 'desc' },
      ],
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
  ])

  const countMap: Record<string, number> = {}
  for (const c of counts) countMap[c.salesTaxStatus] = c._count.id
  const totalAll =
    (countMap.REQUESTED ?? 0) + (countMap.APPROVED ?? 0) + (countMap.REJECTED ?? 0)
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))

  function buildHref(tab: TabValue, p = 1) {
    const params = new URLSearchParams()
    if (tab !== 'REQUESTED') params.set('status', tab)
    if (p > 1) params.set('page', String(p))
    const q = params.toString()
    return `/admin/creators/sales-tax-applications${q ? `?${q}` : ''}`
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Sales tax applications</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Review creators who have requested noizu.direct collect their SST/GST/VAT/PPN at
          checkout. Approval flips the collection flag — the next order they receive snapshots the
          configured rate.
        </p>
      </div>

      <div className="flex items-center gap-1 flex-wrap">
        {TABS.map((tab) => {
          const count =
            tab.value === 'ALL' ? totalAll : countMap[tab.value] ?? 0
          const isActive = tab.value === activeTab
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

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background/40">
                <th className="text-left px-3 py-2 text-xs uppercase text-muted-foreground font-semibold tracking-wide">Creator</th>
                <th className="text-left px-3 py-2 text-xs uppercase text-muted-foreground font-semibold tracking-wide">Country</th>
                <th className="text-left px-3 py-2 text-xs uppercase text-muted-foreground font-semibold tracking-wide">Tax ID</th>
                <th className="text-left px-3 py-2 text-xs uppercase text-muted-foreground font-semibold tracking-wide">Label</th>
                <th className="text-left px-3 py-2 text-xs uppercase text-muted-foreground font-semibold tracking-wide">Rate</th>
                <th className="text-left px-3 py-2 text-xs uppercase text-muted-foreground font-semibold tracking-wide">Submitted</th>
                <th className="text-left px-3 py-2 text-xs uppercase text-muted-foreground font-semibold tracking-wide">Status</th>
                <th className="text-left px-3 py-2 text-xs uppercase text-muted-foreground font-semibold tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const ratePct = row.salesTaxRate != null ? `${(row.salesTaxRate * 100).toFixed(2)}%` : '—'
                return (
                  <tr key={row.id} className="border-b border-border last:border-0 hover:bg-background/30">
                    <td className="py-2 px-3">
                      <p className="text-foreground font-medium">
                        {row.displayName || row.user.name || '—'}
                      </p>
                      <p className="text-xs text-muted-foreground">{row.user.email ?? '—'}</p>
                    </td>
                    <td className="py-2 px-3 text-muted-foreground text-xs">
                      {row.taxJurisdiction ?? row.payoutCountry ?? '—'}
                    </td>
                    <td className="py-2 px-3 text-muted-foreground text-xs font-mono break-all">
                      {row.taxId ?? '—'}
                    </td>
                    <td className="py-2 px-3 text-foreground text-xs">{row.salesTaxLabel ?? '—'}</td>
                    <td className="py-2 px-3 text-foreground text-xs">{ratePct}</td>
                    <td className="py-2 px-3 text-muted-foreground text-xs">
                      {new Date(row.salesTaxApprovedAt ?? row.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'short', day: 'numeric',
                      })}
                    </td>
                    <td className="py-2 px-3">
                      <StatusBadge status={row.salesTaxStatus} />
                    </td>
                    <td className="py-2 px-3">
                      <SalesTaxApplicationActions
                        creatorProfileId={row.id}
                        status={row.salesTaxStatus}
                        certificateUrl={row.salesTaxCertificateUrl ?? null}
                      />
                    </td>
                  </tr>
                )
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-muted-foreground text-sm">
                    No applications in this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

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

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'REQUESTED':
      return (
        <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/20 text-yellow-400">
          Pending
        </span>
      )
    case 'APPROVED':
      return (
        <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-400">
          Approved
        </span>
      )
    case 'REJECTED':
      return (
        <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-400">
          Rejected
        </span>
      )
    default:
      return (
        <span className="px-2 py-0.5 rounded text-xs font-medium bg-border text-muted-foreground">
          {status}
        </span>
      )
  }
}
