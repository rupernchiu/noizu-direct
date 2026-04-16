import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { ProductCard } from '@/components/ui/ProductCard'

interface NewDropsContent {
  title: string
  maxDisplay: number
  autoMode?: boolean
}

export default async function NewDropsSection({ content }: { content: NewDropsContent }) {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
    take: content.maxDisplay,
    select: {
      id: true,
      title: true,
      description: true,
      price: true,
      category: true,
      type: true,
      images: true,
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

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-foreground">{content.title}</h2>
          <Link href="/marketplace" className="text-sm text-primary hover:underline">
            View all →
          </Link>
        </div>

        {products.length === 0 ? (
          <p className="text-muted-foreground text-center py-16">No products yet — check back soon!</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
