import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { BuyButton } from '@/components/ui/BuyButton'
import { WishlistButton } from '@/components/ui/WishlistButton'
import { ImageGallery } from '@/components/ui/ImageGallery'
import { JsonLd } from '@/components/seo/JsonLd'
import { SEO_CONFIG } from '@/lib/seo-config'

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
  const price = `$${(product.price / 100).toFixed(2)} USD`
  const delivery = product.type === 'DIGITAL' ? 'Instant digital download.' : 'Ships from Southeast Asia.'
  const description = `${product.description ? product.description.slice(0, 100) + '. ' : ''}By ${product.creator.displayName}. ${price}. ${delivery}`
  const title = `${product.title} by ${product.creator.displayName}`
  const url = `${SEO_CONFIG.siteUrl}/product/${id}`
  const ogImage = images[0] || SEO_CONFIG.defaultOgImage

  return {
    title,
    description: description.slice(0, 160),
    alternates: { canonical: url },
    openGraph: {
      title,
      description: description.slice(0, 160),
      url,
      type: 'website',
      images: images.slice(0, 4).map((img, i) => ({ url: img, alt: `${product.title} image ${i + 1}` })),
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

  const images = parseImages(product.images)
  const isPhysical = product.type === 'PHYSICAL'
  const inStock = !isPhysical || (product.stock != null && product.stock > 0)

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

            {/* Title */}
            <h1 className="text-2xl font-bold leading-tight text-foreground sm:text-3xl">
              {product.title}
            </h1>

            {/* Price */}
            <div className="flex flex-col gap-1">
              <span className="text-3xl font-bold text-primary">{formatPrice(product.price)}</span>
              <span className="text-xs text-muted-foreground">2.5% processing fee may apply</span>
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
                    <span className="text-success">✓</span> NOIZU-DIRECT Buyer Protection covers this purchase
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
                    <span className="text-success">✓</span> NOIZU-DIRECT Buyer Protection covers this purchase
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
                    <span className="text-success">✓</span> NOIZU-DIRECT Buyer Protection covers this purchase
                  </li>
                </ul>
              )}
            </div>

            {/* Button row */}
            <div className="flex gap-3">
              {inStock ? (
                <BuyButton productId={product.id} className="flex-1" />
              ) : (
                <button disabled className="flex-1 py-3.5 bg-border text-muted-foreground font-semibold rounded-xl cursor-not-allowed text-lg">
                  Out of Stock
                </button>
              )}
              <WishlistButton productId={product.id} variant="icon" />
            </div>
          </div>
        </div>
      </div>

      {/* Sticky mobile CTA bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-background/95 backdrop-blur-sm border-t border-border px-4 py-3 flex items-center gap-3">
        <div className="flex-1">
          <span className="text-lg font-bold text-primary">{formatPrice(product.price)}</span>
          <span className="text-xs text-muted-foreground block">+ 2.5% fee</span>
        </div>
        <WishlistButton productId={product.id} />
        {inStock ? (
          <BuyButton productId={product.id} className="flex-1" />
        ) : (
          <button disabled className="flex-1 rounded-xl bg-border text-muted-foreground font-semibold py-3 cursor-not-allowed">
            Out of Stock
          </button>
        )}
      </div>
    </div>
  )
}
