import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { EmptyState } from '@/components/ui/EmptyState'
import { rankCreators, deriveCategoryAffinity, type ScoredCreator } from '@/lib/discovery'
import {
  CreatorRail, ArticleRail, dailyShuffle,
  type RailCreator, type RailArticle,
} from '@/components/discovery/RecommendationRails'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Discover SEA Creators | noizu.direct',
  description: 'Browse Southeast Asian cosplayers, illustrators, doujin artists, and prop makers on noizu.direct. Support independent SEA creators.',
  alternates: { canonical: 'https://noizu.direct/creators' },
  openGraph: {
    title: 'Discover SEA Creators | noizu.direct',
    description: 'Browse Southeast Asian cosplayers, illustrators, doujin artists, and prop makers on noizu.direct.',
    url: 'https://noizu.direct/creators',
    images: [{ url: '/images/og-default.jpg', width: 1200, height: 630, alt: 'SEA Creators on noizu.direct' }],
  },
}

const PAGE_SIZE = 20

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function parseTags(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as string[]) : []
  } catch { return [] }
}

const COMMISSION_STATUS: Record<string, { label: string; className: string }> = {
  OPEN:    { label: 'Open',    className: 'bg-success/10 text-success border border-success/30' },
  CLOSED:  { label: 'Closed',  className: 'bg-destructive/10 text-destructive border border-destructive/30' },
  LIMITED: { label: 'Limited', className: 'bg-warning/10 text-warning border border-warning/30' },
}

function pageUrl(p: number) {
  return p === 1 ? '/creators' : `/creators?page=${p}`
}

export default async function CreatorsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)

  // Personalisation: derive category affinity for logged-in buyers
  const session = await auth()
  const userId = (session?.user as any)?.id as string | undefined
  let userCategories: string[] = []
  if (userId) {
    const recentViews = await prisma.productView.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { product: { select: { category: true } } },
    })
    userCategories = deriveCategoryAffinity(recentViews)
  }

  // Fetch creator pool and apply discovery scoring
  const allCreators = await prisma.creatorProfile.findMany({
    select: {
      id: true,
      username: true,
      displayName: true,
      bio: true,
      avatar: true,
      bannerImage: true,
      categoryTags: true,
      isVerified: true,
      isTopCreator: true,
      totalSales: true,
      commissionStatus: true,
      boostMultiplier: true,
      lastFeaturedAt: true,
      createdAt: true,
    },
  })

  const { items: creators, total, page1Ids } = rankCreators(
    allCreators as ScoredCreator[],
    userCategories,
    page,
    PAGE_SIZE,
  )

  const totalPages = Math.ceil(total / PAGE_SIZE)

  // Side-sell rails
  const [commissionCreatorsRaw, articlesRaw] = await Promise.all([
    prisma.creatorProfile.findMany({
      where: { isSuspended: false, commissionStatus: 'OPEN' },
      select: { username: true, displayName: true, avatar: true, isVerified: true, categoryTags: true },
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

  const recommendedCommissions: RailCreator[] = dailyShuffle(commissionCreatorsRaw, 6)
    .slice(0, 6)
    .map((c) => {
      let tags: string[] = []
      try { tags = JSON.parse(c.categoryTags) } catch {}
      return { username: c.username, displayName: c.displayName, avatar: c.avatar, isVerified: c.isVerified, categoryTags: tags }
    })
  const creatorsArticleRail: RailArticle[] = dailyShuffle(articlesRaw, 7).slice(0, 6)

  // Fire-and-forget: update lastFeaturedAt for page-1 creators
  if (page === 1 && page1Ids.length > 0) {
    prisma.creatorProfile
      .updateMany({ where: { id: { in: page1Ids } }, data: { lastFeaturedAt: new Date() } })
      .catch(() => {/* non-critical */})
  }

  // Build ellipsis page list
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce<(number | '...')[]>((acc, p, idx, arr) => {
      if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...')
      acc.push(p)
      return acc
    }, [])

  return (
    <div className="min-h-screen bg-background py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Creators</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Discover original creators from Southeast Asia
            {userCategories.length > 0 && (
              <span className="ml-1 text-primary">· personalised for you</span>
            )}
          </p>
        </div>

        {creators.length === 0 ? (
          <EmptyState title="No creators yet" description="Be the first to join noizu.direct as a creator!" />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {creators.map((creator) => {
                const tags = parseTags(creator.categoryTags).slice(0, 3)
                const hasBanner = Boolean(creator.bannerImage)
                const hasAvatar = Boolean(creator.avatar)
                const commissionInfo = COMMISSION_STATUS[creator.commissionStatus] ?? COMMISSION_STATUS.OPEN

                return (
                  <Link
                    key={creator.id}
                    href={`/creator/${creator.username}`}
                    className="group block overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-primary/50 hover:shadow-[0_0_20px_rgba(124,58,237,0.15)]"
                  >
                    <div className="relative h-24">
                      {hasBanner ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={creator.bannerImage!} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full bg-gradient-to-br from-primary/20 to-secondary/20" />
                      )}
                      {creator.isTopCreator && (
                        <span className="absolute right-2 top-2 rounded-full bg-warning px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-background">
                          Top Creator
                        </span>
                      )}
                    </div>

                    <div className="px-4 pb-4">
                      <div className="relative z-10 -mt-6 mb-3">
                        {hasAvatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={creator.avatar!} alt={creator.displayName} className="size-12 rounded-full border-2 border-background object-cover" />
                        ) : (
                          <div className="flex size-12 items-center justify-center rounded-full border-2 border-background bg-gradient-to-br from-primary to-secondary text-sm font-bold text-white">
                            {getInitials(creator.displayName)}
                          </div>
                        )}
                      </div>

                      <div className="mb-1 flex items-center gap-1.5">
                        <span className="truncate font-semibold text-foreground">{creator.displayName}</span>
                        {creator.isVerified && (
                          <svg className="size-4 shrink-0 text-secondary" viewBox="0 0 16 16" fill="currentColor" aria-label="Verified">
                            <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zm3.646 5.146a.5.5 0 0 0-.707 0L6.5 9.586 5.061 8.146a.5.5 0 1 0-.707.708l1.793 1.793a.5.5 0 0 0 .707 0l4.793-4.793a.5.5 0 0 0 0-.708z" />
                          </svg>
                        )}
                      </div>

                      <span className={`mb-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${commissionInfo.className}`}>
                        Commissions: {commissionInfo.label}
                      </span>

                      {creator.bio && (
                        <p className="mb-2 line-clamp-2 text-xs text-muted-foreground">{creator.bio}</p>
                      )}

                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {tags.map(tag => (
                            <span key={tag} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary border border-primary/20">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>

            {totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-2">
                <Link
                  href={pageUrl(page - 1)}
                  aria-disabled={page === 1}
                  className={`rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-border hover:text-foreground ${page === 1 ? 'pointer-events-none opacity-40' : ''}`}
                >
                  Previous
                </Link>

                <div className="flex items-center gap-1">
                  {pageNumbers.map((item, idx) =>
                    item === '...' ? (
                      <span key={`e-${idx}`} className="px-2 text-muted-foreground">…</span>
                    ) : (
                      <Link
                        key={item}
                        href={pageUrl(item as number)}
                        className={`flex size-9 items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                          page === item
                            ? 'bg-primary text-white'
                            : 'border border-border bg-card text-muted-foreground hover:bg-border hover:text-foreground'
                        }`}
                      >
                        {item}
                      </Link>
                    )
                  )}
                </div>

                <Link
                  href={pageUrl(page + 1)}
                  aria-disabled={page === totalPages}
                  className={`rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-border hover:text-foreground ${page === totalPages ? 'pointer-events-none opacity-40' : ''}`}
                >
                  Next
                </Link>
              </div>
            )}
          </>
        )}

        <CreatorRail title="Recommended Commissions" creators={recommendedCommissions} />
        <ArticleRail articles={creatorsArticleRail} />
      </div>
    </div>
  )
}
