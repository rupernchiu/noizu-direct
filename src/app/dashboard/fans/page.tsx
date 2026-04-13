import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'

export default async function FansPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if ((session.user as any).role !== 'CREATOR') redirect('/')
  const userId = (session.user as any).id

  // Get all distinct buyers who have purchased from this creator
  const orders = await prisma.order.findMany({
    where: { creatorId: userId, status: { in: ['PAID', 'COMPLETED'] } },
    distinct: ['buyerId'],
    include: { buyer: { select: { id: true, name: true, email: true } } },
  })

  const buyerIds = orders.map((o) => o.buyerId)

  // Total spent per buyer
  const spendAgg = await prisma.order.groupBy({
    by: ['buyerId'],
    where: { creatorId: userId, status: { in: ['PAID', 'COMPLETED'] }, buyerId: { in: buyerIds } },
    _sum: { amountUsd: true },
    _count: { id: true },
  })

  const spendMap = new Map(
    spendAgg.map((s) => [s.buyerId, { total: s._sum.amountUsd ?? 0, orders: s._count.id }])
  )

  // Merge
  const fans = orders.map((o) => ({
    buyer: o.buyer,
    total: spendMap.get(o.buyerId)?.total ?? 0,
    orderCount: spendMap.get(o.buyerId)?.orders ?? 0,
  })).sort((a, b) => b.total - a.total)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#f0f0f5]">Fans</h1>
        <p className="text-sm text-[#8888aa] mt-1">{fans.length} fan{fans.length !== 1 ? 's' : ''}</p>
      </div>

      {fans.length === 0 ? (
        <div className="bg-[#16161f] rounded-xl border border-[#2a2a3a] px-5 py-12 text-center">
          <p className="text-[#8888aa] text-sm">No fans yet. Fans appear when buyers purchase from you.</p>
        </div>
      ) : (
        <div className="bg-[#16161f] rounded-xl border border-[#2a2a3a] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-[#8888aa] border-b border-[#2a2a3a]">
                  <th className="px-5 py-3 text-left font-medium">Fan</th>
                  <th className="px-5 py-3 text-left font-medium">Email</th>
                  <th className="px-5 py-3 text-left font-medium">Orders</th>
                  <th className="px-5 py-3 text-left font-medium">Total Spent</th>
                </tr>
              </thead>
              <tbody>
                {fans.map(({ buyer, total, orderCount }) => (
                  <tr key={buyer.id} className="border-b border-[#2a2a3a] last:border-0 hover:bg-[#1e1e2a]/50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#7c3aed]/30 flex items-center justify-center text-xs font-bold text-[#7c3aed] shrink-0">
                          {buyer.name?.[0]?.toUpperCase() ?? '?'}
                        </div>
                        <span className="font-medium text-[#f0f0f5]">{buyer.name ?? 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-[#8888aa]">{buyer.email ?? '—'}</td>
                    <td className="px-5 py-3 text-[#f0f0f5]">{orderCount}</td>
                    <td className="px-5 py-3 text-[#00d4aa] font-medium">${total.toFixed(2)}</td>
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
