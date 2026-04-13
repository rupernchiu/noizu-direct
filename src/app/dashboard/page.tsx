import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

type OrderStatus = 'PENDING' | 'PAID' | 'PROCESSING' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED'

const statusStyles: Record<OrderStatus, string> = {
  PENDING: 'bg-yellow-500/20 text-yellow-400',
  PAID: 'bg-blue-500/20 text-blue-400',
  PROCESSING: 'bg-orange-500/20 text-orange-400',
  SHIPPED: 'bg-[#7c3aed]/20 text-[#7c3aed]',
  COMPLETED: 'bg-[#00d4aa]/20 text-[#00d4aa]',
  CANCELLED: 'bg-red-500/20 text-red-400',
  REFUNDED: 'bg-[#8888aa]/20 text-[#8888aa]',
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date)
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if ((session.user as any).role !== 'CREATOR') redirect('/')
  const userId = (session.user as any).id

  const profile = await prisma.creatorProfile.findUnique({ where: { userId } })
  if (!profile) redirect('/')

  const [totalRevenue, pendingOrders, activeListings, unreadMessages] = await Promise.all([
    prisma.transaction.aggregate({
      where: { creatorId: userId, status: 'COMPLETED' },
      _sum: { creatorAmount: true },
    }),
    prisma.order.count({ where: { creatorId: userId, status: 'PENDING' } }),
    prisma.product.count({ where: { creatorId: profile.id, isActive: true } }),
    prisma.message.count({ where: { receiverId: userId, isRead: false } }),
  ])

  const recentOrders = await prisma.order.findMany({
    where: { creatorId: userId },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      buyer: { select: { name: true } },
      product: { select: { title: true } },
    },
  })

  const revenue = totalRevenue._sum.creatorAmount ?? 0

  const stats = [
    {
      label: 'Total Revenue',
      value: `$${revenue.toFixed(2)}`,
      color: 'text-[#00d4aa]',
      bg: 'bg-[#00d4aa]/10',
    },
    {
      label: 'Pending Orders',
      value: pendingOrders.toString(),
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
    },
    {
      label: 'Active Listings',
      value: activeListings.toString(),
      color: 'text-[#7c3aed]',
      bg: 'bg-[#7c3aed]/10',
    },
    {
      label: 'Unread Messages',
      value: unreadMessages.toString(),
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className={`rounded-xl border border-[#2a2a3a] p-4 ${s.bg}`}>
            <p className="text-xs font-medium text-[#8888aa] mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Recent orders */}
      <div className="bg-[#16161f] rounded-xl border border-[#2a2a3a] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#2a2a3a] flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#f0f0f5]">Recent Orders</h2>
          <Link href="/dashboard/orders" className="text-xs text-[#7c3aed] hover:underline">
            View all
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-[#8888aa]">No orders yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-[#8888aa] border-b border-[#2a2a3a]">
                  <th className="px-5 py-3 text-left font-medium">Buyer</th>
                  <th className="px-5 py-3 text-left font-medium">Product</th>
                  <th className="px-5 py-3 text-left font-medium">Amount</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                  <th className="px-5 py-3 text-left font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} className="border-b border-[#2a2a3a] last:border-0 hover:bg-[#1e1e2a]/50">
                    <td className="px-5 py-3 text-[#f0f0f5]">{order.buyer?.name ?? 'Unknown'}</td>
                    <td className="px-5 py-3 text-[#8888aa] truncate max-w-[160px]">
                      {order.product?.title ?? '—'}
                    </td>
                    <td className="px-5 py-3 text-[#f0f0f5]">
                      ${order.amountUsd.toFixed(2)}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          statusStyles[order.status as OrderStatus] ?? 'bg-[#8888aa]/20 text-[#8888aa]'
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[#8888aa]">{formatDate(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
