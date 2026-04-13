import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-500/20 text-yellow-400',
  COMPLETED: 'bg-green-500/20 text-green-400',
  FAILED: 'bg-red-500/20 text-red-400',
  REFUNDED: 'bg-orange-500/20 text-orange-400',
}

export default async function AdminTransactionsPage() {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/')

  const transactions = await prisma.transaction.findMany({
    include: {
      order: {
        include: { product: { select: { title: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-[#f0f0f5]">Transactions ({transactions.length})</h2>

      <div className="bg-[#1e1e2a] rounded-xl border border-[#2a2a3a] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a3a]">
                <th className="text-left px-4 py-3 text-[#8888aa] font-medium">Order ID</th>
                <th className="text-left px-4 py-3 text-[#8888aa] font-medium">Product</th>
                <th className="text-right px-4 py-3 text-[#8888aa] font-medium">Gross</th>
                <th className="text-right px-4 py-3 text-[#8888aa] font-medium">Processing Fee</th>
                <th className="text-right px-4 py-3 text-[#8888aa] font-medium">Creator Amount</th>
                <th className="text-left px-4 py-3 text-[#8888aa] font-medium">Status</th>
                <th className="text-left px-4 py-3 text-[#8888aa] font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id} className="border-b border-[#2a2a3a] last:border-0 hover:bg-[#16161f]">
                  <td className="px-4 py-3 text-[#8888aa] font-mono text-xs">{tx.orderId.slice(0, 8)}...</td>
                  <td className="px-4 py-3 text-[#f0f0f5] max-w-xs truncate">{tx.order.product.title}</td>
                  <td className="px-4 py-3 text-[#f0f0f5] text-right">${(tx.grossAmountUsd / 100).toFixed(2)}</td>
                  <td className="px-4 py-3 text-red-400 text-right">-${(tx.processingFee / 100).toFixed(2)}</td>
                  <td className="px-4 py-3 text-green-400 text-right">${(tx.creatorAmount / 100).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[tx.status] ?? 'bg-[#2a2a3a] text-[#8888aa]'}`}>
                      {tx.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#8888aa] text-xs">{new Date(tx.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-[#8888aa]">No transactions yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
