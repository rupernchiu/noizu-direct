import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { ProductCard } from '@/components/ui/ProductCard'
import { getCached, setCached, CACHE_KEYS, CACHE_TTL } from '@/lib/redis'

type TrendingProduct = {
  id: string; title: string; description: string; price: number
  category: string; type: string; images: string; trendingScore: number
  creator: { username: string; displayName: string; avatar: string | null; isVerified: boolean; isTopCreator: boolean }
}

const SELECT = {
  id: true, title: true, description: true, price: true,
  category: true, type: true, images: true, trendingScore: true,
  creator: { select: { username: true, displayName: true, avatar: true, isVerified: true, isTopCreator: true } },
}

export default async function TrendingSection() {
  const cached = await getCached<TrendingProduct[]>(CACHE_KEYS.trending)
  let products: TrendingProduct[] = cached ?? []

  if (!cached) {
    products = await prisma.product.findMany({
      where: { isActive: true, isTrendingSuppressed: false },
      orderBy: { trendingScore: 'desc' },
      take: 8,
      select: SELECT,
    }) as TrendingProduct[]

    // Fallback: if all products have trendingScore === 0, query most recent instead
    if (products.length > 0 && products.every((p) => p.trendingScore === 0)) {
      products = await prisma.product.findMany({
        where: { isActive: true, isTrendingSuppressed: false },
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: SELECT,
      }) as TrendingProduct[]
    }

    await setCached(CACHE_KEYS.trending, products, CACHE_TTL.trending)
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
