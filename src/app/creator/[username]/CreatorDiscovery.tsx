'use client'

import Link from 'next/link'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface DiscoveryProduct {
  id: string
  title: string
  description: string
  price: number
  category: string
  type: string
  images: string
  isPinned: boolean
  creator: {
    username: string
    displayName: string
    avatar: string | null
    isVerified: boolean
    isTopCreator: boolean
  }
}

export interface DiscoveryCreator {
  username: string
  displayName: string
  avatar: string | null
  isVerified: boolean
  categoryTags: string[]
  commissionStatus: string
  lowestCommissionPrice: number | null
  activeGoal: { title: string; targetAmountUsd: number; currentAmountUsd: number } | null
}

export interface DiscoveryVideo {
  id: string
  title: string
  platform: string
  embedId: string
  url: string
  creatorUsername: string
  creatorDisplayName: string
  creatorAvatar: string | null
}

export interface DiscoveryPortfolioItem {
  imageUrl: string
  imageTitle: string
  creatorUsername: string
  creatorDisplayName: string
  creatorAvatar: string | null
}

// ── Row wrapper ────────────────────────────────────────────────────────────────

function DiscoveryRow({
  title,
  viewAllHref,
  children,
}: {
  title: string
  viewAllHref: string
  children: React.ReactNode
}) {
  return (
    <div className="mt-12 border-t border-border pt-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-bold text-foreground">{title}</h2>
        <Link
          href={viewAllHref}
          className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          View All →
        </Link>
      </div>
      {/* Mobile: horizontal scroll row; Desktop: 6-column grid */}
      <div
        className="flex gap-3 overflow-x-auto pb-2 lg:grid lg:overflow-visible lg:pb-0"
        style={{
          gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
          gap: '12px',
          scrollbarWidth: 'none',
        }}
      >
        {children}
      </div>
    </div>
  )
}

// ── Product card ───────────────────────────────────────────────────────────────

function DiscoveryProductCard({ product }: { product: DiscoveryProduct }) {
  let images: string[] = []
  try { images = JSON.parse(product.images) } catch {}
  const thumb = images[0] ?? null
  return (
    <Link
      href={`/product/${product.id}`}
      className="group flex shrink-0 w-36 flex-col overflow-hidden rounded-2xl border border-border bg-card hover:border-primary/40 transition-colors lg:w-auto"
    >
      <div className="aspect-square overflow-hidden bg-surface">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt={product.title}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary/20 to-secondary/20" />
        )}
      </div>
      <div className="flex flex-1 flex-col p-2.5">
        <p className="mb-1 line-clamp-2 text-xs font-semibold leading-snug text-foreground">{product.title}</p>
        <p className="mt-auto text-xs font-bold text-primary">${(product.price / 100).toFixed(0)}</p>
        <div className="mt-1.5 flex items-center gap-1.5">
          {product.creator.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.creator.avatar}
              alt={product.creator.displayName}
              className="size-4 rounded-full object-cover"
            />
          ) : (
            <div className="flex size-4 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-[7px] font-bold text-white">
              {product.creator.displayName.slice(0, 1)}
            </div>
          )}
          <span className="truncate text-[10px] text-muted-foreground">{product.creator.displayName}</span>
        </div>
      </div>
    </Link>
  )
}

// ── Creator card ───────────────────────────────────────────────────────────────

function DiscoveryCreatorCard({
  creator,
  ctaLabel,
  ctaHref,
  extra,
}: {
  creator: DiscoveryCreator
  ctaLabel: string
  ctaHref: string
  extra?: React.ReactNode
}) {
  const initials = creator.displayName.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
  return (
    <div className="flex shrink-0 w-36 flex-col rounded-2xl border border-border bg-card p-3 lg:w-auto">
      {/* Avatar row */}
      <div className="mb-2 flex items-center gap-2">
        {creator.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={creator.avatar}
            alt={creator.displayName}
            className="size-10 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-xs font-bold text-white">
            {initials}
          </div>
        )}
        {creator.isVerified && (
          <svg className="size-3.5 shrink-0 text-secondary" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zm3.646 5.146a.5.5 0 0 0-.707 0L6.5 9.586 5.061 8.146a.5.5 0 1 0-.707.708l1.793 1.793a.5.5 0 0 0 .707 0l4.793-4.793a.5.5 0 0 0 0-.708z" />
          </svg>
        )}
      </div>
      {/* Name */}
      <p className="truncate text-xs font-semibold text-foreground">{creator.displayName}</p>
      <p className="mb-2 truncate text-[10px] text-muted-foreground">@{creator.username}</p>
      {/* Tags */}
      {creator.categoryTags.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {creator.categoryTags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-secondary/10 px-1.5 py-0.5 text-[9px] font-medium text-secondary"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      {/* Extra slot (price badge, progress bar) */}
      {extra}
      {/* CTA */}
      <Link
        href={ctaHref}
        className="mt-auto block w-full rounded-lg bg-primary/10 px-2 py-1.5 text-center text-[10px] font-semibold text-primary hover:bg-primary/20 transition-colors"
      >
        {ctaLabel}
      </Link>
    </div>
  )
}

// ── Video card ─────────────────────────────────────────────────────────────────

function DiscoveryVideoCard({ video }: { video: DiscoveryVideo }) {
  return (
    <Link
      href={`/creator/${video.creatorUsername}`}
      className="group flex shrink-0 w-36 flex-col overflow-hidden rounded-2xl border border-border bg-card hover:border-primary/40 transition-colors lg:w-auto"
    >
      <div className="relative aspect-video overflow-hidden bg-surface">
        {video.platform === 'YOUTUBE' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`https://img.youtube.com/vi/${video.embedId}/mqdefault.jpg`}
            alt={video.title}
            className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#1877f2]/20 to-[#1877f2]/5" />
        )}
        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex size-7 items-center justify-center rounded-full bg-black/60 text-white shadow">
            <svg viewBox="0 0 24 24" className="size-3.5 fill-white ml-0.5" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </div>
      <div className="p-2.5">
        <p className="line-clamp-2 text-[11px] font-semibold leading-snug text-foreground">{video.title}</p>
        <div className="mt-1.5 flex items-center gap-1">
          {video.creatorAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={video.creatorAvatar}
              alt={video.creatorDisplayName}
              className="size-4 rounded-full object-cover"
            />
          ) : (
            <div className="flex size-4 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-[7px] font-bold text-white">
              {video.creatorDisplayName.slice(0, 1)}
            </div>
          )}
          <span className="truncate text-[10px] text-muted-foreground">{video.creatorDisplayName}</span>
        </div>
      </div>
    </Link>
  )
}

// ── Portfolio card ─────────────────────────────────────────────────────────────

function DiscoveryPortfolioCard({ item }: { item: DiscoveryPortfolioItem }) {
  return (
    <Link
      href={`/creator/${item.creatorUsername}`}
      className="group relative shrink-0 w-32 overflow-hidden rounded-xl border border-border bg-surface lg:w-auto lg:aspect-square"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.imageUrl}
        alt={item.imageTitle}
        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
        style={{ aspectRatio: '1/1' }}
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="truncate text-[10px] font-medium text-white">{item.creatorDisplayName}</p>
      </div>
    </Link>
  )
}

// ── Tab-specific sections ──────────────────────────────────────────────────────

export function ShopDiscovery({ products }: { products: DiscoveryProduct[] }) {
  if (products.length === 0) return null
  return (
    <DiscoveryRow title="More From the Community" viewAllHref="/marketplace">
      {products.map((p) => (
        <DiscoveryProductCard key={p.id} product={p} />
      ))}
    </DiscoveryRow>
  )
}

export function AboutDiscovery({ creators }: { creators: DiscoveryCreator[] }) {
  if (creators.length === 0) return null
  return (
    <DiscoveryRow title="Creators You Might Like" viewAllHref="/creators">
      {creators.map((c) => (
        <DiscoveryCreatorCard
          key={c.username}
          creator={c}
          ctaLabel="View Store"
          ctaHref={`/creator/${c.username}`}
        />
      ))}
    </DiscoveryRow>
  )
}

export function CommissionDiscovery({ creators }: { creators: DiscoveryCreator[] }) {
  if (creators.length === 0) return null
  return (
    <DiscoveryRow title="Other Creators Taking Commissions" viewAllHref="/creators">
      {creators.map((c) => (
        <DiscoveryCreatorCard
          key={c.username}
          creator={c}
          ctaLabel="Commission"
          ctaHref={`/creator/${c.username}`}
          extra={
            c.lowestCommissionPrice !== null ? (
              <p className="mb-2 text-[10px] font-semibold text-success">
                from ${c.lowestCommissionPrice}
              </p>
            ) : undefined
          }
        />
      ))}
    </DiscoveryRow>
  )
}

export function PortfolioDiscovery({ items }: { items: DiscoveryPortfolioItem[] }) {
  if (items.length === 0) return null
  return (
    <DiscoveryRow title="More Art to Explore" viewAllHref="/creators">
      {items.map((item, i) => (
        <DiscoveryPortfolioCard key={`${item.creatorUsername}-${i}`} item={item} />
      ))}
    </DiscoveryRow>
  )
}

export function VideosDiscovery({ videos }: { videos: DiscoveryVideo[] }) {
  if (videos.length === 0) return null
  return (
    <DiscoveryRow title="More Creator Videos" viewAllHref="/creators">
      {videos.map((v) => (
        <DiscoveryVideoCard key={v.id} video={v} />
      ))}
    </DiscoveryRow>
  )
}

export function PodDiscovery({ creators }: { creators: DiscoveryCreator[] }) {
  if (creators.length === 0) return null
  return (
    <DiscoveryRow title="Other Creators Who Provide Print On Demand" viewAllHref="/creators">
      {creators.map((c) => (
        <DiscoveryCreatorCard
          key={c.username}
          creator={c}
          ctaLabel="View POD"
          ctaHref={`/creator/${c.username}?tab=pod`}
        />
      ))}
    </DiscoveryRow>
  )
}

export function SupportDiscovery({ creators }: { creators: DiscoveryCreator[] }) {
  if (creators.length === 0) return null
  return (
    <DiscoveryRow title="Other Creators to Support" viewAllHref="/creators">
      {creators.map((c) => (
        <DiscoveryCreatorCard
          key={c.username}
          creator={c}
          ctaLabel="Support"
          ctaHref={`/creator/${c.username}`}
          extra={
            c.activeGoal ? (
              <div className="mb-2">
                <div className="mb-1 h-1.5 overflow-hidden rounded-full bg-surface">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{
                      width: `${Math.min(100, Math.round((c.activeGoal.currentAmountUsd / c.activeGoal.targetAmountUsd) * 100))}%`,
                    }}
                  />
                </div>
                <p className="text-[9px] text-muted-foreground truncate">{c.activeGoal.title}</p>
              </div>
            ) : undefined
          }
        />
      ))}
    </DiscoveryRow>
  )
}
