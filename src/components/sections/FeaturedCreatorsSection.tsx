import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import Link from 'next/link'
import { rankCreators, deriveCategoryAffinity, type ScoredCreator } from '@/lib/discovery'

interface FeaturedCreatorsContent {
  title: string
  maxDisplay: number
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function parseTags(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as string[]) : []
  } catch {
    return []
  }
}

const COMMISSION_STATUS: Record<string, { label: string; className: string }> = {
  OPEN: { label: 'Open', className: 'bg-success/10 text-success border border-success/30' },
  CLOSED: { label: 'Closed', className: 'bg-destructive/10 text-destructive border border-destructive/30' },
  LIMITED: { label: 'Limited', className: 'bg-warning/10 text-warning border border-warning/30' },
}

export default async function FeaturedCreatorsSection({
  content,
}: {
  content: FeaturedCreatorsContent
}) {
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

  const pool = await prisma.creatorProfile.findMany({
    where: { isVerified: true },
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

  const displayCount = Math.max(content.maxDisplay, 8)
  const { items: creators } = rankCreators(pool as ScoredCreator[], userCategories, 1, displayCount)

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-foreground">{content.title}</h2>
          <Link href="/creators" className="text-sm text-primary hover:underline">
            View all →
          </Link>
        </div>

        {creators.length === 0 ? (
          <p className="text-muted-foreground text-center py-16">
            No featured creators yet — check back soon!
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {creators.map((creator) => {
              const tags = parseTags(creator.categoryTags).slice(0, 3)
              const hasBanner = Boolean(creator.bannerImage)
              const hasAvatar = Boolean(creator.avatar)
              const commissionInfo =
                COMMISSION_STATUS[creator.commissionStatus] ?? COMMISSION_STATUS.OPEN

              return (
                <Link
                  key={creator.id}
                  href={`/creator/${creator.username}`}
                  className="group block overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-primary/50 hover:shadow-[0_0_20px_rgba(124,58,237,0.15)]"
                >
                  {/* Banner */}
                  <div className="relative h-24">
                    {hasBanner ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={creator.bannerImage!}
                        alt={`${creator.displayName} — creator banner`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-primary/20 to-secondary/20" />
                    )}

                    {/* Top Creator badge */}
                    {creator.isTopCreator && (
                      <span className="absolute right-2 top-2 rounded-full bg-warning px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-background">
                        Top Creator
                      </span>
                    )}
                  </div>

                  {/* Card body */}
                  <div className="px-4 pb-4">
                    {/* Avatar — overlapping banner */}
                    <div className="relative z-10 -mt-6 mb-3">
                      {hasAvatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={creator.avatar!}
                          alt={creator.displayName}
                          className="size-12 rounded-full border-2 border-background object-cover"
                        />
                      ) : (
                        <div className="flex size-12 items-center justify-center rounded-full border-2 border-background bg-gradient-to-br from-primary to-secondary text-sm font-bold text-white">
                          {getInitials(creator.displayName)}
                        </div>
                      )}
                    </div>

                    {/* Name + verified */}
                    <div className="mb-1 flex items-center gap-1.5">
                      <span className="truncate font-semibold text-foreground">
                        {creator.displayName}
                      </span>
                      {creator.isVerified && (
                        <svg className="size-4 shrink-0 text-secondary" viewBox="0 0 16 16" fill="currentColor" aria-label="Verified">
                          <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zm3.646 5.146a.5.5 0 0 0-.707 0L6.5 9.586 5.061 8.146a.5.5 0 1 0-.707.708l1.793 1.793a.5.5 0 0 0 .707 0l4.793-4.793a.5.5 0 0 0 0-.708z" />
                        </svg>
                      )}
                    </div>

                    {/* Commission status */}
                    <span className={`mb-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${commissionInfo.className}`}>
                      Commissions: {commissionInfo.label}
                    </span>

                    {/* Bio */}
                    {creator.bio && (
                      <p className="mb-2 line-clamp-2 text-xs text-muted-foreground">{creator.bio}</p>
                    )}

                    {/* Tags */}
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {tags.map((tag) => (
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
        )}
      </div>
    </section>
  )
}
