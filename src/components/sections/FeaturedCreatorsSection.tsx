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
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-[#0d0d12]">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-[#f0f0f5]">{content.title}</h2>
          <Link href="/marketplace" className="text-sm text-[#7c3aed] hover:underline">
            View all →
          </Link>
        </div>

        {creators.length === 0 ? (
          <p className="text-[#8888aa] text-center py-16">
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
                  className="group block bg-[#1e1e2a] rounded-xl border border-[#2a2a3a] overflow-hidden hover:border-[#7c3aed]/50 hover:shadow-[0_0_20px_rgba(124,58,237,0.15)] transition-all"
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
                      <div className="w-full h-full bg-gradient-to-br from-[#7c3aed]/20 to-[#00d4aa]/20" />
                    )}

                    {/* Top Creator badge */}
                    {creator.isTopCreator && (
                      <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-[#f59e0b] text-[#0d0d12] text-[10px] font-bold uppercase tracking-wide">
                        Top Creator
                      </span>
                    )}
                  </div>

                  {/* Avatar overlapping banner */}
                  <div className="px-4 pb-4">
                    <div className="-mt-6 mb-3">
                      {hasAvatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={creator.avatar!}
                          alt={creator.displayName}
                          className="w-12 h-12 rounded-full border-2 border-[#1e1e2a] object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full border-2 border-[#1e1e2a] bg-gradient-to-br from-[#7c3aed] to-[#00d4aa] flex items-center justify-center text-sm font-bold text-white">
                          {getInitials(creator.displayName)}
                        </div>
                      )}
                    </div>

                    {/* Name + verified */}
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="font-semibold text-[#f0f0f5] truncate">
                        {creator.displayName}
                      </span>
                      {creator.isVerified && (
                        <svg
                          className="w-4 h-4 shrink-0 text-[#00d4aa]"
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
                      <p className="text-xs text-[#8888aa] line-clamp-1 mb-2">{creator.bio}</p>
                    )}

                    {/* Category tags */}
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 rounded-full bg-[#7c3aed]/10 text-[#a78bfa] text-[10px] font-medium border border-[#7c3aed]/20"
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
