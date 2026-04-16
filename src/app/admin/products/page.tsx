import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Suspense } from 'react'
import { ProductAdminActions } from './ProductAdminActions'
import { SearchBar } from '@/components/ui/SearchBar'
import { Pagination } from '@/components/ui/Pagination'
import { ProductFilters } from './ProductFilters'

const PER_PAGE = 20

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string; page?: string
    category?: string; type?: string; status?: string; creator?: string
  }>
}) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/')

  const params   = await searchParams
  const q        = params.q?.trim() ?? ''
  const page     = Math.max(1, parseInt(params.page ?? '1') || 1)
  const category = params.category ?? ''
  const type     = params.type ?? ''
  const status   = params.status ?? ''
  const creator  = params.creator ?? ''   // CreatorProfile.id

  const where: any = {}
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { creator: { displayName: { contains: q } } },
    ]
  }
  if (category) where.category = category
  if (type)     where.type     = type
  if (status === 'ACTIVE')   where.isActive = true
  if (status === 'INACTIVE') where.isActive = false
  if (creator)  where.creatorId = creator

  const [total, products, allCreators] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: {
        creator: { select: { id: true, displayName: true } },
        trendingScoreRecord: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.creatorProfile.findMany({
      select: { id: true, displayName: true },
      orderBy: { displayName: 'asc' },
    }),
  ])

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Products</h2>

      <div className="flex flex-wrap gap-3 items-center">
        <Suspense fallback={null}>
          <SearchBar placeholder="Search by title or creator…" className="min-w-52 flex-1" />
        </Suspense>
      </div>

      <Suspense fallback={null}>
        <ProductFilters creators={allCreators} total={total} filtered={products.length} />
      </Suspense>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Title</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Creator</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Type</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Price</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Category</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Status</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Created</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Trending</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Boost</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-b border-border last:border-0 hover:bg-surface">
                  <td className="px-4 py-3 text-foreground font-medium max-w-xs truncate">{product.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">{product.creator.displayName}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <span className="px-2 py-0.5 rounded text-xs bg-border">{product.type}</span>
                  </td>
                  <td className="px-4 py-3 text-foreground">${(product.price / 100).toFixed(2)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{product.category}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${product.isActive ? 'bg-green-500/20 text-green-400' : 'bg-border text-muted-foreground'}`}>
                      {product.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(product.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-foreground text-xs">
                    {product.trendingScore.toFixed(2)}
                    {product.isTrendingSuppressed && <span className="ml-1 text-[10px] text-yellow-500">suppressed</span>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{product.manualBoost}</td>
                  <td className="px-4 py-3">
                    <ProductAdminActions
                      productId={product.id}
                      isActive={product.isActive}
                      manualBoost={product.manualBoost}
                      isTrendingSuppressed={product.isTrendingSuppressed}
                      breakdown={product.trendingScoreRecord?.breakdown ?? null}
                    />
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">
                    {q || category || type || status || creator
                      ? 'No products match your filters.'
                      : 'No products yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Suspense fallback={null}>
        <Pagination total={total} page={page} perPage={PER_PAGE} />
      </Suspense>
    </div>
  )
}
