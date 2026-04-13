import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { OrdersActions } from './OrdersActions'

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

const STATUS_TABS = ['ALL', 'PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'COMPLETED'] as const

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date)
}

export default async function DashboardOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')
  if ((session.user as any).role !== 'CREATOR') redirect('/')
  const userId = (session.user as any).id

  const { status: statusFilter } = await searchParams

  const where: Record<string, unknown> = { creatorId: userId }
  if (statusFilter && statusFilter !== 'ALL') {
    where.status = statusFilter
  }

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      buyer: { select: { name: true, email: true } },
      product: { select: { title: true, type: true } },
    },
  })

  const activeTab = statusFilter ?? 'ALL'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#f0f0f5]">Orders</h1>
        <p className="text-sm text-[#8888aa] mt-1">{orders.length} order{orders.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {STATUS_TABS.map((tab) => (
          <a
            key={tab}
            href={tab === 'ALL' ? '/dashboard/orders' : `/dashboard/orders?status=${tab}`}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              activeTab === tab
                ? 'bg-[#7c3aed] text-white'
                : 'bg-[#1e1e2a] text-[#8888aa] hover:text-[#f0f0f5]'
            }`}
          >
            {tab}
          </a>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="bg-[#16161f] rounded-xl border border-[#2a2a3a] px-5 py-12 text-center">
          <p className="text-[#8888aa] text-sm">No orders found.</p>
        </div>
      ) : (
        <div className="bg-[#16161f] rounded-xl border border-[#2a2a3a] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-[#8888aa] border-b border-[#2a2a3a]">
                  <th className="px-5 py-3 text-left font-medium">Buyer</th>
                  <th className="px-5 py-3 text-left font-medium">Product</th>
                  <th className="px-5 py-3 text-left font-medium">Amount</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                  <th className="px-5 py-3 text-left font-medium">Date</th>
                  <th className="px-5 py-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-[#2a2a3a] last:border-0 hover:bg-[#1e1e2a]/50">
                    <td className="px-5 py-3">
                      <div>
                        <p className="text-[#f0f0f5] font-medium">{order.buyer?.name ?? 'Unknown'}</p>
                        <p className="text-xs text-[#8888aa]">{order.buyer?.email ?? ''}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-[#8888aa] truncate max-w-[160px]">{order.product?.title ?? '—'}</p>
                      <p className="text-xs text-[#8888aa]/60">{order.product?.type}</p>
                    </td>
                    <td className="px-5 py-3 text-[#f0f0f5]">${order.amountUsd.toFixed(2)}</td>
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
                    <td className="px-5 py-3">
                      <OrdersActions
                        orderId={order.id}
                        status={order.status}
                        productType={order.product?.type ?? 'DIGITAL'}
                      />
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
