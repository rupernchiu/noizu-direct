import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

function getExpiryLabel(expiry: Date | null): { text: string; expired: boolean } {
  if (!expiry) return { text: 'No expiry', expired: false }
  const now = new Date()
  const diff = expiry.getTime() - now.getTime()
  if (diff <= 0) return { text: 'Expired', expired: true }
  const hours = Math.floor(diff / (1000 * 60 * 60))
  if (hours < 1) {
    const mins = Math.floor(diff / (1000 * 60))
    return { text: `Expires in ${mins} minute${mins !== 1 ? 's' : ''}`, expired: false }
  }
  if (hours < 24) {
    return { text: `Expires in ${hours} hour${hours !== 1 ? 's' : ''}`, expired: false }
  }
  const days = Math.floor(hours / 24)
  return { text: `Expires in ${days} day${days !== 1 ? 's' : ''}`, expired: false }
}

export default async function DownloadsPage() {
  const session = await auth()
  if (!session) redirect('/login')
  const userId = (session.user as any).id

  const orders = await prisma.order.findMany({
    where: {
      buyerId: userId,
      status: 'PAID',
      product: { type: 'DIGITAL' },
      NOT: { downloadToken: null },
    },
    include: {
      product: { select: { id: true, title: true, category: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#f0f0f5]">Downloads</h1>
        <p className="text-sm text-[#8888aa] mt-1">Your digital purchases</p>
      </div>

      {orders.length === 0 ? (
        <div className="bg-[#16161f] rounded-xl border border-[#2a2a3a] p-12 text-center">
          <p className="text-[#8888aa] text-sm">No downloads available.</p>
          <Link
            href="/marketplace"
            className="inline-block mt-4 text-sm text-[#7c3aed] hover:underline"
          >
            Browse digital products
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const expiry = getExpiryLabel(order.downloadExpiry)
            return (
              <div
                key={order.id}
                className="bg-[#16161f] rounded-xl border border-[#2a2a3a] p-4 flex items-center gap-4"
              >
                {/* Icon */}
                <div className="shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-[#7c3aed]/30 to-[#00d4aa]/30 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-[#7c3aed]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[#f0f0f5] truncate">{order.product.title}</p>
                  <p className="text-xs text-[#8888aa] mt-0.5">{order.product.category}</p>
                </div>

                {/* Expiry + Download */}
                <div className="shrink-0 flex flex-col items-end gap-2">
                  <span
                    className={`text-xs font-medium ${
                      expiry.expired ? 'text-red-400' : 'text-[#8888aa]'
                    }`}
                  >
                    {expiry.text}
                  </span>
                  {!expiry.expired && (
                    <Link
                      href={`/download/${order.downloadToken}`}
                      className="inline-flex items-center px-3 py-1 rounded-lg bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs font-medium transition-colors"
                    >
                      Download
                    </Link>
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
