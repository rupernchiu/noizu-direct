import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'

interface PageProps {
  searchParams: Promise<{ orderId?: string }>
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export default async function OrderSuccessPage({ searchParams }: PageProps) {
  const { orderId } = await searchParams
  if (!orderId) notFound()

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { product: true },
  })

  if (!order) notFound()

  const isDigital = order.product.type !== 'PHYSICAL'
  const hasDownload = isDigital && !!order.downloadToken

  return (
    <div className="min-h-screen bg-[#0d0d12] py-16">
      {/* Decorative confetti dots */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute left-[10%] top-[15%] h-3 w-3 rounded-full bg-[#7c3aed] opacity-60 animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="absolute left-[20%] top-[30%] h-2 w-2 rounded-full bg-[#00d4aa] opacity-50 animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="absolute left-[75%] top-[20%] h-4 w-4 rounded-full bg-[#7c3aed] opacity-40 animate-bounce" style={{ animationDelay: '300ms' }} />
        <div className="absolute left-[85%] top-[40%] h-2 w-2 rounded-full bg-[#00d4aa] opacity-60 animate-bounce" style={{ animationDelay: '100ms' }} />
        <div className="absolute left-[50%] top-[10%] h-3 w-3 rounded-full bg-[#f59e0b] opacity-50 animate-bounce" style={{ animationDelay: '200ms' }} />
        <div className="absolute left-[35%] top-[25%] h-2 w-2 rotate-45 bg-[#7c3aed] opacity-40 animate-bounce" style={{ animationDelay: '250ms' }} />
        <div className="absolute left-[65%] top-[35%] h-2 w-2 rotate-45 bg-[#00d4aa] opacity-50 animate-bounce" style={{ animationDelay: '350ms' }} />
      </div>

      <div className="mx-auto max-w-lg px-4 sm:px-6">
        {/* Success icon */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-[#00d4aa]/10 ring-4 ring-[#00d4aa]/20">
            <svg className="h-10 w-10 text-[#00d4aa]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-[#f0f0f5]">Payment Successful!</h1>
          <p className="mt-2 text-[#8888aa]">Thank you for your purchase.</p>
        </div>

        {/* Order details card */}
        <div className="rounded-xl bg-[#1e1e2a] border border-[#2a2a3a] overflow-hidden">
          <div className="p-5 border-b border-[#2a2a3a]">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#8888aa]">
              Order Details
            </h2>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="font-semibold text-[#f0f0f5] leading-snug">{order.product.title}</p>
                <p className="mt-0.5 text-xs text-[#8888aa]">
                  {isDigital ? 'Digital Download' : 'Physical Product'}
                </p>
              </div>
              <span className="shrink-0 font-semibold text-[#00d4aa]">
                {formatPrice(order.amountUsd)}
              </span>
            </div>
          </div>

          <div className="p-5 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#8888aa]">Order ID</span>
              <span className="font-mono text-xs text-[#f0f0f5]">{order.id.slice(0, 16)}…</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#8888aa]">Status</span>
              <span className="rounded-full bg-[#00d4aa]/10 px-2.5 py-0.5 text-xs font-semibold text-[#00d4aa]">
                {order.status}
              </span>
            </div>
          </div>

          {/* Download / Tracking section */}
          {isDigital && (
            <div className="border-t border-[#2a2a3a] p-5">
              {hasDownload ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-[#f0f0f5]">Your file is ready</p>
                  <p className="text-xs text-[#8888aa]">Download link expires in 48 hours.</p>
                  <a
                    href={`/download/${order.downloadToken}`}
                    className="mt-3 flex items-center gap-2 rounded-lg bg-[#7c3aed] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#6d28d9] transition-colors w-fit"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download your file
                  </a>
                </div>
              ) : (
                <div className="rounded-lg bg-[#0d0d12] p-4">
                  <p className="text-sm text-[#8888aa]">
                    Your download link will be available shortly once payment is confirmed.
                  </p>
                </div>
              )}
            </div>
          )}

          {!isDigital && (
            <div className="border-t border-[#2a2a3a] p-5">
              <div className="rounded-lg bg-[#0d0d12] p-4">
                <p className="text-sm font-medium text-[#f0f0f5]">Shipping</p>
                {order.trackingNumber ? (
                  <p className="mt-1 text-sm text-[#8888aa]">
                    Tracking number: <span className="font-mono text-[#f0f0f5]">{order.trackingNumber}</span>
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-[#8888aa]">
                    Your order is being processed. You&apos;ll receive a tracking number once it ships.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Link
            href="/marketplace"
            className="rounded-xl bg-[#1e1e2a] border border-[#2a2a3a] py-3 text-center text-sm font-medium text-[#8888aa] hover:text-[#f0f0f5] hover:border-[#7c3aed]/30 transition-all"
          >
            Continue Shopping
          </Link>
          <Link
            href="/account/orders"
            className="rounded-xl bg-[#7c3aed] py-3 text-center text-sm font-semibold text-white hover:bg-[#6d28d9] transition-colors"
          >
            View All Orders
          </Link>
        </div>
      </div>
    </div>
  )
}
