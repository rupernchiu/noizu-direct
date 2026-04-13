import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { EmptyState } from '@/components/ui/EmptyState'

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
  OPEN: { label: 'Open', className: 'bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/30' },
  CLOSED: { label: 'Closed', className: 'bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/30' },
  LIMITED: { label: 'Limited', className: 'bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/30' },
}

export default async function CreatorsPage() {
  const creators = await prisma.creatorProfile.findMany({
    orderBy: [{ isTopCreator: 'desc' }, { totalSales: 'desc' }],
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
    },
  })

  return (
    <div className="min-h-screen bg-[#0d0d12] py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#f0f0f5]">Creators</h1>
          <p className="mt-2 text-sm text-[#8888aa]">
            Discover original creators from Southeast Asia
          </p>
        </div>

        {creators.length === 0 ? (
          <EmptyState
            title="No creators yet"
            description="Be the first to join NOIZU-DIRECT as a creator!"
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                  className="group block overflow-hidden rounded-xl border border-[#2a2a3a] bg-[#1e1e2a] transition-all hover:border-[#7c3aed]/50 hover:shadow-[0_0_20px_rgba(124,58,237,0.15)]"
                >
                  {/* Banner */}
                  <div className="relative h-24">
                    {hasBanner ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={creator.bannerImage!}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-[#7c3aed]/20 to-[#00d4aa]/20" />
                    )}

                    {/* Top Creator badge */}
                    {creator.isTopCreator && (
                      <span className="absolute right-2 top-2 rounded-full bg-[#f59e0b] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#0d0d12]">
                        Top Creator
                      </span>
                    )}
                  </div>

                  {/* Card body */}
                  <div className="px-4 pb-4">
                    {/* Avatar overlapping banner */}
                    <div className="-mt-6 mb-3">
                      {hasAvatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={creator.avatar!}
                          alt={creator.displayName}
                          className="size-12 rounded-full border-2 border-[#1e1e2a] object-cover"
                        />
                      ) : (
                        <div className="flex size-12 items-center justify-center rounded-full border-2 border-[#1e1e2a] bg-gradient-to-br from-[#7c3aed] to-[#00d4aa] text-sm font-bold text-white">
                          {getInitials(creator.displayName)}
                        </div>
                      )}
                    </div>

                    {/* Name + verified */}
                    <div className="mb-1 flex items-center gap-1.5">
                      <span className="truncate font-semibold text-[#f0f0f5]">
                        {creator.displayName}
                      </span>
                      {creator.isVerified && (
                        <svg
                          className="size-4 shrink-0 text-[#00d4aa]"
                          viewBox="0 0 16 16"
                          fill="currentColor"
                          aria-label="Verified"
                        >
                          <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zm3.646 5.146a.5.5 0 0 0-.707 0L6.5 9.586 5.061 8.146a.5.5 0 1 0-.707.708l1.793 1.793a.5.5 0 0 0 .707 0l4.793-4.793a.5.5 0 0 0 0-.708z" />
                        </svg>
                      )}
                    </div>

                    {/* Commission status */}
                    <span
                      className={`mb-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${commissionInfo.className}`}
                    >
                      Commissions: {commissionInfo.label}
                    </span>

                    {/* Bio */}
                    {creator.bio && (
                      <p className="mb-2 line-clamp-2 text-xs text-[#8888aa]">{creator.bio}</p>
                    )}

                    {/* Tags */}
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-[#7c3aed]/10 px-2 py-0.5 text-[10px] font-medium text-[#a78bfa] border border-[#7c3aed]/20"
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
    </div>
  )
}
