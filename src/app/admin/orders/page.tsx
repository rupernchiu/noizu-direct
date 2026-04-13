import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-500/20 text-yellow-400',
  PAID: 'bg-blue-500/20 text-blue-400',
  PROCESSING: 'bg-orange-500/20 text-orange-400',
  SHIPPED: 'bg-purple-500/20 text-purple-400',
  COMPLETED: 'bg-green-500/20 text-green-400',
  CANCELLED: 'bg-red-500/20 text-red-400',
}

export default async function AdminOrdersPage() {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/')

  const orders = await prisma.order.findMany({
    include: {
      buyer: { select: { name: true, email: true } },
      product: { select: { title: true, type: true } },
      creator: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-[#f0f0f5]">Orders ({orders.length})</h2>

      <div className="bg-[#1e1e2a] rounded-xl border border-[#2a2a3a] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a3a]">
                <th className="text-left px-4 py-3 text-[#8888aa] font-medium">ID</th>
                <th className="text-left px-4 py-3 text-[#8888aa] font-medium">Buyer</th>
                <th className="text-left px-4 py-3 text-[#8888aa] font-medium">Product</th>
                <th className="text-left px-4 py-3 text-[#8888aa] font-medium">Creator</th>
                <th className="text-left px-4 py-3 text-[#8888aa] font-medium">Amount</th>
                <th className="text-left px-4 py-3 text-[#8888aa] font-medium">Status</th>
                <th className="text-left px-4 py-3 text-[#8888aa] font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-[#2a2a3a] last:border-0 hover:bg-[#16161f]">
                  <td className="px-4 py-3 text-[#8888aa] font-mono text-xs">{order.id.slice(0, 8)}...</td>
                  <td className="px-4 py-3">
                    <div className="text-[#f0f0f5]">{order.buyer.name}</div>
                    <div className="text-[#8888aa] text-xs">{order.buyer.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-[#f0f0f5] max-w-xs truncate">{order.product.title}</div>
                    <div className="text-[#8888aa] text-xs">{order.product.type}</div>
                  </td>
                  <td className="px-4 py-3 text-[#8888aa]">{order.creator.name}</td>
                  <td className="px-4 py-3 text-[#f0f0f5]">${(order.amountUsd / 100).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[order.status] ?? 'bg-[#2a2a3a] text-[#8888aa]'}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#8888aa] text-xs">{new Date(order.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-[#8888aa]">No orders yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
