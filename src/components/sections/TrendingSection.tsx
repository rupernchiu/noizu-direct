import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { ProductCard } from '@/components/ui/ProductCard'

export default async function TrendingSection() {
  let products = await prisma.product.findMany({
    where: { isActive: true, isTrendingSuppressed: false },
    orderBy: { trendingScore: 'desc' },
    take: 8,
    select: {
      id: true,
      title: true,
      description: true,
      price: true,
      category: true,
      type: true,
      images: true,
      trendingScore: true,
      creator: {
        select: {
          username: true,
          displayName: true,
          avatar: true,
          isVerified: true,
          isTopCreator: true,
        },
      },
    },
  })

  // Fallback: if all products have trendingScore === 0, query most recent instead
  if (products.length > 0 && products.every((p) => p.trendingScore === 0)) {
    products = await prisma.product.findMany({
      where: { isActive: true, isTrendingSuppressed: false },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: {
        id: true,
        title: true,
        description: true,
        price: true,
        category: true,
        type: true,
        images: true,
        trendingScore: true,
        creator: {
          select: {
            username: true,
            displayName: true,
            avatar: true,
            isVerified: true,
            isTopCreator: true,
          },
        },
      },
    })
  }

  if (products.length === 0) return null

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-foreground">Trending Now</h2>
          <Link href="/marketplace?sort=TRENDING" className="text-sm text-primary hover:underline">
            View all →
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>
    </section>
  )
}
