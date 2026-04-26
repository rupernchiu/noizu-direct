import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { AddToCartButton } from '@/components/ui/AddToCartButton'
import { WishlistButton } from '@/components/ui/WishlistButton'
import { ShareButton } from '@/components/ui/ShareButton'
import { ImageGallery } from '@/components/ui/ImageGallery'
import { JsonLd } from '@/components/seo/JsonLd'
import { SEO_CONFIG } from '@/lib/seo-config'
import { auth } from '@/lib/auth'
import { ProductViewTracker } from '@/components/ui/ProductViewTracker'
import { ProductCard } from '@/components/ui/ProductCard'
import { ProductReviewForm } from '@/components/ui/ProductReviewForm'
import {
  ProductRail, CreatorRail, ArticleRail, dailyShuffle,
  type RailProduct, type RailCreator, type RailArticle,
} from '@/components/discovery/RecommendationRails'
import { convertUsdCentsTo } from '@/lib/fx'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const product = await prisma.product.findUnique({
    where: { id, isActive: true },
    include: { creator: { select: { displayName: true, username: true } } },
  })
  if (!product) return {}

  const images: string[] = (() => { try { return JSON.parse(product.images) } catch { return [] } })()
  const price = `USD ${(product.price / 100).toFixed(2)}`
  const delivery = product.type === 'DIGITAL' ? 'Instant digital download.' : 'Ships from Southeast Asia.'
  const description = `${product.description ? product.description.slice(0, 100) + '. ' : ''}By ${product.creator.displayName}. ${price}. ${delivery}`
  const title = `${product.title} by ${product.creator.displayName}`
  const url = `${SEO_CONFIG.siteUrl}/product/${id}`

  // Images must be absolute URLs for Open Graph scrapers
  const abs = (src: string) =>
    src.startsWith('http') ? src : `${SEO_CONFIG.siteUrl}${src.startsWith('/') ? '' : '/'}${src}`
  const ogImages = images.slice(0, 4).map((img, i) => ({
    url: abs(img),
    alt: `${product.title} image ${i + 1}`,
  }))
  const ogImage = ogImages[0]?.url ?? abs(SEO_CONFIG.defaultOgImage)

  return {
    title,
    description: description.slice(0, 160),
    alternates: { canonical: url },
    openGraph: {
      title,
      description: description.slice(0, 160),
      url,
      type: 'website',
      images: ogImages,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: description.slice(0, 160),
      images: [ogImage],
    },
  }
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

// SEA-buyer hint currencies. We render small "≈ MYR X · SGD Y" copy under the
// USD price so a Malaysian or Singaporean buyer can eyeball the spend without
// having to flip the checkout selector. Server-rendered using the same FX
// helper that powers the checkout converter, so the numbers don't drift.
const PRODUCT_PAGE_HINT_CURRENCIES = ['MYR', 'SGD'] as const

async function getPriceHints(amountUsdCents: number): Promise<Array<{ code: string; formatted: string }>> {
  const out: Array<{ code: string; formatted: string }> = []
  for (const code of PRODUCT_PAGE_HINT_CURRENCIES) {
    try {
      const { displayAmount } = await convertUsdCentsTo(amountUsdCents, code)
      const major = displayAmount / 100
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: code,
        maximumFractionDigits: 2,
      }).format(major)
      out.push({ code, formatted })
    } catch {
      // FX upstream down — skip this currency rather than failing the page render.
    }
  }
  return out
}

function parseImages(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as string[]).filter(Boolean) : []
  } catch {
    return []
  }
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const CATEGORY_LABELS: Record<string, string> = {
  DIGITAL_ART: 'Digital Art',
  DOUJIN: 'Doujin',
  COSPLAY_PRINT: 'Cosplay Print',
  PHYSICAL_MERCH: 'Physical Merch',
  STICKERS: 'Stickers',
}

const TYPE_LABELS: Record<string, string> = {
  DIGITAL: 'Digital',
  PHYSICAL: 'Physical',
}

export default async function ProductPage({ params }: PageProps) {
  const { id } = await params

  const product = await prisma.product.findUnique({
    where: { id, isActive: true },
    include: {
      creator: {
        include: { user: { select: { id: true } } },
      },
    },
  })

  if (!product) notFound()

  const priceHints = await getPriceHints(product.price)

  const recommendations = await prisma.productRecommendation.findMany({
    where: { sourceProductId: product.id },
    orderBy: { score: 'desc' },
    take: 6,
    select: {
      score: true,
      recommendedProduct: {
        select: {
          id: true, title: true, price: true, images: true,
          description: true, category: true, type: true,
          creator: { select: { username: true, displayName: true, avatar: true, isVerified: true, isTopCreator: true } },
        },
      },
    },
  })

  const [relatedProductsRaw, relatedCreatorsRaw, relatedArticlesRaw] = await Promise.all([
    prisma.product.findMany({
      where: {
        isActive: true,
        id: { not: product.id },
        OR: [{ category: product.category }, { type: product.type }],
      },
      select: {
        id: true, title: true, price: true, images: true,
        creator: { select: { username: true, displayName: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
    prisma.creatorProfile.findMany({
      where: { id: { not: product.creatorId }, isSuspended: false },
      select: {
        username: true, displayName: true, avatar: true, isVerified: true, categoryTags: true,
      },
      orderBy: { totalSales: 'desc' },
      take: 30,
    }),
    prisma.post.findMany({
      where: { status: 'PUBLISHED' },
      select: { slug: true, title: true, excerpt: true, coverImage: true },
      orderBy: { publishedAt: 'desc' },
      take: 12,
    }),
  ])

  const relatedProducts: RailProduct[] = dailyShuffle(relatedProductsRaw, 3).slice(0, 6)
  const relatedCreators: RailCreator[] = dailyShuffle(relatedCreatorsRaw, 4)
    .slice(0, 6)
    .map((c) => {
      let tags: string[] = []
      try { tags = JSON.parse(c.categoryTags) } catch {}
      return { username: c.username, displayName: c.displayName, avatar: c.avatar, isVerified: c.isVerified, categoryTags: tags }
    })
  const relatedArticles: RailArticle[] = dailyShuffle(relatedArticlesRaw, 5).slice(0, 6)

  const session = await auth()
  const userId = (session?.user as any)?.id as string | undefined
  const userRole = (session?.user as any)?.role as string | undefined

  const [reviewsData, reviewBreakdown, existingReview] = await Promise.all([
    prisma.productReview.findMany({
      where: { productId: product.id, isVisible: true, status: 'APPROVED' },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true, rating: true, title: true, body: true, isVerified: true, createdAt: true,
        buyer: { select: { name: true, avatar: true } },
      },
    }),
    prisma.productReview.groupBy({
      by: ['rating'],
      where: { productId: product.id, isVisible: true, status: 'APPROVED' },
      _count: { id: true },
    }),
    userId && (userRole === 'BUYER' || userRole === 'CREATOR')
      ? prisma.productReview.findFirst({
          where: { productId: product.id, buyerId: userId },
          select: { id: true },
        })
      : Promise.resolve(null),
  ])
  const reviewTotal = reviewBreakdown.reduce((sum, r) => sum + r._count.id, 0)
  const avgRating = reviewTotal > 0
    ? reviewBreakdown.reduce((sum, r) => sum + r.rating * r._count.id, 0) / reviewTotal
    : 0

  const images = parseImages(product.images)
  const isPhysical = product.type === 'PHYSICAL'
  const isPreOrder = (product as any).isPreOrder as boolean
  const inStock = isPreOrder || !isPhysical || (product.stock != null && product.stock > 0)

  const sizeVariants: string[] = (() => {
    try { return JSON.parse((product as any).sizeVariants ?? '[]') } catch { return [] }
  })()
  const colorVariants: { name: string; mockupImage: string }[] = (() => {
    try { return JSON.parse((product as any).colorVariants ?? '[]') } catch { return [] }
  })()

  const categoryLabel = CATEGORY_LABELS[product.category] || product.category
  const jsonLdInStock = product.isActive && (product.type === 'DIGITAL' || product.type === 'POD' || (product.stock !== null && product.stock > 0))

  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description,
    image: images,
    sku: product.id,
    brand: { '@type': 'Brand', name: product.creator.displayName },
    seller: { '@type': 'Person', name: product.creator.displayName, url: `https://noizu.direct/creator/${product.creator.username}` },
    offers: {
      '@type': 'Offer',
      url: `https://noizu.direct/product/${product.id}`,
      price: (product.price / 100).toFixed(2),
      priceCurrency: 'USD',
      availability: jsonLdInStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Person', name: product.creator.displayName },
    },
    category: categoryLabel,
  }

  const productBreadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://noizu.direct' },
      { '@type': 'ListItem', position: 2, name: 'Marketplace', item: 'https://noizu.direct/marketplace' },
      { '@type': 'ListItem', position: 3, name: categoryLabel, item: `https://noizu.direct/marketplace?category=${product.category.toLowerCase().replace(/_/g, '-')}` },
      { '@type': 'ListItem', position: 4, name: product.title, item: `https://noizu.direct/product/${product.id}` },
    ],
  }

  return (
    <div className="min-h-screen bg-background py-8 pb-24 md:pb-8">
      <JsonLd data={[productSchema, productBreadcrumbSchema]} />
      <ProductViewTracker productId={product.id} userId={(session?.user as any)?.id} />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
          <span>/</span>
          <Link href="/marketplace" className="hover:text-foreground transition-colors">Marketplace</Link>
          <span>/</span>
          <span className="text-foreground truncate max-w-xs">{product.title}</span>
        </nav>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          {/* Left: Image gallery */}
          <ImageGallery images={images} title={product.title} />

          {/* Right: Details — unchanged */}
          <div className="flex flex-col gap-5">
            {/* Category + type badges */}
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary border border-secondary/30">
                {CATEGORY_LABELS[product.category] ?? product.category}
              </span>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary border border-primary/30">
                {TYPE_LABELS[product.type] ?? product.type}
              </span>
            </div>

            {/* Pre-order badge */}
            {isPreOrder && (
              <span className="inline-flex items-center rounded-full bg-purple-500/10 border border-purple-500/30 px-3 py-1 text-xs font-semibold text-purple-400">
                Pre-Order
              </span>
            )}

            {/* Title */}
            <h1 className="text-2xl font-bold leading-tight text-foreground sm:text-3xl">
              {product.title}
            </h1>

            {/* Pre-order callout */}
            {isPreOrder && (
              <div className="rounded-xl bg-purple-500/5 border border-purple-500/20 p-4 space-y-1">
                {(product as any).preOrderMessage && (
                  <p className="text-sm text-purple-300">{(product as any).preOrderMessage}</p>
                )}
                {(product as any).preOrderReleaseAt && (
                  <p className="text-xs text-muted-foreground">
                    Expected:{' '}
                    {new Date((product as any).preOrderReleaseAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </p>
                )}
              </div>
            )}

            {/* Rating display */}
            {reviewTotal > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-yellow-400 text-sm">{'★'.repeat(Math.round(avgRating))}{'☆'.repeat(5 - Math.round(avgRating))}</span>
                <span className="text-sm text-muted-foreground">{avgRating.toFixed(1)} ({reviewTotal} review{reviewTotal !== 1 ? 's' : ''})</span>
              </div>
            )}

            {/* Price */}
            <div className="flex flex-col gap-1">
              <span className="text-3xl font-bold text-primary">{formatPrice(product.price)} <span className="text-base font-normal text-muted-foreground">USD</span></span>
              {priceHints.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  ≈ {priceHints.map(h => h.formatted).join(' · ')}
                </span>
              )}
              <span className="text-xs text-muted-foreground">A 2.5% processing fee is added at checkout</span>
            </div>

            {/* Stock indicator */}
            {isPhysical && (
              <div className="flex items-center gap-2">
                {inStock ? (
                  <>
                    <span className="size-2 rounded-full bg-success" />
                    <span className="text-sm text-success">
                      In stock{product.stock != null ? `: ${product.stock}` : ''}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="size-2 rounded-full bg-destructive" />
                    <span className="text-sm text-destructive">Out of stock</span>
                  </>
                )}
              </div>
            )}

            {/* Description */}
            <div className="rounded-xl bg-card border border-border p-4">
              <h2 className="mb-2 text-sm font-semibold text-foreground">Description</h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {product.description}
              </p>
            </div>

            {/* Creator card */}
            <div className="rounded-xl bg-card border border-border p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sold by</p>
              <Link
                href={`/creator/${product.creator.username}`}
                className="flex items-center gap-3 group"
              >
                {product.creator.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.creator.avatar}
                    alt={product.creator.displayName}
                    className="size-10 rounded-full object-cover border border-border"
                  />
                ) : (
                  <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-sm font-bold text-white">
                    {getInitials(product.creator.displayName)}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {product.creator.displayName}
                    </span>
                    {product.creator.isVerified && (
                      <svg className="size-4 text-secondary" viewBox="0 0 16 16" fill="currentColor" aria-label="Verified">
                        <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zm3.646 5.146a.5.5 0 0 0-.707 0L6.5 9.586 5.061 8.146a.5.5 0 1 0-.707.708l1.793 1.793a.5.5 0 0 0 .707 0l4.793-4.793a.5.5 0 0 0 0-.708z" />
                      </svg>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">@{product.creator.username}</span>
                </div>
              </Link>
            </div>

            {/* What you'll receive */}
            <div className="rounded-xl bg-card border border-border p-4">
              <h2 className="mb-3 text-sm font-semibold text-foreground">What you&apos;ll receive</h2>
              {product.type === 'DIGITAL' && (
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <span className="text-success">✓</span> Instant digital download after payment
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-success">✓</span> Download link sent to your email
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-success">✓</span> Accessible from your Downloads page
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-success">✓</span> noizu.direct Member Protection covers this purchase
                  </li>
                </ul>
              )}
              {product.type === 'PHYSICAL' && (
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <span className="text-success">✓</span> Ships from Southeast Asia
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-success">✓</span> Payment held in escrow until you confirm delivery
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-success">✓</span> 14-day dispute window after shipping
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-success">✓</span> noizu.direct Member Protection covers this purchase
                  </li>
                </ul>
              )}
              {product.type === 'POD' && (
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <span className="text-success">✓</span> Made-to-order — production begins after payment
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-success">✓</span> Ships within 7–14 business days
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-success">✓</span> Payment held in escrow until delivery
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-success">✓</span> noizu.direct Member Protection covers this purchase
                  </li>
                </ul>
              )}
            </div>

            {/* Button rows */}
            <div className="flex flex-col gap-2">
              <AddToCartButton
                productId={product.id}
                productType={product.type}
                stock={product.stock}
                sizeVariants={sizeVariants}
                colorVariants={colorVariants}
              />
              <div className="flex gap-2">
                <WishlistButton productId={product.id} variant="pill" className="flex-1" />
                <ShareButton productTitle={product.title} creatorName={product.creator.displayName} firstImage={images[0] ?? null} className="flex-1" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {recommendations.length >= 2 && (
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 mt-12 mb-8">
          <h2 className="text-lg font-bold text-foreground mb-4">Buyers also purchased</h2>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
            {recommendations.map(({ recommendedProduct: p }) => (
              <div key={p.id} className="shrink-0 w-48">
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reviews */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 mt-12">
        <h2 className="text-lg font-bold text-foreground mb-4">
          Reviews {reviewTotal > 0 && <span className="text-muted-foreground font-normal text-base">({reviewTotal})</span>}
        </h2>

        {reviewTotal === 0 ? (
          <p className="text-muted-foreground text-sm py-6">No reviews yet. Be the first to review this product.</p>
        ) : (
          <>
            {/* Rating summary */}
            <div className="flex items-center gap-6 mb-6 bg-card border border-border rounded-xl p-4">
              <div className="text-center">
                <div className="text-4xl font-bold text-foreground">{avgRating.toFixed(1)}</div>
                <div className="text-yellow-400 text-lg">{'★'.repeat(Math.round(avgRating))}{'☆'.repeat(5 - Math.round(avgRating))}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{reviewTotal} review{reviewTotal !== 1 ? 's' : ''}</div>
              </div>
              <div className="flex-1 space-y-1">
                {[5, 4, 3, 2, 1].map(star => {
                  const count = reviewBreakdown.find(r => r.rating === star)?._count.id ?? 0
                  const pct = reviewTotal > 0 ? Math.round((count / reviewTotal) * 100) : 0
                  return (
                    <div key={star} className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground w-4">{star}★</span>
                      <div className="flex-1 h-2 rounded-full bg-border overflow-hidden">
                        <div className="h-full rounded-full bg-yellow-400" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-muted-foreground w-8 text-right">{pct}%</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Review list */}
            <div className="space-y-4">
              {reviewsData.map(review => (
                <div key={review.id} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    {review.buyer.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={review.buyer.avatar} alt={review.buyer.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                        {review.buyer.name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground">{review.buyer.name}</span>
                        {review.isVerified && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/15 text-green-500 font-medium">Verified Purchase</span>
                        )}
                        <span className="text-xs text-muted-foreground ml-auto">
                          {new Date(review.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          {' · '}
                          {new Date(review.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                        </span>
                      </div>
                      <div className="text-yellow-400 text-sm mt-0.5">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</div>
                      {review.title && <p className="text-sm font-semibold text-foreground mt-1">{review.title}</p>}
                      {review.body && <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{review.body}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        <ProductReviewForm
          productId={product.id}
          userRole={userRole ?? null}
          alreadyReviewed={Boolean(existingReview)}
        />
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pb-10">
        <ProductRail title="Related Products" products={relatedProducts} />
        <CreatorRail title="Related Creators" creators={relatedCreators} />
        <ArticleRail articles={relatedArticles} />
      </div>

      {/* Sticky mobile CTA bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-background/95 backdrop-blur-sm border-t border-border px-4 py-3 flex items-center gap-3">
        <div className="flex-1">
          <span className="text-lg font-bold text-primary">{formatPrice(product.price)}</span>
          <span className="text-xs text-muted-foreground block">+ 2.5% fee at checkout</span>
        </div>
        <WishlistButton productId={product.id} />
        <AddToCartButton
          productId={product.id}
          productType={product.type}
          stock={product.stock}
          sizeVariants={sizeVariants}
          colorVariants={colorVariants}
          className="flex-1"
        />
      </div>
    </div>
  )
}
