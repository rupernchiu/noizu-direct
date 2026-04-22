import type { Metadata } from 'next'
import { MarketplaceClient } from './MarketplaceClient'
import { CATEGORY_META, CATEGORY_KEY_MAP } from '@/lib/categories'
import { JsonLd } from '@/components/seo/JsonLd'
import { prisma } from '@/lib/prisma'
import {
  ProductRail, ArticleRail, dailyShuffle,
  type RailProduct, type RailArticle,
} from '@/components/discovery/RecommendationRails'

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}): Promise<Metadata> {
  const params = await searchParams
  const catSlug = params.category || ''
  const catKey = CATEGORY_KEY_MAP[catSlug] || null
  const meta = catKey ? CATEGORY_META[catKey] : null

  if (meta) {
    return {
      title: `${meta.h1} | noizu.direct`,
      description: meta.description,
      keywords: meta.keywords,
      alternates: { canonical: `https://noizu.direct/marketplace?category=${meta.slug}` },
      openGraph: {
        title: `${meta.h1} | noizu.direct`,
        description: meta.description,
        url: `https://noizu.direct/marketplace?category=${meta.slug}`,
        images: [{ url: meta.ogImage, width: 1200, height: 630, alt: meta.h1 }],
      },
    }
  }

  return {
    title: 'Browse Creator Products | noizu.direct Marketplace',
    description: 'Discover original art, doujin, cosplay prints and merch from Southeast Asian creators. Shop digital downloads and physical products.',
    alternates: { canonical: 'https://noizu.direct/marketplace' },
    openGraph: {
      title: 'Browse Creator Products | noizu.direct Marketplace',
      description: 'Discover original art, doujin, cosplay prints and merch from Southeast Asian creators.',
      url: 'https://noizu.direct/marketplace',
      images: [{ url: '/images/og-default.jpg', width: 1200, height: 630, alt: 'noizu.direct Marketplace' }],
    },
  }
}

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const params = await searchParams
  const catSlug = params.category || ''
  const catKey = CATEGORY_KEY_MAP[catSlug] || null
  const meta = catKey ? CATEGORY_META[catKey] : null

  // Map slug to DB category value (uppercase)
  const dbCategory = catKey || 'ALL'

  // Build JSON-LD for category page
  const collectionSchema = meta ? {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: meta.h1,
    description: meta.description,
    url: `https://noizu.direct/marketplace?category=${meta.slug}`,
  } : null

  const breadcrumbSchema = meta ? {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://noizu.direct' },
      { '@type': 'ListItem', position: 2, name: 'Marketplace', item: 'https://noizu.direct/marketplace' },
      { '@type': 'ListItem', position: 3, name: meta.name, item: `https://noizu.direct/marketplace?category=${meta.slug}` },
    ],
  } : {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://noizu.direct' },
      { '@type': 'ListItem', position: 2, name: 'Marketplace', item: 'https://noizu.direct/marketplace' },
    ],
  }

  const schemas = [breadcrumbSchema, collectionSchema].filter(Boolean) as object[]

  const [railProductsRaw, railArticlesRaw] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true, title: true, price: true, images: true,
        creator: { select: { username: true, displayName: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 40,
    }),
    prisma.post.findMany({
      where: { status: 'PUBLISHED' },
      select: { slug: true, title: true, excerpt: true, coverImage: true },
      orderBy: { publishedAt: 'desc' },
      take: 12,
    }),
  ])

  const recommendedProducts: RailProduct[] = dailyShuffle(railProductsRaw, 1).slice(0, 6)
  const articleRail: RailArticle[] = dailyShuffle(railArticlesRaw, 2).slice(0, 6)

  return (
    <>
      <JsonLd data={schemas} />
      {meta && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-2">
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <a href="/marketplace" className="hover:text-foreground">Marketplace</a>
            <span>›</span>
            <span className="text-foreground">{meta.name}</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-3">{meta.h1}</h1>
          <p className="text-muted-foreground max-w-2xl mb-4">{meta.description}</p>
          <div className="flex flex-wrap gap-2 mb-2 text-xs">
            {Object.values(CATEGORY_META)
              .filter(c => c.slug !== meta.slug)
              .map(c => (
                <a
                  key={c.slug}
                  href={`/marketplace?category=${c.slug}`}
                  className="px-3 py-1 rounded-full bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary transition-colors"
                >
                  {c.icon} {c.name}
                </a>
              ))}
          </div>
        </div>
      )}
      <MarketplaceClient initialCategory={dbCategory} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
        <ProductRail title="Recommended Products" products={recommendedProducts} />
        <ArticleRail articles={articleRail} />
      </div>
    </>
  )
}
