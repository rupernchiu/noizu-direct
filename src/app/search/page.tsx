import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { formatPrice } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Search | NOIZU-DIRECT',
  description: 'Search for products and creators on NOIZU-DIRECT.',
  robots: { index: false, follow: true },
}

interface Props { searchParams: Promise<{ q?: string; tab?: string }> }

export default async function SearchPage({ searchParams }: Props) {
  const { q = '', tab = 'all' } = await searchParams
  const query = q.trim()

  let products: Array<{ id: string; title: string; price: number; images: string; category: string; creator: { username: string; displayName: string; avatar: string | null } }> = []
  let creators: Array<{ username: string; displayName: string; avatar: string | null; isVerified: boolean; isTopCreator: boolean; categoryTags: string; bio: string | null }> = []
  let posts: Array<{ slug: string; title: string; excerpt: string | null; coverImage: string | null; publishedAt: Date | null }> = []

  if (query.length >= 2) {
    const where = {
      OR: [
        { title: { contains: query } },
        { description: { contains: query } },
        { category: { contains: query } },
      ],
    }

    ;[products, creators, posts] = await Promise.all([
      tab === 'creators' || tab === 'posts' ? Promise.resolve([]) : prisma.product.findMany({
        where: { isActive: true, OR: [{ title: { contains: query } }, { description: { contains: query } }, { category: { contains: query } }] },
        take: 24,
        select: {
          id: true, title: true, price: true, images: true, category: true,
          creator: { select: { username: true, displayName: true, avatar: true } },
        },
      }),
      tab === 'products' || tab === 'posts' ? Promise.resolve([]) : prisma.creatorProfile.findMany({
        where: { isSuspended: false, OR: [{ displayName: { contains: query } }, { username: { contains: query } }, { bio: { contains: query } }] },
        take: 12,
        select: { username: true, displayName: true, avatar: true, isVerified: true, isTopCreator: true, categoryTags: true, bio: true },
      }),
      tab === 'products' || tab === 'creators' ? Promise.resolve([]) : prisma.post.findMany({
        where: { status: 'PUBLISHED', OR: [{ title: { contains: query } }, { excerpt: { contains: query } }, { tags: { contains: query } }] },
        take: 12,
        select: { slug: true, title: true, excerpt: true, coverImage: true, publishedAt: true },
      }),
    ])
    void where
  }

  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'products', label: `Products (${products.length})` },
    { id: 'creators', label: `Creators (${creators.length})` },
    { id: 'posts', label: `Blog (${posts.length})` },
  ]

  function tabUrl(t: string) {
    return `/search?q=${encodeURIComponent(query)}&tab=${t}`
  }

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-1">
          {query ? <>Results for "<span className="text-primary">{query}</span>"</> : 'Search'}
        </h1>
        {query && <p className="text-sm text-muted-foreground">{products.length + creators.length + posts.length} results found</p>}
      </div>

      {/* Tab bar */}
      {query.length >= 2 && (
        <div className="flex gap-1 border-b border-border mb-6">
          {tabs.map(t => (
            <Link
              key={t.id}
              href={tabUrl(t.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                tab === t.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>
      )}

      {!query || query.length < 2 ? (
        <p className="text-muted-foreground">Enter at least 2 characters to search.</p>
      ) : products.length + creators.length + posts.length === 0 ? (
        <p className="text-muted-foreground">No results found for "{query}".</p>
      ) : (
        <div className="space-y-10">
          {/* Products */}
          {products.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-foreground mb-4">Products</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {products.map(p => {
                  const imgs = (() => { try { return JSON.parse(p.images) as string[] } catch { return [] } })()
                  return (
                    <Link key={p.id} href={`/creator/${p.creator.username}/product/${p.id}`} className="group">
                      <div className="aspect-square rounded-xl overflow-hidden bg-card border border-border mb-2">
                        {imgs[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={imgs[0]} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20" />
                        )}
                      </div>
                      <p className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">{p.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{formatPrice(p.price)}</p>
                    </Link>
                  )
                })}
              </div>
            </section>
          )}

          {/* Creators */}
          {creators.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-foreground mb-4">Creators</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {creators.map(c => {
                  const tags = (() => { try { return JSON.parse(c.categoryTags) as string[] } catch { return [] } })()
                  return (
                    <Link key={c.username} href={`/creator/${c.username}`} className="group text-center">
                      <div className="w-16 h-16 rounded-full overflow-hidden mx-auto mb-2 border-2 border-border group-hover:border-primary transition-colors">
                        {c.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={c.avatar} alt={c.displayName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-primary/20 flex items-center justify-center text-xl font-bold text-primary">
                            {c.displayName.slice(0, 1)}
                          </div>
                        )}
                      </div>
                      <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                        {c.displayName}
                        {c.isVerified && <span className="ml-1 text-primary text-xs">✓</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">@{c.username}</p>
                      {tags[0] && <p className="text-[10px] text-muted-foreground mt-0.5">{tags[0]}</p>}
                    </Link>
                  )
                })}
              </div>
            </section>
          )}

          {/* Posts */}
          {posts.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-foreground mb-4">Blog Posts</h2>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                {posts.map(post => (
                  <Link key={post.slug} href={`/blog/${post.slug}`} className="group flex gap-3 p-3 rounded-xl border border-border hover:border-primary/50 transition-colors bg-card">
                    {post.coverImage && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={post.coverImage} alt={`${post.title} cover image`} className="w-20 h-16 rounded-lg object-cover shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">{post.title}</p>
                      {post.excerpt && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{post.excerpt}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
