import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Suspense } from 'react'
import { ApprovePayoutButton } from './PayoutActions'
import { SearchBar } from '@/components/ui/SearchBar'
import { FilterSelect } from '@/components/ui/FilterSelect'
import { Pagination } from '@/components/ui/Pagination'

const PER_PAGE = 20

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-500/20 text-yellow-400',
  COMPLETED: 'bg-green-500/20 text-green-400',
  FAILED: 'bg-red-500/20 text-red-400',
  CANCELLED: 'bg-border text-muted-foreground',
}

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

export default async function AdminPayoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; status?: string }>
}) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/')

  const params = await searchParams
  const q = params.q?.trim() ?? ''
  const page = Math.max(1, parseInt(params.page ?? '1') || 1)
  const status = params.status ?? ''

  const where: any = {}
  if (q) {
    where.creator = { name: { contains: q } }
  }
  if (status) where.status = status

  const [total, payouts] = await Promise.all([
    prisma.payout.count({ where }),
    prisma.payout.findMany({
      where,
      include: { creator: { select: { name: true } } },
      orderBy: { requestedAt: 'desc' },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
  ])

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Payouts</h2>

      <div className="flex flex-wrap gap-3">
        <Suspense fallback={null}>
          <SearchBar placeholder="Search by creator name..." className="min-w-52 flex-1" />
          <FilterSelect paramName="status" options={STATUS_OPTIONS} allLabel="All Statuses" className="w-40" />
        </Suspense>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Creator</th>
                <th className="text-right px-4 py-3 text-muted-foreground font-medium">Amount</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Status</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Requested</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Completed</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((payout) => (
                <tr key={payout.id} className="border-b border-border last:border-0 hover:bg-surface">
                  <td className="px-4 py-3 text-foreground">{payout.creator.name}</td>
                  <td className="px-4 py-3 text-foreground text-right">${(payout.amountUsd / 100).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[payout.status] ?? 'bg-border text-muted-foreground'}`}>
                      {payout.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(payout.requestedAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {payout.completedAt ? new Date(payout.completedAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {payout.status === 'PENDING' && <ApprovePayoutButton payoutId={payout.id} />}
                  </td>
                </tr>
              ))}
              {payouts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    {q || status ? 'No payouts match your filters.' : 'No payouts yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Suspense fallback={null}>
        <Pagination total={total} page={page} perPage={PER_PAGE} />
      </Suspense>
    </div>
  )
}
