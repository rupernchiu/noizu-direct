import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

type OrderStatus =
  | 'PENDING'
  | 'PAID'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REFUNDED'

const statusStyles: Record<OrderStatus, string> = {
  PENDING: 'bg-yellow-500/20 text-yellow-400',
  PAID: 'bg-blue-500/20 text-blue-400',
  PROCESSING: 'bg-orange-500/20 text-orange-400',
  SHIPPED: 'bg-[#7c3aed]/20 text-[#7c3aed]',
  COMPLETED: 'bg-[#00d4aa]/20 text-[#00d4aa]',
  CANCELLED: 'bg-red-500/20 text-red-400',
  REFUNDED: 'bg-[#8888aa]/20 text-[#8888aa]',
}

function formatAmount(displayAmount: number, displayCurrency: string, amountUsd: number) {
  if (displayAmount && displayCurrency) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: displayCurrency,
    }).format(displayAmount / 100)
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
    amountUsd / 100
  )
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date)
}

export default async function OrdersPage() {
  const session = await auth()
  if (!session) redirect('/login')
  const userId = (session.user as any).id

  const orders = await prisma.order.findMany({
    where: { buyerId: userId },
    orderBy: { createdAt: 'desc' },
    include: {
      product: {
        select: { id: true, title: true, images: true, type: true, category: true },
      },
      creator: { select: { name: true } },
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#f0f0f5]">Orders</h1>
        <p className="text-sm text-[#8888aa] mt-1">Your purchase history</p>
      </div>

      {orders.length === 0 ? (
        <div className="bg-[#16161f] rounded-xl border border-[#2a2a3a] p-12 text-center">
          <p className="text-[#8888aa] text-sm">You haven&apos;t placed any orders yet.</p>
          <Link
            href="/marketplace"
            className="inline-block mt-4 text-sm text-[#7c3aed] hover:underline"
          >
            Browse the marketplace
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const images = (() => {
              try {
                return JSON.parse(order.product.images) as string[]
              } catch {
                return []
              }
            })()
            const thumb = images[0] ?? null
            const status = order.status as OrderStatus
            const statusClass = statusStyles[status] ?? 'bg-[#2a2a3a] text-[#8888aa]'
            const isDigital = order.product.type === 'DIGITAL'
            const isPhysical = order.product.type === 'PHYSICAL'
            const canDownload =
              order.status === 'PAID' && isDigital && order.downloadToken

            return (
              <div
                key={order.id}
                className="bg-[#16161f] rounded-xl border border-[#2a2a3a] p-4 flex gap-4 items-start"
              >
                {/* Thumbnail */}
                <div className="shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gradient-to-br from-[#7c3aed]/30 to-[#00d4aa]/30 flex items-center justify-center">
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumb}
                      alt={order.product.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs text-[#8888aa]">No img</span>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[#f0f0f5] truncate">{order.product.title}</p>
                  <p className="text-xs text-[#8888aa] mt-0.5">by {order.creator.name}</p>
                  <p className="text-xs text-[#8888aa] mt-0.5">
                    {order.product.category} · {order.product.type}
                  </p>
                </div>

                {/* Right side */}
                <div className="shrink-0 flex flex-col items-end gap-2">
                  <span className="text-sm font-semibold text-[#f0f0f5]">
                    {formatAmount(order.displayAmount, order.displayCurrency, order.amountUsd)}
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusClass}`}
                  >
                    {status}
                  </span>
                  <span className="text-xs text-[#8888aa]">{formatDate(order.createdAt)}</span>

                  {canDownload && (
                    <Link
                      href={`/download/${order.downloadToken}`}
                      className="inline-flex items-center px-3 py-1 rounded-lg bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs font-medium transition-colors"
                    >
                      Download
                    </Link>
                  )}

                  {order.status === 'PAID' && isPhysical && (
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                        (order as any).trackingNumber
                          ? 'bg-[#2a2a3a] text-[#f0f0f5] cursor-pointer hover:bg-[#3a3a4a]'
                          : 'bg-[#1e1e2a] text-[#8888aa] cursor-not-allowed'
                      }`}
                    >
                      Track order
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
