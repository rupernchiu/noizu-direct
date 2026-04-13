import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ApprovePayoutButton } from './PayoutActions'

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-500/20 text-yellow-400',
  COMPLETED: 'bg-green-500/20 text-green-400',
  FAILED: 'bg-red-500/20 text-red-400',
  CANCELLED: 'bg-[#2a2a3a] text-[#8888aa]',
}

export default async function AdminPayoutsPage() {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/')

  const payouts = await prisma.payout.findMany({
    include: { creator: { select: { name: true } } },
    orderBy: { requestedAt: 'desc' },
  })

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-[#f0f0f5]">Payouts ({payouts.length})</h2>

      <div className="bg-[#1e1e2a] rounded-xl border border-[#2a2a3a] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a3a]">
                <th className="text-left px-4 py-3 text-[#8888aa] font-medium">Creator</th>
                <th className="text-right px-4 py-3 text-[#8888aa] font-medium">Amount</th>
                <th className="text-left px-4 py-3 text-[#8888aa] font-medium">Status</th>
                <th className="text-left px-4 py-3 text-[#8888aa] font-medium">Requested</th>
                <th className="text-left px-4 py-3 text-[#8888aa] font-medium">Completed</th>
                <th className="text-left px-4 py-3 text-[#8888aa] font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((payout) => (
                <tr key={payout.id} className="border-b border-[#2a2a3a] last:border-0 hover:bg-[#16161f]">
                  <td className="px-4 py-3 text-[#f0f0f5]">{payout.creator.name}</td>
                  <td className="px-4 py-3 text-[#f0f0f5] text-right">${(payout.amountUsd / 100).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[payout.status] ?? 'bg-[#2a2a3a] text-[#8888aa]'}`}>
                      {payout.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#8888aa] text-xs">{new Date(payout.requestedAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-[#8888aa] text-xs">
                    {payout.completedAt ? new Date(payout.completedAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {payout.status === 'PENDING' && <ApprovePayoutButton payoutId={payout.id} />}
                  </td>
                </tr>
              ))}
              {payouts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-[#8888aa]">No payouts yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
