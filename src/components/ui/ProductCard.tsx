import Link from 'next/link'
import { cn } from '@/lib/utils'

interface ProductCardProps {
  product: {
    id: string
    title: string
    description: string
    price: number
    category: string
    type: string
    images: string // JSON string array
    creator: {
      username: string
      displayName: string
      avatar: string | null
      isVerified: boolean
      isTopCreator: boolean
    }
  }
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

const CATEGORY_COLORS: Record<string, string> = {
  DIGITAL_ART: 'bg-[#00d4aa] text-[#0d0d12]',
  DOUJIN: 'bg-[#7c3aed] text-white',
  COSPLAY_PRINT: 'bg-[#f59e0b] text-[#0d0d12]',
  PHYSICAL_MERCH: 'bg-[#22c55e] text-[#0d0d12]',
  STICKERS: 'bg-[#ef4444] text-white',
  // legacy / fallbacks
  PRINT: 'bg-[#00d4aa] text-[#0d0d12]',
  DIGITAL: 'bg-[#00d4aa] text-[#0d0d12]',
  COMMISSION: 'bg-[#ef4444] text-white',
}

export function ProductCard({ product }: ProductCardProps) {
  const firstImage = getFirstImage(product.images)
  const isUpload = firstImage?.startsWith('/uploads/')
  const hasImage = firstImage && isUpload

  return (
    <Link
      href={`/products/${product.id}`}
      className="group block focus:outline-none"
    >
      <div
        className={cn(
          'relative flex flex-col bg-[#1e1e2a] rounded-xl overflow-hidden border border-[#2a2a3a]',
          'transition-all duration-200',
          'hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:border-[#7c3aed]/40',
          'focus-within:scale-[1.02] focus-within:shadow-[0_0_20px_rgba(124,58,237,0.3)]'
        )}
      >
        {/* Image area */}
        <div className="relative aspect-square w-full overflow-hidden bg-[#16161f]">
          {hasImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={firstImage}
              alt={product.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-[#7c3aed]/30 to-[#00d4aa]/30" />
          )}

          {/* Category badge — top left */}
          <span
            className={cn(
              'absolute left-2 top-2 rounded-full px-2 py-0.5 text-xs font-semibold leading-tight',
              CATEGORY_COLORS[product.category] ?? 'bg-[#00d4aa] text-[#0d0d12]'
            )}
          >
            {product.category}
          </span>

          {/* Type badge — top right */}
          <span className="absolute right-2 top-2 rounded-full bg-[#0d0d12]/70 px-2 py-0.5 text-[10px] font-medium text-[#8888aa] backdrop-blur-sm">
            {product.type}
          </span>

          {/* Buy Now overlay on hover (hidden on mobile — always shown) */}
          <div className="absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-[#7c3aed] to-[#7c3aed]/80 py-2 text-center text-sm font-semibold text-white transition-transform duration-200 group-hover:translate-y-0 sm:block hidden">
            Buy Now
          </div>
        </div>

        {/* Card body */}
        <div className="flex flex-1 flex-col gap-2 p-3">
          {/* Title */}
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-[#f0f0f5]">
            {product.title}
          </h3>

          {/* Creator row */}
          <div className="flex items-center gap-1.5">
            {product.creator.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.creator.avatar}
                alt={product.creator.displayName}
                className="size-5 rounded-full object-cover"
              />
            ) : (
              <div className="flex size-5 items-center justify-center rounded-full bg-[#7c3aed]/30 text-[10px] font-bold text-[#7c3aed]">
                {product.creator.displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="truncate text-xs text-[#8888aa]">
              {product.creator.displayName}
            </span>
            {product.creator.isVerified && (
              <svg
                className="size-3.5 shrink-0 text-[#00d4aa]"
                viewBox="0 0 16 16"
                fill="currentColor"
                aria-label="Verified"
              >
                <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zm3.646 5.146a.5.5 0 0 0-.707 0L6.5 9.586 5.061 8.146a.5.5 0 1 0-.707.708l1.793 1.793a.5.5 0 0 0 .707 0l4.793-4.793a.5.5 0 0 0 0-.708z" />
              </svg>
            )}
          </div>

          {/* Price + mobile buy button */}
          <div className="mt-auto flex items-center justify-between pt-1">
            <span className="text-base font-bold text-[#7c3aed]">
              {formatPrice(product.price)}
            </span>
            {/* Mobile-only buy button (always visible) */}
            <button className="sm:hidden rounded-lg bg-[#7c3aed] px-3 py-1 text-xs font-semibold text-white">
              Buy
            </button>
          </div>
        </div>
      </div>
    </Link>
  )
}
