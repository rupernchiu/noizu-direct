import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date)
}

export default async function EarningsPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if ((session.user as any).role !== 'CREATOR') redirect('/')
  const userId = (session.user as any).id

  const [completedTxAgg, payoutsAgg, transactions, payouts] = await Promise.all([
    prisma.transaction.aggregate({
      where: { creatorId: userId, status: 'COMPLETED' },
      _sum: { creatorAmount: true },
    }),
    prisma.payout.aggregate({
      where: { creatorId: userId, status: { not: 'FAILED' } },
      _sum: { amountUsd: true },
    }),
    prisma.transaction.findMany({
      where: { creatorId: userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.payout.findMany({
      where: { creatorId: userId },
      orderBy: { requestedAt: 'desc' },
      take: 5,
    }),
  ])

  const totalEarned = completedTxAgg._sum.creatorAmount ?? 0
  const totalPaidOut = payoutsAgg._sum.amountUsd ?? 0
  const available = Math.max(0, totalEarned - totalPaidOut)

  const txStatusStyles: Record<string, string> = {
    COMPLETED: 'bg-[#00d4aa]/20 text-[#00d4aa]',
    PENDING: 'bg-yellow-500/20 text-yellow-400',
    FAILED: 'bg-red-500/20 text-red-400',
    REFUNDED: 'bg-[#8888aa]/20 text-[#8888aa]',
  }

  const payoutStatusStyles: Record<string, string> = {
    PENDING: 'bg-yellow-500/20 text-yellow-400',
    PROCESSING: 'bg-orange-500/20 text-orange-400',
    COMPLETED: 'bg-[#00d4aa]/20 text-[#00d4aa]',
    FAILED: 'bg-red-500/20 text-red-400',
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#f0f0f5]">Earnings</h1>
          <p className="text-sm text-[#8888aa] mt-1">Track your revenue and request payouts</p>
        </div>
        <Link
          href="/dashboard/earnings/payout"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-sm font-medium transition-colors"
        >
          Request Payout
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-[#2a2a3a] bg-[#00d4aa]/10 p-4">
          <p className="text-xs font-medium text-[#8888aa] mb-1">Available Balance</p>
          <p className="text-2xl font-bold text-[#00d4aa]">${available.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-[#2a2a3a] bg-[#7c3aed]/10 p-4">
          <p className="text-xs font-medium text-[#8888aa] mb-1">Total Earned</p>
          <p className="text-2xl font-bold text-[#7c3aed]">${totalEarned.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-[#2a2a3a] bg-[#1e1e2a] p-4">
          <p className="text-xs font-medium text-[#8888aa] mb-1">Total Paid Out</p>
          <p className="text-2xl font-bold text-[#f0f0f5]">${totalPaidOut.toFixed(2)}</p>
        </div>
      </div>

      {/* Transaction history */}
      <div className="bg-[#16161f] rounded-xl border border-[#2a2a3a] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#2a2a3a]">
          <h2 className="text-base font-semibold text-[#f0f0f5]">Transaction History</h2>
        </div>
        {transactions.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-[#8888aa]">No transactions yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-[#8888aa] border-b border-[#2a2a3a]">
                  <th className="px-5 py-3 text-left font-medium">Date</th>
                  <th className="px-5 py-3 text-left font-medium">Gross</th>
                  <th className="px-5 py-3 text-left font-medium">Fee</th>
                  <th className="px-5 py-3 text-left font-medium">Net</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-[#2a2a3a] last:border-0 hover:bg-[#1e1e2a]/50">
                    <td className="px-5 py-3 text-[#8888aa]">{formatDate(tx.createdAt)}</td>
                    <td className="px-5 py-3 text-[#f0f0f5]">${tx.grossAmountUsd.toFixed(2)}</td>
                    <td className="px-5 py-3 text-[#8888aa]">${tx.processingFee.toFixed(2)}</td>
                    <td className="px-5 py-3 text-[#00d4aa] font-medium">${tx.creatorAmount.toFixed(2)}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          txStatusStyles[tx.status] ?? 'bg-[#8888aa]/20 text-[#8888aa]'
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payout history */}
      {payouts.length > 0 && (
        <div className="bg-[#16161f] rounded-xl border border-[#2a2a3a] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#2a2a3a]">
            <h2 className="text-base font-semibold text-[#f0f0f5]">Payout History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-[#8888aa] border-b border-[#2a2a3a]">
                  <th className="px-5 py-3 text-left font-medium">Requested</th>
                  <th className="px-5 py-3 text-left font-medium">Amount</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                  <th className="px-5 py-3 text-left font-medium">Completed</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p.id} className="border-b border-[#2a2a3a] last:border-0 hover:bg-[#1e1e2a]/50">
                    <td className="px-5 py-3 text-[#8888aa]">{formatDate(p.requestedAt)}</td>
                    <td className="px-5 py-3 text-[#f0f0f5] font-medium">${p.amountUsd.toFixed(2)}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          payoutStatusStyles[p.status] ?? 'bg-[#8888aa]/20 text-[#8888aa]'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[#8888aa]">
                      {p.completedAt ? formatDate(p.completedAt) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
