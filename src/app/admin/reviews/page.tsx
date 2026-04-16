import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { ReviewVisibilityToggle } from './ReviewVisibilityToggle'

const PER_PAGE = 20

interface SearchParams {
  productId?: string
  rating?: string
  visible?: string
  page?: string
}

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/')

  const params = await searchParams
  const productId = params.productId ?? undefined
  const ratingRaw = parseInt(params.rating ?? '')
  const rating = ratingRaw >= 1 && ratingRaw <= 5 ? ratingRaw : undefined
  const visibleParam = params.visible
  const visible = visibleParam === 'true' ? true : visibleParam === 'false' ? false : undefined
  const page = Math.max(1, parseInt(params.page ?? '1') || 1)
  const skip = (page - 1) * PER_PAGE

  const where: any = {}
  if (productId) where.productId = productId
  if (rating !== undefined) where.rating = rating
  if (visible !== undefined) where.isVisible = visible

  const [total, reviews, productsWithReviews] = await Promise.all([
    prisma.productReview.count({ where }),
    prisma.productReview.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: PER_PAGE,
      select: {
        id: true,
        rating: true,
        title: true,
        body: true,
        isVerified: true,
        isVisible: true,
        createdAt: true,
        product: { select: { id: true, title: true } },
        buyer: { select: { name: true, avatar: true } },
      },
    }),
    prisma.product.findMany({
      where: { reviews: { some: {} } },
      select: { id: true, title: true },
      orderBy: { title: 'asc' },
    }),
  ])

  const start = skip + 1
  const end = Math.min(skip + reviews.length, total)

  const buildUrl = (overrides: Record<string, string | undefined>) => {
    const p: Record<string, string> = {}
    if (productId) p.productId = productId
    if (rating !== undefined) p.rating = String(rating)
    if (visible !== undefined) p.visible = String(visible)
    if (page > 1) p.page = String(page)
    Object.assign(p, overrides)
    // remove undefined keys
    for (const key of Object.keys(p)) {
      if (p[key] === undefined) delete p[key]
    }
    const qs = new URLSearchParams(p).toString()
    return `/admin/reviews${qs ? `?${qs}` : ''}`
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          Reviews{' '}
          <span className="text-sm font-normal text-muted-foreground">({total})</span>
        </h2>
      </div>

      {/* Filters */}
      <form method="GET" action="/admin/reviews" className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground font-medium">Product</label>
          <select
            name="productId"
            defaultValue={productId ?? ''}
            className="rounded-lg border border-border bg-card text-foreground text-sm px-3 py-2 focus:outline-none focus:border-primary"
          >
            <option value="">All Products</option>
            {productsWithReviews.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground font-medium">Rating</label>
          <select
            name="rating"
            defaultValue={rating !== undefined ? String(rating) : ''}
            className="rounded-lg border border-border bg-card text-foreground text-sm px-3 py-2 focus:outline-none focus:border-primary"
          >
            <option value="">All</option>
            {[5, 4, 3, 2, 1].map((r) => (
              <option key={r} value={String(r)}>
                {'★'.repeat(r)}{'☆'.repeat(5 - r)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground font-medium">Visibility</label>
          <select
            name="visible"
            defaultValue={visible !== undefined ? String(visible) : ''}
            className="rounded-lg border border-border bg-card text-foreground text-sm px-3 py-2 focus:outline-none focus:border-primary"
          >
            <option value="">All</option>
            <option value="true">Visible</option>
            <option value="false">Hidden</option>
          </select>
        </div>

        <button
          type="submit"
          className="rounded-lg bg-primary text-white text-sm font-medium px-4 py-2 hover:bg-primary/90 transition-colors"
        >
          Filter
        </button>

        <Link
          href="/admin/reviews"
          className="rounded-lg border border-border text-muted-foreground text-sm font-medium px-4 py-2 hover:text-foreground hover:border-primary/40 transition-colors"
        >
          Clear
        </Link>
      </form>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Product</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Buyer</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Rating</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Title</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Body</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Verified</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Date</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Visible</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((review) => (
                <tr key={review.id} className="border-b border-border last:border-0 hover:bg-surface">
                  <td className="px-4 py-3 text-foreground text-xs max-w-[140px] truncate">
                    <a
                      href={`/admin/reviews?productId=${review.product.id}`}
                      className="text-primary hover:underline"
                    >
                      {review.product.title}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                    {review.buyer.name}
                  </td>
                  <td className="px-4 py-3 text-yellow-400 text-xs whitespace-nowrap">
                    {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                  </td>
                  <td className="px-4 py-3 text-foreground text-xs max-w-[120px] truncate">
                    {review.title ?? <span className="text-muted-foreground/50">—</span>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs max-w-[200px]">
                    {review.body
                      ? review.body.length > 80
                        ? review.body.slice(0, 80) + '…'
                        : review.body
                      : <span className="text-muted-foreground/50">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {review.isVerified ? (
                      <span className="px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-400 font-medium">
                        Verified
                      </span>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {review.isVisible ? (
                      <span className="px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-400 font-medium">
                        Visible
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-xs bg-border text-muted-foreground font-medium">
                        Hidden
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <ReviewVisibilityToggle id={review.id} isVisible={review.isVisible} />
                  </td>
                </tr>
              ))}
              {reviews.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                    No reviews match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {start}–{end} of {total} review{total !== 1 ? 's' : ''}
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link
                href={buildUrl({ page: String(page - 1) })}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:text-foreground hover:border-primary/40 transition-colors"
              >
                Previous
              </Link>
            ) : (
              <span className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium opacity-40 cursor-not-allowed">
                Previous
              </span>
            )}
            {end < total ? (
              <Link
                href={buildUrl({ page: String(page + 1) })}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:text-foreground hover:border-primary/40 transition-colors"
              >
                Next
              </Link>
            ) : (
              <span className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium opacity-40 cursor-not-allowed">
                Next
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
