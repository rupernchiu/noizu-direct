import Link from 'next/link'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface RailProduct {
  id: string
  title: string
  price: number
  images: string
  creator: { username: string; displayName: string; avatar: string | null }
}

export interface RailCreator {
  username: string
  displayName: string
  avatar: string | null
  isVerified: boolean
  categoryTags: string[]
}

export interface RailArticle {
  slug: string
  title: string
  excerpt: string | null
  coverImage: string | null
}

// ── Deterministic daily shuffle ────────────────────────────────────────────────

function daySeed(): number {
  const d = new Date()
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate()
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6D2B79F5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function dailyShuffle<T>(arr: T[], saltSeed = 0): T[] {
  const rng = mulberry32(daySeed() + saltSeed)
  const out = arr.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

// ── Row wrapper ────────────────────────────────────────────────────────────────

function RailWrapper({
  title,
  viewAllHref,
  children,
}: {
  title: string
  viewAllHref?: string
  children: React.ReactNode
}) {
  return (
    <div className="mt-12 border-t border-border pt-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-bold text-foreground">{title}</h2>
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            View All →
          </Link>
        )}
      </div>
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

// ── Cards ──────────────────────────────────────────────────────────────────────

function ProductRailCard({ product }: { product: RailProduct }) {
  let imgs: string[] = []
  try { imgs = JSON.parse(product.images) } catch {}
  const thumb = imgs[0] ?? null
  return (
    <Link
      href={`/creator/${product.creator.username}/product/${product.id}`}
      className="group flex shrink-0 w-36 flex-col overflow-hidden rounded-2xl border border-border bg-card hover:border-primary/40 transition-colors lg:w-auto"
    >
      <div className="aspect-square overflow-hidden bg-surface">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt={product.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
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
            <img src={product.creator.avatar} alt={product.creator.displayName} className="size-4 rounded-full object-cover" />
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

function CreatorRailCard({ creator }: { creator: RailCreator }) {
  const initials = creator.displayName.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
  return (
    <div className="flex shrink-0 w-36 flex-col rounded-2xl border border-border bg-card p-3 lg:w-auto">
      <div className="mb-2 flex items-center gap-2">
        {creator.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={creator.avatar} alt={creator.displayName} className="size-10 shrink-0 rounded-full object-cover" />
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
      <p className="truncate text-xs font-semibold text-foreground">{creator.displayName}</p>
      <p className="mb-2 truncate text-[10px] text-muted-foreground">@{creator.username}</p>
      {creator.categoryTags.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {creator.categoryTags.slice(0, 2).map((tag) => (
            <span key={tag} className="rounded-full bg-secondary/10 px-1.5 py-0.5 text-[9px] font-medium text-secondary">
              {tag}
            </span>
          ))}
        </div>
      )}
      <Link
        href={`/creator/${creator.username}`}
        className="mt-auto block w-full rounded-lg bg-primary/10 px-2 py-1.5 text-center text-[10px] font-semibold text-primary hover:bg-primary/20 transition-colors"
      >
        View Store
      </Link>
    </div>
  )
}

function ArticleRailCard({ article }: { article: RailArticle }) {
  return (
    <Link
      href={`/blog/${article.slug}`}
      className="group flex shrink-0 w-36 flex-col overflow-hidden rounded-2xl border border-border bg-card hover:border-primary/40 transition-colors lg:w-auto"
    >
      <div className="aspect-video overflow-hidden bg-surface">
        {article.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={article.coverImage} alt={article.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary/20 to-secondary/20" />
        )}
      </div>
      <div className="flex flex-1 flex-col p-2.5">
        <p className="line-clamp-2 text-xs font-semibold leading-snug text-foreground group-hover:text-primary transition-colors">
          {article.title}
        </p>
        {article.excerpt && (
          <p className="mt-1 line-clamp-2 text-[10px] text-muted-foreground">{article.excerpt}</p>
        )}
      </div>
    </Link>
  )
}

// ── Exports ────────────────────────────────────────────────────────────────────

export function ProductRail({
  title,
  products,
  viewAllHref = '/marketplace',
}: {
  title: string
  products: RailProduct[]
  viewAllHref?: string
}) {
  if (products.length === 0) return null
  return (
    <RailWrapper title={title} viewAllHref={viewAllHref}>
      {products.slice(0, 6).map((p) => <ProductRailCard key={p.id} product={p} />)}
    </RailWrapper>
  )
}

export function CreatorRail({
  title,
  creators,
  viewAllHref = '/creators',
}: {
  title: string
  creators: RailCreator[]
  viewAllHref?: string
}) {
  if (creators.length === 0) return null
  return (
    <RailWrapper title={title} viewAllHref={viewAllHref}>
      {creators.slice(0, 6).map((c) => <CreatorRailCard key={c.username} creator={c} />)}
    </RailWrapper>
  )
}

export function ArticleRail({
  title = 'From the Articles',
  articles,
  viewAllHref = '/blog',
}: {
  title?: string
  articles: RailArticle[]
  viewAllHref?: string
}) {
  if (articles.length === 0) return null
  return (
    <RailWrapper title={title} viewAllHref={viewAllHref}>
      {articles.slice(0, 6).map((a) => <ArticleRailCard key={a.slug} article={a} />)}
    </RailWrapper>
  )
}
