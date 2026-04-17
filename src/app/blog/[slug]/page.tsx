import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCached, setCached, CACHE_KEYS, CACHE_TTL } from '@/lib/redis'
import Link from 'next/link'
import sanitizeHtml from 'sanitize-html'
import { JsonLd } from '@/components/seo/JsonLd'

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat([
    'img', 'figure', 'figcaption', 'iframe', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  ]),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    img: ['src', 'alt', 'width', 'height', 'class'],
    iframe: ['src', 'width', 'height', 'frameborder', 'allow', 'allowfullscreen', 'class'],
    '*': ['class'],
  },
  allowedIframeHostnames: ['www.youtube.com', 'www.facebook.com'],
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const post = await prisma.post.findUnique({
    where: { slug },
    select: { title: true, seoTitle: true, seoDescription: true, excerpt: true, coverImage: true, author: { select: { name: true } }, publishedAt: true },
  })
  if (!post) return {}

  const title = post.seoTitle || post.title
  const description = post.seoDescription || post.excerpt || ''
  const url = `https://noizu.direct/blog/${slug}`
  const ogImage = post.coverImage || '/images/og-default.jpg'

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: 'article',
      images: [{ url: ogImage, width: 800, height: 400, alt: `${title} — NOIZU-DIRECT Blog` }],
      authors: post.author?.name ? [post.author.name] : undefined,
      publishedTime: post.publishedAt?.toISOString(),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  }
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const cacheKey = CACHE_KEYS.blogPost(slug)
  const cachedPost = await getCached<Awaited<ReturnType<typeof prisma.post.findUnique>>>(cacheKey)
  const post = cachedPost ?? await prisma.post.findUnique({
    where: { slug },
    include: { author: { select: { name: true } } },
  })

  if (!post || post.status !== 'PUBLISHED') notFound()
  if (!cachedPost) await setCached(cacheKey, post, CACHE_TTL.blogPost)

  // Increment view count (fire and forget)
  prisma.post.update({ where: { id: post.id }, data: { viewCount: { increment: 1 } } }).catch(() => {})

  const tags = (() => { try { return JSON.parse(post.tags) as string[] } catch { return [] } })()
  const safeContent = post.content ? sanitizeHtml(post.content, SANITIZE_OPTIONS) : ''

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt || '',
    image: post.coverImage ? { '@type': 'ImageObject', url: post.coverImage, width: 800, height: 400 } : undefined,
    author: { '@type': 'Person', name: post.author?.name || 'NOIZU-DIRECT' },
    publisher: { '@type': 'Organization', name: 'NOIZU-DIRECT', logo: { '@type': 'ImageObject', url: 'https://noizu.direct/logo.png' } },
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt?.toISOString(),
    mainEntityOfPage: { '@type': 'WebPage', '@id': `https://noizu.direct/blog/${post.slug}` },
    keywords: (() => { try { return (JSON.parse(post.tags) as string[]).join(', ') } catch { return '' } })(),
    articleSection: 'Creator Community',
    inLanguage: 'en-MY',
  }

  const articleBreadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://noizu.direct' },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://noizu.direct/blog' },
      { '@type': 'ListItem', position: 3, name: post.title, item: `https://noizu.direct/blog/${post.slug}` },
    ],
  }

  // Related posts
  const related = await prisma.post.findMany({
    where: { status: 'PUBLISHED', id: { not: post.id } },
    orderBy: { publishedAt: 'desc' },
    take: 3,
    select: { slug: true, title: true, coverImage: true, publishedAt: true },
  })

  return (
    <div className="min-h-screen bg-background">
      <JsonLd data={[articleSchema, articleBreadcrumbSchema]} />
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-8">
          <Link href="/" className="hover:text-foreground">Home</Link>
          <span>/</span>
          <Link href="/blog" className="hover:text-foreground">Blog</Link>
          <span>/</span>
          <span className="text-foreground truncate">{post.title}</span>
        </nav>

        {/* Header */}
        {post.coverImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.coverImage} alt={`${post.title} — NOIZU-DIRECT Blog`} className="w-full aspect-video object-cover rounded-2xl mb-8" />
        )}

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {tags.map(tag => (
              <span key={tag} className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-xs font-medium">{tag}</span>
            ))}
          </div>
        )}

        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">{post.title}</h1>

        <div className="flex items-center gap-3 mb-8 pb-8 border-b border-border">
          <div className="w-8 h-8 rounded-full bg-primary/30 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-primary">{post.author.name[0]?.toUpperCase()}</span>
          </div>
          <div>
            <p className="text-sm text-foreground">{post.author.name}</p>
            {post.publishedAt && (
              <p className="text-xs text-muted-foreground">{new Date(post.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            )}
          </div>
        </div>

        {/* Content */}
        {safeContent ? (
          <div
            className="prose prose-invert max-w-none text-foreground prose-headings:text-foreground prose-a:text-primary prose-strong:text-foreground prose-code:bg-surface prose-code:px-1 prose-code:rounded prose-pre:bg-surface"
            dangerouslySetInnerHTML={{ __html: safeContent }}
          />
        ) : (
          <p className="text-muted-foreground italic">No content.</p>
        )}

        {/* Related */}
        {related.length > 0 && (
          <div className="mt-16 pt-8 border-t border-border">
            <h2 className="text-lg font-semibold text-foreground mb-4">More Posts</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {related.map(r => (
                <Link key={r.slug} href={`/blog/${r.slug}`} className="group">
                  <div className="rounded-xl overflow-hidden bg-card border border-border hover:border-primary/40 transition-colors">
                    {r.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.coverImage} alt={`${r.title} — NOIZU-DIRECT Blog`} className="w-full aspect-video object-cover" />
                    ) : (
                      <div className="w-full aspect-video bg-surface" />
                    )}
                    <div className="p-3">
                      <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">{r.title}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
