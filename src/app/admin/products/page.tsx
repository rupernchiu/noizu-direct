import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ProductAdminActions } from './ProductAdminActions'

export default async function AdminProductsPage() {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/')

  const products = await prisma.product.findMany({
    include: { creator: { select: { displayName: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-[#f0f0f5]">Products ({products.length})</h2>

      <div className="bg-[#1e1e2a] rounded-xl border border-[#2a2a3a] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a3a]">
                <th className="text-left px-4 py-3 text-[#8888aa] font-medium">Title</th>
                <th className="text-left px-4 py-3 text-[#8888aa] font-medium">Creator</th>
                <th className="text-left px-4 py-3 text-[#8888aa] font-medium">Type</th>
                <th className="text-left px-4 py-3 text-[#8888aa] font-medium">Price</th>
                <th className="text-left px-4 py-3 text-[#8888aa] font-medium">Category</th>
                <th className="text-left px-4 py-3 text-[#8888aa] font-medium">Created</th>
                <th className="text-left px-4 py-3 text-[#8888aa] font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-b border-[#2a2a3a] last:border-0 hover:bg-[#16161f]">
                  <td className="px-4 py-3 text-[#f0f0f5] font-medium max-w-xs truncate">{product.title}</td>
                  <td className="px-4 py-3 text-[#8888aa]">{product.creator.displayName}</td>
                  <td className="px-4 py-3 text-[#8888aa]">
                    <span className="px-2 py-0.5 rounded text-xs bg-[#2a2a3a]">{product.type}</span>
                  </td>
                  <td className="px-4 py-3 text-[#f0f0f5]">${(product.price / 100).toFixed(2)}</td>
                  <td className="px-4 py-3 text-[#8888aa]">{product.category}</td>
                  <td className="px-4 py-3 text-[#8888aa] text-xs">{new Date(product.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <ProductAdminActions productId={product.id} isActive={product.isActive} />
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-[#8888aa]">No products yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
