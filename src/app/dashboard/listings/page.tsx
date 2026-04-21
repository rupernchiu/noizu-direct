import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Suspense } from 'react'
import Link from 'next/link'
import { ListingsActions } from './ListingsActions'
import { SearchBar } from '@/components/ui/SearchBar'
import { FilterSelect } from '@/components/ui/FilterSelect'
import { Pagination } from '@/components/ui/Pagination'
import { Package, Plus } from 'lucide-react'

const PER_PAGE = 10

const CATEGORY_OPTIONS = [
  { value: 'DIGITAL_ART', label: 'Digital Art' },
  { value: 'DOUJIN', label: 'Doujin' },
  { value: 'COSPLAY_PRINT', label: 'Cosplay Prints' },
  { value: 'PHYSICAL_MERCH', label: 'Merch' },
  { value: 'STICKERS', label: 'Stickers' },
]
const TYPE_OPTIONS = [
  { value: 'DIGITAL', label: 'Digital' },
  { value: 'PHYSICAL', label: 'Physical' },
]
const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
]

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; category?: string; type?: string; status?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')
  if ((session.user as any).role !== 'CREATOR') redirect('/')
  const userId = (session.user as any).id

  const profile = await prisma.creatorProfile.findUnique({ where: { userId } })
  if (!profile) redirect('/dashboard')

  const params = await searchParams
  const q = params.q?.trim() ?? ''
  const page = Math.max(1, parseInt(params.page ?? '1') || 1)
  const category = params.category ?? ''
  const type = params.type ?? ''
  const status = params.status ?? ''

  const where: any = { creatorId: profile.id }
  if (q) where.title = { contains: q }
  if (category) where.category = category
  if (type) where.type = type
  if (status === 'ACTIVE') where.isActive = true
  if (status === 'INACTIVE') where.isActive = false

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: [{ isPinned: 'desc' }, { order: 'asc' }, { createdAt: 'desc' }],
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Listings</h1>
          <p className="text-sm text-muted-foreground mt-1">{total} product{total !== 1 ? 's' : ''}</p>
        </div>
        <Link
          href="/dashboard/listings/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-medium transition-colors"
        >
          + New Product
        </Link>
      </div>

      <div className="flex flex-wrap gap-3">
        <Suspense fallback={null}>
          <SearchBar placeholder="Search by title..." className="min-w-48 flex-1" />
          <FilterSelect paramName="category" options={CATEGORY_OPTIONS} allLabel="All Categories" className="w-44" />
          <FilterSelect paramName="type" options={TYPE_OPTIONS} allLabel="All Types" className="w-36" />
          <FilterSelect paramName="status" options={STATUS_OPTIONS} allLabel="All Statuses" className="w-36" />
        </Suspense>
      </div>

      {products.length === 0 && total === 0 && !q && !category && !type && !status ? (
        <div className="bg-surface rounded-xl border border-border p-12 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-card text-muted-foreground">
            <Package className="size-8" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-foreground">No products yet</h3>
          <p className="mb-6 text-sm text-muted-foreground max-w-sm mx-auto">
            Start selling by adding your first product. It only takes a few minutes.
          </p>
          <Link href="/dashboard/listings/new" className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors">
            <Plus className="size-4" /> Add Your First Product
          </Link>
        </div>
      ) : products.length === 0 ? (
        <div className="bg-surface rounded-xl border border-border px-5 py-12 text-center">
          <p className="text-muted-foreground text-sm">No products match your filters.</p>
        </div>
      ) : (
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border">
                  <th className="px-5 py-3 text-left font-medium">Title</th>
                  <th className="px-5 py-3 text-left font-medium">Category</th>
                  <th className="px-5 py-3 text-left font-medium">Type</th>
                  <th className="px-5 py-3 text-left font-medium">Price</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                  <th className="px-5 py-3 text-left font-medium">Pinned</th>
                  <th className="px-5 py-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-b border-border last:border-0 hover:bg-card/50">
                    <td className="px-5 py-3">
                      <span className="font-medium text-foreground line-clamp-1">{product.title}</span>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{product.category}</td>
                    <td className="px-5 py-3 text-muted-foreground">{product.type}</td>
                    <td className="px-5 py-3 text-foreground">{formatPrice(product.price)}</td>
                    <td className="px-5 py-3">
                      <ListingsActions productId={product.id} isActive={product.isActive} isPinned={product.isPinned} mode="status" />
                    </td>
                    <td className="px-5 py-3">
                      <ListingsActions productId={product.id} isActive={product.isActive} isPinned={product.isPinned} mode="pin" />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Link href={`/dashboard/listings/${product.id}/edit`} className="text-xs text-primary hover:underline">
                          Edit
                        </Link>
                        <ListingsActions productId={product.id} isActive={product.isActive} isPinned={product.isPinned} mode="delete" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Suspense fallback={null}>
        <Pagination total={total} page={page} perPage={PER_PAGE} />
      </Suspense>
    </div>
  )
}
