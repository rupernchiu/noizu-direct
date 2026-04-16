import { prisma } from '@/lib/prisma'
import Link from 'next/link'

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

export default async function FeaturedCreatorsSection({
  content,
}: {
  content: FeaturedCreatorsContent
}) {
  const creators = await prisma.creatorProfile.findMany({
    where: { isVerified: true },
    take: content.maxDisplay,
    orderBy: { totalSales: 'desc' },
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
    },
  })

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-foreground">{content.title}</h2>
          <Link href="/marketplace" className="text-sm text-primary hover:underline">
            View all →
          </Link>
        </div>

        {creators.length === 0 ? (
          <p className="text-muted-foreground text-center py-16">
            No featured creators yet — check back soon!
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {creators.map((creator) => {
              const tags = parseTags(creator.categoryTags).slice(0, 2)
              const hasAvatar = Boolean(creator.avatar)
              const hasBanner = Boolean(creator.bannerImage)

              return (
                <Link
                  key={creator.id}
                  href={`/creator/${creator.username}`}
                  className="group block bg-card rounded-xl border border-border overflow-hidden hover:border-primary/50 hover:shadow-[0_0_20px_rgba(124,58,237,0.15)] transition-all"
                >
                  {/* Banner */}
                  <div className="relative h-24">
                    {hasBanner ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={creator.bannerImage!}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20" />
                    )}

                    {/* Top Creator badge */}
                    {creator.isTopCreator && (
                      <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-warning text-background text-[10px] font-bold uppercase tracking-wide">
                        Top Creator
                      </span>
                    )}
                  </div>

                  {/* Avatar — top half over banner, bottom half below */}
                  <div className="px-4 pb-4">
                    <div className="relative z-10 -mt-6 mb-3">
                      {hasAvatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={creator.avatar!}
                          alt={creator.displayName}
                          className="w-12 h-12 rounded-full border-2 border-background object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full border-2 border-background bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-sm font-bold text-white">
                          {getInitials(creator.displayName)}
                        </div>
                      )}
                    </div>

                    {/* Name + verified */}
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="font-semibold text-foreground truncate">
                        {creator.displayName}
                      </span>
                      {creator.isVerified && (
                        <svg
                          className="w-4 h-4 shrink-0 text-secondary"
                          viewBox="0 0 16 16"
                          fill="currentColor"
                          aria-label="Verified"
                        >
                          <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zm3.646 5.146a.5.5 0 0 0-.707 0L6.5 9.586 5.061 8.146a.5.5 0 1 0-.707.708l1.793 1.793a.5.5 0 0 0 .707 0l4.793-4.793a.5.5 0 0 0 0-.708z" />
                        </svg>
                      )}
                    </div>

                    {/* Bio */}
                    {creator.bio && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{creator.bio}</p>
                    )}

                    {/* Category tags */}
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium border border-primary/20"
                          >
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
