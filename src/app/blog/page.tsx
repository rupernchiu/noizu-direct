import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { getCached, setCached, CACHE_KEYS, CACHE_TTL } from '@/lib/redis'
import { Pagination } from '@/components/ui/Pagination'

export const metadata: Metadata = {
  title: 'Articles & Creator Stories',
  description: 'News, guides, creator spotlights, and shop picks from the noizu.direct community. Tips for SEA cosplayers, doujin artists, and indie creators.',
  alternates: { canonical: 'https://noizu.direct/blog' },
  openGraph: {
    title: 'Articles & Creator Stories',
    description: 'News, guides, and creator spotlights from the noizu.direct community.',
    url: 'https://noizu.direct/blog',
    images: [{ url: '/images/og-default.jpg', width: 1200, height: 630, alt: 'noizu.direct Articles' }],
  },
}

type PostSummary = {
  id: string; slug: string; title: string; excerpt: string | null
  coverImage: string | null; publishedAt: Date | null; tags: string
  viewCount: number
  author: { name: string | null }
}

type CreatorSpotlight = {
  username: string; displayName: string; avatar: string | null
  bannerImage: string | null; bio: string | null
  isVerified: boolean; isTopCreator: boolean
  categoryTags: string
  commissionStatus: string
  totalSales: number
}

type ProductSpotlight = {
  id: string; title: string; price: number; images: string
  type: string; category: string
  creator: { username: string; displayName: string }
}

const PER_PAGE = 12

// Deterministic shuffle seeded by a string so the same seed yields the same order.
// Seeding by the current day means the page reshuffles once per day across cache boundaries.
function daySeed(): number {
  const d = new Date()
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate()
}

function mulberry32(seed: number) {
  let a = seed
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0
    let t = Math.imul(a ^ a >>> 15, 1 | a)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

function shuffle<T>(arr: T[], seed: number): T[] {
  const out = [...arr]
  const rnd = mulberry32(seed)
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function parseTags(raw: string): string[] {
  try { const v = JSON.parse(raw); return Array.isArray(v) ? v as string[] : [] } catch { return [] }
}

function firstImage(raw: string): string | null {
  try { const v = JSON.parse(raw); return Array.isArray(v) && v.length > 0 ? v[0] as string : null } catch { return null }
}

function formatDate(d: Date | string | null): string {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

const TYPE_LABELS: Record<string, string> = {
  DIGITAL: 'Digital', PHYSICAL: 'Shop', POD: 'Print-On-Demand', COMMISSION: 'Commission',
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; tag?: string }>
}) {
  const { page: pageParam, tag: tagParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)

  // ── Posts (cached) ────────────────────────────────────────────────────────
  const cached = await getCached<PostSummary[]>(CACHE_KEYS.blogPosts)
  let allPosts: PostSummary[]
  if (cached) {
    allPosts = cached
  } else {
    allPosts = await prisma.post.findMany({
      where: { status: 'PUBLISHED', publishedAt: { lte: new Date() } },
      orderBy: { publishedAt: 'desc' },
      select: {
        id: true, slug: true, title: true, excerpt: true, coverImage: true,
        publishedAt: true, tags: true, viewCount: true,
        author: { select: { name: true } },
      },
    }) as PostSummary[]
    await setCached(CACHE_KEYS.blogPosts, allPosts, CACHE_TTL.blogPosts)
  }

  // Tag filter
  const filteredPosts = tagParam
    ? allPosts.filter(p => parseTags(p.tags).map(t => t.toLowerCase()).includes(tagParam.toLowerCase()))
    : allPosts

  // ── Creators + products (freshness matters more than cache here) ─────────
  const [creators, products] = await Promise.all([
    prisma.creatorProfile.findMany({
      where: { isSuspended: false, storeStatus: { in: ['ACTIVE', 'HIATUS'] } },
      orderBy: [{ isTopCreator: 'desc' }, { totalSales: 'desc' }, { createdAt: 'desc' }],
      take: 20,
      select: {
        username: true, displayName: true, avatar: true, bannerImage: true, bio: true,
        isVerified: true, isTopCreator: true, categoryTags: true,
        commissionStatus: true, totalSales: true,
      },
    }) as Promise<CreatorSpotlight[]>,
    prisma.product.findMany({
      where: { isActive: true, creator: { isSuspended: false } },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      take: 24,
      select: {
        id: true, title: true, price: true, images: true, type: true, category: true,
        creator: { select: { username: true, displayName: true } },
      },
    }) as Promise<ProductSpotlight[]>,
  ])

  const seed = daySeed()
  const shuffledCreators = shuffle(creators, seed)
  const shuffledProducts = shuffle(products, seed + 7)

  // ── Hero / pagination split ──────────────────────────────────────────────
  const total = filteredPosts.length
  const hero = page === 1 && !tagParam ? filteredPosts[0] : null
  const secondary = page === 1 && !tagParam ? filteredPosts.slice(1, 4) : []
  const feedPosts = page === 1 && !tagParam
    ? filteredPosts.slice(4, 4 + PER_PAGE)
    : filteredPosts.slice((page - 1) * PER_PAGE, (page - 1) * PER_PAGE + PER_PAGE)

  // Tag cloud (across all posts, not filtered)
  const tagCounts = new Map<string, number>()
  for (const p of allPosts) for (const t of parseTags(p.tags)) {
    tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1)
  }
  const topTags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([t]) => t)

  // Interleave spotlight cards into the feed.
  // Pattern (0-indexed positions into feedPosts): after 2 posts → creator, after 5 posts → product, after 8 → creator, after 11 → product.
  type FeedItem =
    | { kind: 'post'; post: PostSummary }
    | { kind: 'creator'; creator: CreatorSpotlight }
    | { kind: 'product'; product: ProductSpotlight }

  const feed: FeedItem[] = []
  let cIdx = 0, pIdx = 0
  for (let i = 0; i < feedPosts.length; i++) {
    feed.push({ kind: 'post', post: feedPosts[i] })
    const afterCount = i + 1
    if (afterCount === 2 || afterCount === 8) {
      if (shuffledCreators[cIdx]) feed.push({ kind: 'creator', creator: shuffledCreators[cIdx++] })
    }
    if (afterCount === 5 || afterCount === 11) {
      if (shuffledProducts[pIdx]) feed.push({ kind: 'product', product: shuffledProducts[pIdx++] })
    }
  }

  // Sidebar selections (distinct from interleaved)
  const sidebarCreators = shuffledCreators.slice(cIdx, cIdx + 5)
  const sidebarProducts = shuffledProducts.slice(pIdx, pIdx + 5)
  const popularPosts = [...allPosts].sort((a, b) => b.viewCount - a.viewCount).slice(0, 5)

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:py-12">
        {/* ── Top ─────────────────────────────────────────────────────────── */}
        <div className="mb-6 flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground">Articles</h1>
            <p className="text-muted-foreground mt-1">News, guides, and creator spotlights from NOIZU DIRECT.</p>
          </div>
          {tagParam && (
            <Link href="/blog" className="text-xs text-primary hover:underline">Clear filter: #{tagParam} ×</Link>
          )}
        </div>

        {/* ── Tag rail ────────────────────────────────────────────────────── */}
        {topTags.length > 0 && (
          <nav className="flex gap-2 overflow-x-auto scrollbar-none pb-2 mb-8" aria-label="Article topics">
            <Link
              href="/blog"
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                !tagParam
                  ? 'bg-primary text-white border-primary'
                  : 'bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground'
              }`}
            >
              All
            </Link>
            {topTags.map(t => (
              <Link
                key={t}
                href={`/blog?tag=${encodeURIComponent(t)}`}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  tagParam === t
                    ? 'bg-primary text-white border-primary'
                    : 'bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground'
                }`}
              >
                {t}
              </Link>
            ))}
          </nav>
        )}

        {total === 0 && (
          <p className="text-muted-foreground">No posts match this filter — check back soon.</p>
        )}

        {/* ── Hero strip (page 1 only) ───────────────────────────────────── */}
        {hero && (
          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 mb-10">
            {/* Big featured */}
            <Link href={`/blog/${hero.slug}`} className="group block">
              <article className="relative rounded-2xl overflow-hidden bg-card border border-border hover:border-primary/40 transition-colors">
                {hero.coverImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={hero.coverImage} alt={hero.title} className="w-full aspect-[16/9] object-cover" />
                ) : (
                  <div className="w-full aspect-[16/9] bg-gradient-to-br from-primary/30 to-secondary/30" />
                )}
                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6 bg-gradient-to-t from-black/85 via-black/40 to-transparent">
                  <span className="inline-block px-2 py-0.5 rounded bg-primary text-white text-[10px] font-bold uppercase tracking-wide mb-2">Top Story</span>
                  <h2 className="text-lg sm:text-2xl font-bold text-white group-hover:text-primary transition-colors leading-tight line-clamp-2">
                    {hero.title}
                  </h2>
                  {hero.excerpt && <p className="text-white/80 text-sm mt-2 line-clamp-2 hidden sm:block">{hero.excerpt}</p>}
                  <p className="text-white/60 text-xs mt-2">{hero.author.name} · {formatDate(hero.publishedAt)}</p>
                </div>
              </article>
            </Link>

            {/* Secondary column */}
            <div className="flex flex-col gap-4">
              {secondary.map(p => (
                <Link key={p.id} href={`/blog/${p.slug}`} className="group block">
                  <article className="grid grid-cols-[96px_1fr] sm:grid-cols-[120px_1fr] gap-3 rounded-xl overflow-hidden bg-card border border-border hover:border-primary/40 transition-colors p-2">
                    {p.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.coverImage} alt={p.title} className="w-full h-24 sm:h-28 object-cover rounded-lg" />
                    ) : (
                      <div className="w-full h-24 sm:h-28 bg-surface rounded-lg" />
                    )}
                    <div className="py-1 pr-2">
                      <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">{p.title}</h3>
                      <p className="text-[11px] text-muted-foreground mt-1">{formatDate(p.publishedAt)}</p>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Main feed + sidebar ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
          {/* Main feed */}
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {feed.map((item, i) => {
                if (item.kind === 'post') {
                  const post = item.post
                  const tags = parseTags(post.tags)
                  return (
                    <Link key={`post-${post.id}`} href={`/blog/${post.slug}`} className="group">
                      <article className="rounded-xl overflow-hidden bg-card border border-border hover:border-primary/40 transition-colors h-full flex flex-col">
                        {post.coverImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={post.coverImage} alt={post.title} className="w-full aspect-video object-cover" />
                        ) : (
                          <div className="w-full aspect-video bg-surface flex items-center justify-center text-3xl">📝</div>
                        )}
                        <div className="p-4 flex flex-col flex-1">
                          {tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {tags.slice(0, 2).map(tag => (
                                <span key={tag} className="px-1.5 py-0.5 rounded bg-surface text-muted-foreground text-[10px] uppercase tracking-wide">{tag}</span>
                              ))}
                            </div>
                          )}
                          <h3 className="text-foreground font-semibold group-hover:text-primary transition-colors line-clamp-2">{post.title}</h3>
                          {post.excerpt && <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2 mt-1.5 flex-1">{post.excerpt}</p>}
                          <p className="text-xs text-muted-foreground mt-3">
                            {formatDate(post.publishedAt)} · {post.author.name}
                          </p>
                        </div>
                      </article>
                    </Link>
                  )
                }

                if (item.kind === 'creator') {
                  const c = item.creator
                  const cats = parseTags(c.categoryTags).slice(0, 2)
                  return (
                    <Link key={`creator-${c.username}-${i}`} href={`/creator/${c.username}`} className="group">
                      <article className="rounded-xl overflow-hidden bg-gradient-to-br from-primary/10 via-card to-secondary/10 border border-primary/30 hover:border-primary/60 transition-colors h-full flex flex-col">
                        <div className="relative">
                          {c.bannerImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={c.bannerImage} alt={`${c.displayName} banner`} className="w-full aspect-video object-cover" />
                          ) : (
                            <div className="w-full aspect-video bg-gradient-to-br from-primary/40 to-secondary/30" />
                          )}
                          <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-primary text-white text-[10px] font-bold uppercase tracking-wide">Creator Spotlight</span>
                        </div>
                        <div className="p-4 flex flex-col flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {c.avatar ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={c.avatar} alt={c.displayName} className="w-10 h-10 rounded-full object-cover border border-border" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-primary/30 flex items-center justify-center font-bold text-primary">
                                {c.displayName[0]?.toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                                {c.displayName}{c.isVerified && <span className="ml-1 text-secondary text-xs">✓</span>}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">@{c.username}</p>
                            </div>
                          </div>
                          {c.bio && <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 flex-1">{c.bio}</p>}
                          {cats.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-3">
                              {cats.map(t => (
                                <span key={t} className="px-1.5 py-0.5 rounded bg-secondary/10 text-secondary text-[10px]">{t}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </article>
                    </Link>
                  )
                }

                // product
                const prod = item.product
                const img = firstImage(prod.images)
                return (
                  <Link key={`product-${prod.id}-${i}`} href={`/product/${prod.id}`} className="group">
                    <article className="rounded-xl overflow-hidden bg-card border border-secondary/30 hover:border-secondary/60 transition-colors h-full flex flex-col">
                      <div className="relative">
                        {img ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={img} alt={prod.title} className="w-full aspect-video object-cover" />
                        ) : (
                          <div className="w-full aspect-video bg-surface" />
                        )}
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-secondary text-background text-[10px] font-bold uppercase tracking-wide">Shop Spotlight</span>
                      </div>
                      <div className="p-4 flex flex-col flex-1">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">{TYPE_LABELS[prod.type] ?? prod.type}</p>
                        <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">{prod.title}</h3>
                        <p className="text-xs text-muted-foreground mt-1">by {prod.creator.displayName}</p>
                        <p className="text-base font-bold text-primary mt-2">{formatPrice(prod.price)}</p>
                      </div>
                    </article>
                  </Link>
                )
              })}
            </div>

            {total > PER_PAGE && (
              <Pagination total={total - (page === 1 && !tagParam ? 4 : 0)} page={page} perPage={PER_PAGE} />
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-6 lg:sticky lg:top-24 self-start">
            {/* Popular articles */}
            {popularPosts.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-4">
                <h2 className="text-sm font-bold text-foreground mb-3 uppercase tracking-wide">Most Read</h2>
                <ol className="space-y-3">
                  {popularPosts.map((p, i) => (
                    <li key={p.id}>
                      <Link href={`/blog/${p.slug}`} className="flex gap-3 group">
                        <span className="text-lg font-bold text-primary/60 w-5 shrink-0">{i + 1}</span>
                        <div className="min-w-0">
                          <p className="text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">{p.title}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{formatDate(p.publishedAt)}</p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Meet creators */}
            {sidebarCreators.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">Meet Creators</h2>
                  <Link href="/creators" className="text-[11px] text-primary hover:underline">See all</Link>
                </div>
                <ul className="space-y-3">
                  {sidebarCreators.map(c => (
                    <li key={c.username}>
                      <Link href={`/creator/${c.username}`} className="flex items-center gap-3 group">
                        {c.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={c.avatar} alt={c.displayName} className="w-10 h-10 rounded-full object-cover shrink-0 border border-border" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary/30 flex items-center justify-center font-bold text-primary shrink-0">
                            {c.displayName[0]?.toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm text-foreground group-hover:text-primary transition-colors truncate">
                            {c.displayName}{c.isVerified && <span className="ml-1 text-secondary text-xs">✓</span>}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">@{c.username}</p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Shop picks */}
            {sidebarProducts.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">Shop Picks</h2>
                  <Link href="/marketplace" className="text-[11px] text-primary hover:underline">Marketplace</Link>
                </div>
                <ul className="space-y-3">
                  {sidebarProducts.map(p => {
                    const img = firstImage(p.images)
                    return (
                      <li key={p.id}>
                        <Link href={`/product/${p.id}`} className="flex items-center gap-3 group">
                          {img ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={img} alt={p.title} className="w-14 h-14 rounded-lg object-cover shrink-0 border border-border" />
                          ) : (
                            <div className="w-14 h-14 rounded-lg bg-surface shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">{p.title}</p>
                            <p className="text-xs text-primary font-bold mt-0.5">{formatPrice(p.price)}</p>
                          </div>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}
