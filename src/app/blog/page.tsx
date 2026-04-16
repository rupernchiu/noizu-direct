import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Creator Blog & Guides | NOIZU-DIRECT',
  description: 'News, guides, and creator spotlights from the NOIZU-DIRECT community. Tips for SEA cosplayers, doujin artists, and indie creators.',
  alternates: { canonical: 'https://noizu.direct/blog' },
  openGraph: {
    title: 'Creator Blog & Guides | NOIZU-DIRECT',
    description: 'News, guides, and creator spotlights from the NOIZU-DIRECT community.',
    url: 'https://noizu.direct/blog',
    images: [{ url: '/images/og-default.jpg', width: 1200, height: 630, alt: 'NOIZU-DIRECT Blog' }],
  },
}

export default async function BlogPage() {
  const posts = await prisma.post.findMany({
    where: { status: 'PUBLISHED', publishedAt: { lte: new Date() } },
    orderBy: { publishedAt: 'desc' },
    select: { id: true, slug: true, title: true, excerpt: true, coverImage: true, publishedAt: true, tags: true, author: { select: { name: true } } },
  })

  const [featured, ...rest] = posts

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-foreground mb-2">Blog</h1>
        <p className="text-muted-foreground mb-10">News, guides, and creator spotlights from NOIZU DIRECT.</p>

        {posts.length === 0 && (
          <p className="text-muted-foreground">No posts yet — check back soon!</p>
        )}

        {/* Featured post */}
        {featured && (
          <Link href={`/blog/${featured.slug}`} className="block mb-10 group">
            <div className="rounded-2xl overflow-hidden bg-card border border-border hover:border-primary/40 transition-colors">
              {featured.coverImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={featured.coverImage} alt={`${featured.title} — NOIZU-DIRECT Blog`} className="w-full aspect-[21/9] object-cover" />
              )}
              <div className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-0.5 rounded bg-primary/20 text-primary text-xs font-medium">Featured</span>
                  {featured.publishedAt && (
                    <span className="text-xs text-muted-foreground">{new Date(featured.publishedAt).toLocaleDateString()}</span>
                  )}
                </div>
                <h2 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors mb-2">{featured.title}</h2>
                {featured.excerpt && <p className="text-muted-foreground leading-relaxed">{featured.excerpt}</p>}
                <p className="text-xs text-muted-foreground mt-3">By {featured.author.name}</p>
              </div>
            </div>
          </Link>
        )}

        {/* Grid */}
        {rest.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {rest.map((post) => {
              const tags = (() => { try { return JSON.parse(post.tags) as string[] } catch { return [] } })()
              return (
                <Link key={post.id} href={`/blog/${post.slug}`} className="group">
                  <div className="rounded-xl overflow-hidden bg-card border border-border hover:border-primary/40 transition-colors h-full flex flex-col">
                    {post.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={post.coverImage} alt={`${post.title} — NOIZU-DIRECT Blog`} className="w-full aspect-video object-cover" />
                    ) : (
                      <div className="w-full aspect-video bg-surface flex items-center justify-center">
                        <span className="text-muted-foreground text-3xl">📝</span>
                      </div>
                    )}
                    <div className="p-4 flex flex-col flex-1">
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {tags.slice(0, 2).map(tag => (
                            <span key={tag} className="px-1.5 py-0.5 rounded bg-surface text-muted-foreground text-xs">{tag}</span>
                          ))}
                        </div>
                      )}
                      <h3 className="text-foreground font-semibold group-hover:text-primary transition-colors mb-1">{post.title}</h3>
                      {post.excerpt && <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2 flex-1">{post.excerpt}</p>}
                      <p className="text-xs text-muted-foreground mt-3">
                        {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : ''} · {post.author.name}
                      </p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
