import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Suspense } from 'react'
import Link from 'next/link'
import { Download } from 'lucide-react'
import { SearchBar } from '@/components/ui/SearchBar'
import { Pagination } from '@/components/ui/Pagination'
import { CATEGORY_LABELS } from '@/lib/labels'

const PER_PAGE = 10

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

export default async function DownloadsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')
  const userId = (session.user as any).id

  const params = await searchParams
  const q = params.q?.trim() ?? ''
  const page = Math.max(1, parseInt(params.page ?? '1') || 1)

  const baseWhere: any = {
    buyerId: userId,
    status: 'PAID',
    product: { type: 'DIGITAL' },
    NOT: { downloadToken: null },
  }
  if (q) {
    baseWhere.product = { ...baseWhere.product, title: { contains: q } }
  }

  const [total, orders] = await Promise.all([
    prisma.order.count({ where: baseWhere }),
    prisma.order.findMany({
      where: baseWhere,
      include: {
        product: { select: { id: true, title: true, category: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Downloads</h1>
        <p className="text-sm text-muted-foreground mt-1">Your digital purchases</p>
      </div>

      <Suspense fallback={null}>
        <SearchBar placeholder="Search by product name..." className="max-w-sm" />
      </Suspense>

      {orders.length === 0 && total === 0 && !q ? (
        <div className="bg-surface rounded-xl border border-border p-12 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-card text-muted-foreground">
            <Download className="size-8" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-foreground">No downloads yet</h3>
          <p className="mb-6 text-sm text-muted-foreground max-w-sm mx-auto">
            Your digital purchases will appear here for easy access anytime.
          </p>
          <Link href="/marketplace?category=digital-art" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors">
            Browse Digital Products
          </Link>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-surface rounded-xl border border-border p-12 text-center">
          <p className="text-muted-foreground text-sm">No downloads match your search.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const expiry = getExpiryLabel(order.downloadExpiry)
            return (
              <div key={order.id} className="bg-surface rounded-xl border border-border p-4 flex items-center gap-4">
                <div className="shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center">
                  <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{order.product.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{CATEGORY_LABELS[order.product.category] ?? order.product.category}</p>
                </div>

                <div className="shrink-0 flex flex-col items-end gap-2">
                  <span className={`text-xs font-medium ${expiry.expired ? 'text-red-400' : 'text-muted-foreground'}`}>
                    {expiry.text}
                  </span>
                  {expiry.expired && (
                    <span className="text-xs text-muted-foreground">
                      Contact creator to refresh link
                    </span>
                  )}
                  {!expiry.expired && (
                    <Link
                      href={`/download/${order.downloadToken}`}
                      className="inline-flex items-center px-3 py-1 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-medium transition-colors"
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

      <Suspense fallback={null}>
        <Pagination total={total} page={page} perPage={PER_PAGE} />
      </Suspense>
    </div>
  )
}
