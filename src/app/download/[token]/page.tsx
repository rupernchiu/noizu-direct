import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'

interface PageProps {
  params: Promise<{ token: string }>
}

export default async function DownloadPage({ params }: PageProps) {
  const { token } = await params

  const order = await prisma.order.findFirst({
    where: { downloadToken: token },
    include: { product: true },
  })

  if (!order) notFound()

  const isExpired = !order.downloadExpiry || order.downloadExpiry < new Date()

  if (isExpired) {
    return (
      <div className="min-h-screen bg-[#0d0d12] flex items-center justify-center py-16">
        <div className="mx-auto max-w-md px-4 text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f59e0b]/10 ring-4 ring-[#f59e0b]/20">
              <svg className="h-8 w-8 text-[#f59e0b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-[#f0f0f5]">Download Expired</h1>
          <p className="mt-3 text-[#8888aa]">
            This download link has expired. Download links are valid for 48 hours after purchase.
          </p>
          <p className="mt-2 text-sm text-[#8888aa]">
            Please contact support if you need assistance accessing your file.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/marketplace"
              className="rounded-xl bg-[#1e1e2a] border border-[#2a2a3a] px-6 py-3 text-sm font-medium text-[#8888aa] hover:text-[#f0f0f5] hover:border-[#7c3aed]/30 transition-all"
            >
              Browse Marketplace
            </Link>
            <Link
              href="/account/orders"
              className="rounded-xl bg-[#7c3aed] px-6 py-3 text-sm font-semibold text-white hover:bg-[#6d28d9] transition-colors"
            >
              View My Orders
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const hoursLeft = order.downloadExpiry
    ? Math.max(0, Math.floor((order.downloadExpiry.getTime() - Date.now()) / (1000 * 60 * 60)))
    : 0

  return (
    <div className="min-h-screen bg-[#0d0d12] flex items-center justify-center py-16">
      <div className="mx-auto max-w-md px-4">
        <div className="rounded-xl bg-[#1e1e2a] border border-[#2a2a3a] overflow-hidden">
          <div className="p-6 border-b border-[#2a2a3a]">
            <div className="mb-4 flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#7c3aed]/10 ring-4 ring-[#7c3aed]/20">
                <svg className="h-7 w-7 text-[#7c3aed]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </div>
            </div>
            <h1 className="text-center text-xl font-bold text-[#f0f0f5]">Your Download is Ready</h1>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#8888aa]">Product</p>
              <p className="mt-1 font-semibold text-[#f0f0f5]">{order.product.title}</p>
            </div>

            <div className="rounded-lg bg-[#0d0d12] p-3">
              <p className="text-xs text-[#8888aa]">
                ⏱ Link expires in{' '}
                <span className="font-semibold text-[#f0f0f5]">{hoursLeft} hour{hoursLeft !== 1 ? 's' : ''}</span>
              </p>
            </div>

            <a
              href={`/api/download/${token}`}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#7c3aed] py-4 text-center font-semibold text-white hover:bg-[#6d28d9] transition-colors"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download File
            </a>

            <p className="text-center text-xs text-[#8888aa]">
              Having trouble?{' '}
              <Link href="/account/orders" className="text-[#7c3aed] hover:underline">
                View your orders
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
