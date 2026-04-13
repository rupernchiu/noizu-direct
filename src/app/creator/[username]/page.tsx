import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { ProductCard } from '@/components/ui/ProductCard'
import { EmptyState } from '@/components/ui/EmptyState'

interface PageProps {
  params: Promise<{ username: string }>
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

function parseSocialLinks(raw: string): Record<string, string> {
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {}
  } catch {
    return {}
  }
}

const COMMISSION_STATUS: Record<string, { label: string; className: string }> = {
  OPEN: { label: 'Commissions Open', className: 'bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/30' },
  CLOSED: { label: 'Commissions Closed', className: 'bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/30' },
  LIMITED: { label: 'Limited Slots', className: 'bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/30' },
}

const SOCIAL_ICONS: Record<string, string> = {
  twitter: 'X / Twitter',
  instagram: 'Instagram',
  pixiv: 'Pixiv',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  twitch: 'Twitch',
}

export default async function CreatorPage({ params }: PageProps) {
  const { username } = await params

  const creator = await prisma.creatorProfile.findUnique({
    where: { username },
    include: {
      user: { select: { id: true, name: true } },
      products: {
        where: { isActive: true },
        orderBy: [{ isPinned: 'desc' }, { order: 'asc' }, { createdAt: 'desc' }],
      },
    },
  })

  if (!creator) notFound()

  const session = await auth()
  const isLoggedIn = Boolean(session?.user)

  const tags = parseTags(creator.categoryTags)
  const socialLinks = parseSocialLinks(creator.socialLinks)
  const commissionInfo = COMMISSION_STATUS[creator.commissionStatus] ?? COMMISSION_STATUS.OPEN

  const pinnedProducts = creator.products.filter((p) => p.isPinned)
  const unpinnedProducts = creator.products.filter((p) => !p.isPinned)

  return (
    <div className="min-h-screen bg-[#0d0d12]">
      {/* Banner */}
      <div className="relative h-48 w-full overflow-hidden">
        {creator.bannerImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={creator.bannerImage}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-[#7c3aed]/40 via-[#16161f] to-[#00d4aa]/30" />
        )}
        {/* Bottom overlay gradient */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#0d0d12] to-transparent" />
      </div>

      {/* Profile section */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Avatar overlapping banner */}
        <div className="-mt-12 flex items-end justify-between">
          <div className="flex items-end gap-4">
            {creator.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={creator.avatar}
                alt={creator.displayName}
                className="size-24 rounded-full border-4 border-[#0d0d12] object-cover"
              />
            ) : (
              <div className="flex size-24 items-center justify-center rounded-full border-4 border-[#0d0d12] bg-gradient-to-br from-[#7c3aed] to-[#00d4aa] text-2xl font-bold text-white">
                {getInitials(creator.displayName)}
              </div>
            )}
          </div>

          {/* Message Creator button */}
          {isLoggedIn ? (
            <Link
              href={`/messages?creator=${creator.username}`}
              className="mb-2 rounded-xl border border-[#7c3aed] px-5 py-2.5 text-sm font-semibold text-[#a78bfa] transition-all hover:bg-[#7c3aed]/10"
            >
              Message Creator
            </Link>
          ) : (
            <Link
              href="/login"
              className="mb-2 rounded-xl border border-[#7c3aed] px-5 py-2.5 text-sm font-semibold text-[#a78bfa] transition-all hover:bg-[#7c3aed]/10"
            >
              Message Creator
            </Link>
          )}
        </div>

        {/* Name + badges */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold text-[#f0f0f5]">{creator.displayName}</h1>

          {creator.isVerified && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#00d4aa]/10 px-2.5 py-0.5 text-xs font-semibold text-[#00d4aa] border border-[#00d4aa]/30">
              <svg className="size-3" viewBox="0 0 16 16" fill="currentColor" aria-label="Verified">
                <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zm3.646 5.146a.5.5 0 0 0-.707 0L6.5 9.586 5.061 8.146a.5.5 0 1 0-.707.708l1.793 1.793a.5.5 0 0 0 .707 0l4.793-4.793a.5.5 0 0 0 0-.708z" />
              </svg>
              Verified
            </span>
          )}

          {creator.isTopCreator && (
            <span className="rounded-full bg-[#f59e0b] px-2.5 py-0.5 text-xs font-bold text-[#0d0d12] uppercase tracking-wide">
              Top Creator
            </span>
          )}

          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${commissionInfo.className}`}>
            {commissionInfo.label}
          </span>
        </div>

        {/* Username */}
        <p className="mt-1 text-sm text-[#8888aa]">@{creator.username}</p>

        {/* Bio */}
        {creator.bio && (
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#8888aa]">{creator.bio}</p>
        )}

        {/* Category tags */}
        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-[#00d4aa]/10 px-3 py-1 text-xs font-medium text-[#00d4aa] border border-[#00d4aa]/20"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Stats row */}
        <div className="mt-4 flex gap-6">
          <div className="text-center">
            <span className="block text-lg font-bold text-[#f0f0f5]">{creator.totalSales}</span>
            <span className="text-xs text-[#8888aa]">Sales</span>
          </div>
          <div className="text-center">
            <span className="block text-lg font-bold text-[#f0f0f5]">{creator.products.length}</span>
            <span className="text-xs text-[#8888aa]">Products</span>
          </div>
        </div>

        {/* Social links */}
        {Object.keys(socialLinks).length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(socialLinks).map(([platform, url]) => {
              if (!url) return null
              return (
                <a
                  key={platform}
                  href={url as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-[#1e1e2a] border border-[#2a2a3a] px-3 py-1.5 text-xs text-[#8888aa] hover:text-[#f0f0f5] hover:border-[#7c3aed]/40 transition-all"
                >
                  {SOCIAL_ICONS[platform] ?? platform}
                </a>
              )
            })}
          </div>
        )}
      </div>

      {/* Announcement bar */}
      {creator.announcementActive && creator.announcementText && (
        <div className="mx-auto mt-6 max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-xl bg-[#7c3aed]/10 border border-[#7c3aed]/30 px-4 py-3 text-sm text-[#a78bfa]">
            <span className="font-semibold">Announcement:</span> {creator.announcementText}
          </div>
        </div>
      )}

      {/* Products section */}
      <div className="mx-auto mt-10 max-w-5xl px-4 pb-16 sm:px-6 lg:px-8">
        <h2 className="mb-6 text-xl font-bold text-[#f0f0f5]">Products</h2>

        {creator.products.length === 0 ? (
          <EmptyState
            title="No products yet"
            description="This creator hasn't listed any products yet. Check back soon!"
          />
        ) : (
          <>
            {/* Pinned / featured products */}
            {pinnedProducts.length > 0 && (
              <div className="mb-8">
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-sm font-semibold text-[#f0f0f5]">Featured</span>
                  <span className="rounded-full bg-[#7c3aed]/20 px-2 py-0.5 text-[10px] text-[#a78bfa] border border-[#7c3aed]/30">
                    Pinned
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {pinnedProducts.map((product) => (
                    <div key={product.id} className="relative">
                      <div className="absolute -top-2 left-2 z-10 rounded-full bg-[#7c3aed] px-2 py-0.5 text-[10px] font-bold text-white">
                        Featured
                      </div>
                      <ProductCard
                        product={{
                          ...product,
                          images: product.images,
                          creator: {
                            username: creator.username,
                            displayName: creator.displayName,
                            avatar: creator.avatar,
                            isVerified: creator.isVerified,
                            isTopCreator: creator.isTopCreator,
                          },
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All other products */}
            {unpinnedProducts.length > 0 && (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {unpinnedProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={{
                      ...product,
                      images: product.images,
                      creator: {
                        username: creator.username,
                        displayName: creator.displayName,
                        avatar: creator.avatar,
                        isVerified: creator.isVerified,
                        isTopCreator: creator.isTopCreator,
                      },
                    }}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
