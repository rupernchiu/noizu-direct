import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Suspense } from 'react'
import Link from 'next/link'
import { FilterSelect } from '@/components/ui/FilterSelect'
import { Pagination } from '@/components/ui/Pagination'
import { getCreatorBalance } from '@/lib/creator-balance'

const TX_PER_PAGE = 10
const PAYOUT_PER_PAGE = 5

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date)
}

const TX_STATUS_OPTIONS = [
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'REFUNDED', label: 'Refunded' },
]

const txStatusStyles: Record<string, string> = {
  COMPLETED: 'bg-secondary/20 text-secondary',
  PENDING: 'bg-yellow-500/20 text-yellow-400',
  FAILED: 'bg-red-500/20 text-red-400',
  REFUNDED: 'bg-muted-foreground/20 text-muted-foreground',
}

const payoutStatusStyles: Record<string, string> = {
  PENDING: 'bg-yellow-500/20 text-yellow-400',
  PROCESSING: 'bg-orange-500/20 text-orange-400',
  COMPLETED: 'bg-secondary/20 text-secondary',
  FAILED: 'bg-red-500/20 text-red-400',
}

export default async function EarningsPage({
  searchParams,
}: {
  searchParams: Promise<{ txStatus?: string; txPage?: string; payoutPage?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')
  if ((session.user as any).role !== 'CREATOR') redirect('/')
  const userId = (session.user as any).id

  const params = await searchParams
  const txStatus = params.txStatus ?? ''
  const txPage = Math.max(1, parseInt(params.txPage ?? '1') || 1)
  const payoutPage = Math.max(1, parseInt(params.payoutPage ?? '1') || 1)

  const txWhere: any = { creatorId: userId }
  if (txStatus) txWhere.status = txStatus

  const [balance, txTotal, transactions, payoutTotal, payouts, profile] = await Promise.all([
    getCreatorBalance(userId),
    prisma.transaction.count({ where: txWhere }),
    prisma.transaction.findMany({
      where: txWhere,
      orderBy: { createdAt: 'desc' },
      skip: (txPage - 1) * TX_PER_PAGE,
      take: TX_PER_PAGE,
    }),
    prisma.payout.count({ where: { creatorId: userId } }),
    prisma.payout.findMany({
      where: { creatorId: userId },
      orderBy: { requestedAt: 'desc' },
      skip: (payoutPage - 1) * PAYOUT_PER_PAGE,
      take: PAYOUT_PER_PAGE,
    }),
    prisma.creatorProfile.findUnique({
      where: { userId },
      select: { payoutCurrency: true },
    }),
  ])

  const totalEarnedCents = balance.lifetimeUsd
  const totalEscrowCents = balance.escrowUsd
  const totalPaidOutCents = balance.paidOutUsd
  const availableCents = balance.availableUsd
  const exposedCents = balance.exposedUsd
  const exposureWindowDays = balance.exposureWindowDays
  const payoutCurrency = profile?.payoutCurrency ?? 'USD'

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground">Earnings</h1>
          <p className="text-sm text-muted-foreground mt-1">Track your revenue and request payouts</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link
            href="/dashboard/statement"
            className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Statement
          </Link>
          <Link
            href="/dashboard/earnings/payout"
            className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-medium transition-colors"
          >
            Request Payout
          </Link>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        <div className="rounded-xl border border-border bg-secondary/10 p-3 sm:p-4">
          <p className="text-xs font-medium text-muted-foreground mb-1">Available</p>
          <p className="text-xl sm:text-2xl font-bold text-secondary">${(availableCents / 100).toFixed(2)}</p>
          <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">Payable now</p>
        </div>
        <div className="rounded-xl border border-border bg-amber-500/10 p-3 sm:p-4">
          <p className="text-xs font-medium text-muted-foreground mb-1">Exposed</p>
          <p className="text-xl sm:text-2xl font-bold text-amber-500">${(exposedCents / 100).toFixed(2)}</p>
          <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">Last {exposureWindowDays}d clawback hold</p>
        </div>
        <div className="rounded-xl border border-border bg-yellow-500/10 p-3 sm:p-4">
          <p className="text-xs font-medium text-muted-foreground mb-1">In Escrow</p>
          <p className="text-xl sm:text-2xl font-bold text-yellow-400">${(totalEscrowCents / 100).toFixed(2)}</p>
          <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">Pending release</p>
        </div>
        <div className="rounded-xl border border-border bg-primary/10 p-3 sm:p-4">
          <p className="text-xs font-medium text-muted-foreground mb-1">Total Earned</p>
          <p className="text-xl sm:text-2xl font-bold text-primary">${(totalEarnedCents / 100).toFixed(2)}</p>
          <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">All time</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
          <p className="text-xs font-medium text-muted-foreground mb-1">Paid Out</p>
          <p className="text-xl sm:text-2xl font-bold text-foreground">${(totalPaidOutCents / 100).toFixed(2)}</p>
          <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">Payout: {payoutCurrency}</p>
        </div>
      </div>

      {/* Transaction history */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-base font-semibold text-foreground">Transaction History</h2>
          <Suspense fallback={null}>
            <FilterSelect paramName="txStatus" options={TX_STATUS_OPTIONS} allLabel="All Statuses" className="w-40" />
          </Suspense>
        </div>

        {transactions.length === 0 ? (
          <div className="bg-surface rounded-xl border border-border px-5 py-8 text-center text-sm text-muted-foreground">
            {txStatus ? 'No transactions match this filter.' : 'No transactions yet.'}
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {transactions.map((tx) => (
                <div key={tx.id} className="bg-surface rounded-xl border border-border p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-xs text-muted-foreground">{formatDate(tx.createdAt)}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0 ${txStatusStyles[tx.status] ?? 'bg-muted-foreground/20 text-muted-foreground'}`}>
                      {tx.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border text-xs">
                    <div>
                      <p className="text-muted-foreground">Gross</p>
                      <p className="text-foreground font-medium">${(tx.grossAmountUsd / 100).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Fee</p>
                      <p className="text-muted-foreground">${(tx.processingFee / 100).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Net</p>
                      <p className="text-secondary font-semibold">${(tx.creatorAmount / 100).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop table */}
            <div className="hidden md:block bg-surface rounded-xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-muted-foreground border-b border-border">
                      <th className="px-5 py-3 text-left font-medium">Date</th>
                      <th className="px-5 py-3 text-left font-medium">Gross</th>
                      <th className="px-5 py-3 text-left font-medium">Fee</th>
                      <th className="px-5 py-3 text-left font-medium">Net</th>
                      <th className="px-5 py-3 text-left font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="border-b border-border last:border-0 hover:bg-card/50">
                        <td className="px-5 py-3 text-muted-foreground">{formatDate(tx.createdAt)}</td>
                        <td className="px-5 py-3 text-foreground">${(tx.grossAmountUsd / 100).toFixed(2)}</td>
                        <td className="px-5 py-3 text-muted-foreground">${(tx.processingFee / 100).toFixed(2)}</td>
                        <td className="px-5 py-3 text-secondary font-medium">${(tx.creatorAmount / 100).toFixed(2)}</td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${txStatusStyles[tx.status] ?? 'bg-muted-foreground/20 text-muted-foreground'}`}>
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        <Suspense fallback={null}>
          <Pagination total={txTotal} page={txPage} perPage={TX_PER_PAGE} paramName="txPage" />
        </Suspense>
      </div>

      {/* Payout history */}
      {(payouts.length > 0 || payoutTotal > 0) && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">Payout History</h2>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {payouts.map((p) => (
              <div key={p.id} className="bg-surface rounded-xl border border-border p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-foreground font-semibold text-sm">
                    USD {(p.amountUsd / 100).toFixed(2)}
                    {p.currency && p.currency !== 'USD' && (
                      <span className="text-xs text-muted-foreground ml-1">({p.currency})</span>
                    )}
                  </span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0 ${payoutStatusStyles[p.status] ?? 'bg-muted-foreground/20 text-muted-foreground'}`}>
                    {p.status}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 pt-2 border-t border-border text-xs text-muted-foreground">
                  <span>Requested {formatDate(p.requestedAt)}</span>
                  <span>{p.completedAt ? `Paid ${formatDate(p.completedAt)}` : '—'}</span>
                </div>
              </div>
            ))}
          </div>
          {/* Desktop table */}
          <div className="hidden md:block bg-surface rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground border-b border-border">
                    <th className="px-5 py-3 text-left font-medium">Requested</th>
                    <th className="px-5 py-3 text-left font-medium">Amount</th>
                    <th className="px-5 py-3 text-left font-medium">Status</th>
                    <th className="px-5 py-3 text-left font-medium">Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((p) => (
                    <tr key={p.id} className="border-b border-border last:border-0 hover:bg-card/50">
                      <td className="px-5 py-3 text-muted-foreground">{formatDate(p.requestedAt)}</td>
                      <td className="px-5 py-3 text-foreground font-medium">
                        USD {(p.amountUsd / 100).toFixed(2)}
                        {p.currency && p.currency !== 'USD' && (
                          <span className="text-xs text-muted-foreground ml-1">({p.currency})</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${payoutStatusStyles[p.status] ?? 'bg-muted-foreground/20 text-muted-foreground'}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {p.completedAt ? formatDate(p.completedAt) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <Suspense fallback={null}>
            <Pagination total={payoutTotal} page={payoutPage} perPage={PAYOUT_PER_PAGE} paramName="payoutPage" />
          </Suspense>
        </div>
      )}
    </div>
  )
}
