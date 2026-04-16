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
      <div className="min-h-screen bg-background flex items-center justify-center py-16">
        <div className="mx-auto max-w-md px-4 text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-warning/10 ring-4 ring-warning/20">
              <svg className="h-8 w-8 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Download Expired</h1>
          <p className="mt-3 text-muted-foreground">
            This download link has expired. Download links are valid for 48 hours after purchase.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Please contact support if you need assistance accessing your file.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/marketplace"
              className="rounded-xl bg-card border border-border px-6 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
            >
              Browse Marketplace
            </Link>
            <Link
              href="/account/orders"
              className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
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
    <div className="min-h-screen bg-background flex items-center justify-center py-16">
      <div className="mx-auto max-w-md px-4">
        <div className="rounded-xl bg-card border border-border overflow-hidden">
          <div className="p-6 border-b border-border">
            <div className="mb-4 flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 ring-4 ring-ring/20">
                <svg className="h-7 w-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </div>
            </div>
            <h1 className="text-center text-xl font-bold text-foreground">Your Download is Ready</h1>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Product</p>
              <p className="mt-1 font-semibold text-foreground">{order.product.title}</p>
            </div>

            <div className="rounded-lg bg-background p-3">
              <p className="text-xs text-muted-foreground">
                ⏱ Link expires in{' '}
                <span className="font-semibold text-foreground">{hoursLeft} hour{hoursLeft !== 1 ? 's' : ''}</span>
              </p>
            </div>

            <a
              href={`/api/download/${token}`}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 text-center font-semibold text-white hover:bg-primary/90 transition-colors"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download File
            </a>

            <p className="text-center text-xs text-muted-foreground">
              Having trouble?{' '}
              <Link href="/account/orders" className="text-primary hover:underline">
                View your orders
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
