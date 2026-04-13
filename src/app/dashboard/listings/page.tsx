import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { ListingsActions } from './ListingsActions'

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

export default async function ListingsPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if ((session.user as any).role !== 'CREATOR') redirect('/')
  const userId = (session.user as any).id

  const profile = await prisma.creatorProfile.findUnique({ where: { userId } })
  if (!profile) redirect('/')

  const products = await prisma.product.findMany({
    where: { creatorId: profile.id },
    orderBy: [{ isPinned: 'desc' }, { order: 'asc' }, { createdAt: 'desc' }],
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#f0f0f5]">Listings</h1>
          <p className="text-sm text-[#8888aa] mt-1">{products.length} product{products.length !== 1 ? 's' : ''}</p>
        </div>
        <Link
          href="/dashboard/listings/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-sm font-medium transition-colors"
        >
          + New Product
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="bg-[#16161f] rounded-xl border border-[#2a2a3a] px-5 py-12 text-center">
          <p className="text-[#8888aa] text-sm">No listings yet.</p>
          <Link
            href="/dashboard/listings/new"
            className="mt-3 inline-block text-[#7c3aed] text-sm hover:underline"
          >
            Create your first product
          </Link>
        </div>
      ) : (
        <div className="bg-[#16161f] rounded-xl border border-[#2a2a3a] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-[#8888aa] border-b border-[#2a2a3a]">
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
                  <tr
                    key={product.id}
                    className="border-b border-[#2a2a3a] last:border-0 hover:bg-[#1e1e2a]/50"
                  >
                    <td className="px-5 py-3">
                      <span className="font-medium text-[#f0f0f5] line-clamp-1">{product.title}</span>
                    </td>
                    <td className="px-5 py-3 text-[#8888aa]">{product.category}</td>
                    <td className="px-5 py-3 text-[#8888aa]">{product.type}</td>
                    <td className="px-5 py-3 text-[#f0f0f5]">{formatPrice(product.price)}</td>
                    <td className="px-5 py-3">
                      <ListingsActions
                        productId={product.id}
                        isActive={product.isActive}
                        isPinned={product.isPinned}
                        mode="status"
                      />
                    </td>
                    <td className="px-5 py-3">
                      <ListingsActions
                        productId={product.id}
                        isActive={product.isActive}
                        isPinned={product.isPinned}
                        mode="pin"
                      />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/dashboard/listings/${product.id}/edit`}
                          className="text-xs text-[#7c3aed] hover:underline"
                        >
                          Edit
                        </Link>
                        <ListingsActions
                          productId={product.id}
                          isActive={product.isActive}
                          isPinned={product.isPinned}
                          mode="delete"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
