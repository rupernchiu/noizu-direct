import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { BuyButton } from '@/components/ui/BuyButton'

interface PageProps {
  params: Promise<{ id: string }>
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function getFirstImage(images: string): string | null {
  try {
    const parsed = JSON.parse(images)
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed[0] as string
    }
  } catch {
    // ignore
  }
  return null
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

  const firstImage = getFirstImage(product.images)
  const hasImage = Boolean(firstImage)
  const isPhysical = product.type === 'PHYSICAL'
  const inStock = !isPhysical || (product.stock != null && product.stock > 0)

  return (
    <div className="min-h-screen bg-[#0d0d12] py-8">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-[#8888aa]">
          <Link href="/" className="hover:text-[#f0f0f5] transition-colors">Home</Link>
          <span>/</span>
          <Link href="/marketplace" className="hover:text-[#f0f0f5] transition-colors">Marketplace</Link>
          <span>/</span>
          <span className="text-[#f0f0f5] truncate max-w-xs">{product.title}</span>
        </nav>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Left: Image */}
          <div className="aspect-square overflow-hidden rounded-xl bg-[#1e1e2a]">
            {hasImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={firstImage!}
                alt={product.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#7c3aed]/30 to-[#00d4aa]/30">
                <span className="text-6xl opacity-30">🎨</span>
              </div>
            )}
          </div>

          {/* Right: Details */}
          <div className="flex flex-col gap-5">
            {/* Category + type badges */}
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-[#00d4aa]/10 px-3 py-1 text-xs font-semibold text-[#00d4aa] border border-[#00d4aa]/30">
                {CATEGORY_LABELS[product.category] ?? product.category}
              </span>
              <span className="rounded-full bg-[#7c3aed]/10 px-3 py-1 text-xs font-semibold text-[#a78bfa] border border-[#7c3aed]/30">
                {TYPE_LABELS[product.type] ?? product.type}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold leading-tight text-[#f0f0f5] sm:text-3xl">
              {product.title}
            </h1>

            {/* Price */}
            <div className="flex flex-col gap-1">
              <span className="text-3xl font-bold text-[#7c3aed]">{formatPrice(product.price)}</span>
              <span className="text-xs text-[#8888aa]">2.5% processing fee may apply</span>
            </div>

            {/* Stock indicator for physical products */}
            {isPhysical && (
              <div className="flex items-center gap-2">
                {inStock ? (
                  <>
                    <span className="size-2 rounded-full bg-[#22c55e]" />
                    <span className="text-sm text-[#22c55e]">
                      In stock{product.stock != null ? `: ${product.stock}` : ''}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="size-2 rounded-full bg-[#ef4444]" />
                    <span className="text-sm text-[#ef4444]">Out of stock</span>
                  </>
                )}
              </div>
            )}

            {/* Description */}
            <div className="rounded-xl bg-[#1e1e2a] border border-[#2a2a3a] p-4">
              <h2 className="mb-2 text-sm font-semibold text-[#f0f0f5]">Description</h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#8888aa]">
                {product.description}
              </p>
            </div>

            {/* Creator card */}
            <div className="rounded-xl bg-[#1e1e2a] border border-[#2a2a3a] p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#8888aa]">Sold by</p>
              <Link
                href={`/creator/${product.creator.username}`}
                className="flex items-center gap-3 group"
              >
                {product.creator.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.creator.avatar}
                    alt={product.creator.displayName}
                    className="size-10 rounded-full object-cover border border-[#2a2a3a]"
                  />
                ) : (
                  <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-[#7c3aed] to-[#00d4aa] text-sm font-bold text-white">
                    {getInitials(product.creator.displayName)}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-[#f0f0f5] group-hover:text-[#a78bfa] transition-colors">
                      {product.creator.displayName}
                    </span>
                    {product.creator.isVerified && (
                      <svg className="size-4 text-[#00d4aa]" viewBox="0 0 16 16" fill="currentColor" aria-label="Verified">
                        <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zm3.646 5.146a.5.5 0 0 0-.707 0L6.5 9.586 5.061 8.146a.5.5 0 1 0-.707.708l1.793 1.793a.5.5 0 0 0 .707 0l4.793-4.793a.5.5 0 0 0 0-.708z" />
                      </svg>
                    )}
                  </div>
                  <span className="text-xs text-[#8888aa]">@{product.creator.username}</span>
                </div>
              </Link>
            </div>

            {/* Buy Now button */}
            {inStock ? (
              <BuyButton productId={product.id} />
            ) : (
              <button
                disabled
                className="w-full py-3.5 bg-[#2a2a3a] text-[#8888aa] font-semibold rounded-xl cursor-not-allowed text-lg"
              >
                Out of Stock
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
