import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export default async function AdminOverviewPage() {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/')

  const [userCount, creatorCount, revenueAgg, pendingPayouts, recentOrders] = await Promise.all([
    prisma.user.count(),
    prisma.creatorProfile.count(),
    prisma.transaction.aggregate({ where: { status: 'COMPLETED' }, _sum: { grossAmountUsd: true } }),
    prisma.payout.count({ where: { status: 'PENDING' } }),
    prisma.order.findMany({
      include: {
        buyer: { select: { name: true, email: true } },
        product: { select: { title: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ])

  const totalRevenue = revenueAgg._sum.grossAmountUsd ?? 0

  const statusColors: Record<string, string> = {
    PENDING: 'bg-yellow-500/20 text-yellow-400',
    PAID: 'bg-blue-500/20 text-blue-400',
    PROCESSING: 'bg-orange-500/20 text-orange-400',
    SHIPPED: 'bg-purple-500/20 text-purple-400',
    COMPLETED: 'bg-green-500/20 text-green-400',
    CANCELLED: 'bg-red-500/20 text-red-400',
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-foreground">Overview</h2>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl p-4 border border-border">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Total Users</p>
          <p className="text-2xl font-bold text-foreground mt-1">{userCount}</p>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Creators</p>
          <p className="text-2xl font-bold text-foreground mt-1">{creatorCount}</p>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Total Revenue</p>
          <p className="text-2xl font-bold text-foreground mt-1">${(totalRevenue / 100).toFixed(2)}</p>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Pending Payouts</p>
          <p className="text-2xl font-bold text-destructive mt-1">{pendingPayouts}</p>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Recent Orders</h3>
          <Link href="/admin/orders" className="text-xs text-primary hover:underline">View all</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-2 text-muted-foreground font-medium">Order ID</th>
                <th className="text-left px-4 py-2 text-muted-foreground font-medium">Buyer</th>
                <th className="text-left px-4 py-2 text-muted-foreground font-medium">Product</th>
                <th className="text-left px-4 py-2 text-muted-foreground font-medium">Amount</th>
                <th className="text-left px-4 py-2 text-muted-foreground font-medium">Status</th>
                <th className="text-left px-4 py-2 text-muted-foreground font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => (
                <tr key={order.id} className="border-b border-border last:border-0 hover:bg-surface">
                  <td className="px-4 py-2 text-muted-foreground font-mono text-xs">{order.id.slice(0, 8)}...</td>
                  <td className="px-4 py-2 text-foreground">{order.buyer.name}</td>
                  <td className="px-4 py-2 text-foreground">{order.product.title}</td>
                  <td className="px-4 py-2 text-foreground">${(order.amountUsd / 100).toFixed(2)}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[order.status] ?? 'bg-border text-muted-foreground'}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground text-xs">{new Date(order.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {recentOrders.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">No orders yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
