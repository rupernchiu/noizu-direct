import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Suspense } from 'react'
import { SearchBar } from '@/components/ui/SearchBar'
import { Pagination } from '@/components/ui/Pagination'
import { TransactionFilters } from './TransactionFilters'

const PER_PAGE = 20

const STATUS_COLORS: Record<string, string> = {
  PENDING:   'bg-yellow-500/20 text-yellow-400',
  COMPLETED: 'bg-green-500/20 text-green-400',
  FAILED:    'bg-red-500/20 text-red-400',
  REFUNDED:  'bg-orange-500/20 text-orange-400',
}

function usd(cents: number | null) {
  return `$${((cents ?? 0) / 100).toFixed(2)}`
}

export default async function AdminTransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string; page?: string; status?: string
    creator?: string; buyer?: string
    dateFrom?: string; dateTo?: string
    amtMin?: string; amtMax?: string
  }>
}) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/')

  const params    = await searchParams
  const q         = params.q?.trim() ?? ''
  const page      = Math.max(1, parseInt(params.page ?? '1') || 1)
  const status    = params.status   ?? ''
  const creatorId = params.creator  ?? ''    // User.id from CreatorProfile.userId
  const buyerId   = params.buyer    ?? ''    // User.id
  const dateFrom  = params.dateFrom ?? ''
  const dateTo    = params.dateTo   ?? ''
  const amtMin    = params.amtMin   ?? ''
  const amtMax    = params.amtMax   ?? ''

  // Build where clause
  const where: any = {}

  if (q) {
    where.OR = [
      { airwallexReference: { contains: q } },
      { order: { buyer: { name: { contains: q } } } },
      { order: { buyer: { email: { contains: q } } } },
      { order: { creator: { name: { contains: q } } } },
      { order: { product: { title: { contains: q } } } },
    ]
  }
  if (status)    where.status    = status
  if (creatorId) where.creatorId = creatorId
  if (buyerId)   where.buyerId   = buyerId

  if (dateFrom || dateTo) {
    where.createdAt = {}
    if (dateFrom) where.createdAt.gte = new Date(dateFrom)
    if (dateTo)   where.createdAt.lte = new Date(`${dateTo}T23:59:59.999`)
  }

  if (amtMin || amtMax) {
    where.grossAmountUsd = {}
    if (amtMin) where.grossAmountUsd.gte = Math.round(parseFloat(amtMin) * 100)
    if (amtMax) where.grossAmountUsd.lte = Math.round(parseFloat(amtMax) * 100)
  }

  const [total, transactions, stats, allCreators, allBuyers] = await Promise.all([
    prisma.transaction.count({ where }),

    prisma.transaction.findMany({
      where,
      include: {
        order: {
          include: {
            product: { select: { title: true } },
            buyer:   { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),

    // Stats aggregation based on current filters (full set, not paginated)
    prisma.transaction.aggregate({
      where,
      _sum: {
        grossAmountUsd: true,
        platformFee:    true,
        creatorAmount:  true,
      },
    }),

    prisma.creatorProfile.findMany({
      select: { userId: true, displayName: true },
      orderBy: { displayName: 'asc' },
    }),

    prisma.user.findMany({
      where: { role: 'BUYER' },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    }),
  ])

  const hasFilters = !!(q || status || creatorId || buyerId || dateFrom || dateTo || amtMin || amtMax)

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Transactions</h2>

      {/* Search */}
      <div className="flex flex-wrap gap-3 items-center">
        <Suspense fallback={null}>
          <SearchBar placeholder="Search by reference, buyer or product…" className="min-w-52 flex-1" />
        </Suspense>
      </div>

      {/* Filters */}
      <Suspense fallback={null}>
        <TransactionFilters
          creators={allCreators}
          buyers={allBuyers}
          total={total}
          filtered={transactions.length}
        />
      </Suspense>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Transactions',    value: total.toString() },
          { label: 'Total Gross',     value: usd(stats._sum.grossAmountUsd) },
          { label: 'Platform Fees',   value: usd(stats._sum.platformFee) },
          { label: 'Creator Payouts', value: usd(stats._sum.creatorAmount) },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl bg-card border border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-0.5 text-lg font-bold text-foreground">{value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Order ID</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Buyer</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Product</th>
                <th className="text-right px-4 py-3 text-muted-foreground font-medium">Gross</th>
                <th className="text-right px-4 py-3 text-muted-foreground font-medium">Fee</th>
                <th className="text-right px-4 py-3 text-muted-foreground font-medium">Creator Net</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Status</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id} className="border-b border-border last:border-0 hover:bg-surface">
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{tx.orderId.slice(0, 8)}…</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{tx.order.buyer.name}</td>
                  <td className="px-4 py-3 text-foreground max-w-xs truncate">{tx.order.product.title}</td>
                  <td className="px-4 py-3 text-foreground text-right">{usd(tx.grossAmountUsd)}</td>
                  <td className="px-4 py-3 text-red-400 text-right">-{usd(tx.processingFee)}</td>
                  <td className="px-4 py-3 text-green-400 text-right">{usd(tx.creatorAmount)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[tx.status] ?? 'bg-border text-muted-foreground'}`}>
                      {tx.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(tx.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    {hasFilters ? 'No transactions match your filters.' : 'No transactions yet.'}
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
