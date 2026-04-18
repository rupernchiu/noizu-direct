'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Users } from 'lucide-react'
import { CATEGORY_LABELS } from '@/lib/labels'

type Creator = {
  id: string
  username: string
  displayName: string
  avatar: string | null
  bannerImage: string | null
  commissionStatus: string
  categoryTags: string | null
  totalSales: number
  isVerified: boolean
  isTopCreator: boolean
  _count: {
    products: number
  }
}

type FollowEntry = {
  id: string
  creatorId: string
  notifyNewProduct: boolean
  notifyCommissionOpen: boolean
  notifyNewPost: boolean
  followedAt: Date | string
  creator: Creator
}

type Props = {
  following: FollowEntry[]
}

const commissionStyles: Record<string, string> = {
  OPEN: 'bg-green-500/20 text-green-400',
  LIMITED: 'bg-yellow-500/20 text-yellow-400',
  CLOSED: 'bg-muted-foreground/20 text-muted-foreground',
}

const commissionLabels: Record<string, string> = {
  OPEN: 'Commissions Open',
  LIMITED: 'Limited Slots',
  CLOSED: 'Commissions Closed',
}

export function FollowingClient({ following: initialFollowing }: Props) {
  const [following, setFollowing] = useState<FollowEntry[]>(initialFollowing)
  const [unfollowing, setUnfollowing] = useState<Set<string>>(new Set())

  async function handleUnfollow(creatorId: string) {
    setUnfollowing(prev => new Set(prev).add(creatorId))
    setFollowing(prev => prev.filter(f => f.creatorId !== creatorId))

    try {
      await fetch(`/api/following/${creatorId}`, { method: 'DELETE' })
    } catch {
      // Silent fail — already removed from UI
    } finally {
      setUnfollowing(prev => {
        const next = new Set(prev)
        next.delete(creatorId)
        return next
      })
    }
  }

  if (following.length === 0) {
    return (
      <div className="bg-surface rounded-xl border border-border p-12 text-center">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-card text-muted-foreground">
          <Users className="size-8" />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-foreground">Not following anyone yet</h3>
        <p className="mb-6 text-sm text-muted-foreground max-w-sm mx-auto">
          Follow creators to stay updated on their new drops and releases.
        </p>
        <Link href="/creators" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors">
          Discover Creators
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {following.map(entry => {
        const { creator } = entry
        const isUnfollowing = unfollowing.has(creator.id)

        let tags: string[] = []
        try {
          const parsed = JSON.parse(creator.categoryTags ?? '[]')
          tags = Array.isArray(parsed) ? parsed : []
        } catch {
          tags = []
        }

        const commissionStyle = commissionStyles[creator.commissionStatus] ?? 'bg-muted/20 text-muted-foreground'
        const commissionLabel = commissionLabels[creator.commissionStatus] ?? creator.commissionStatus

        return (
          <div
            key={entry.id}
            className="bg-surface rounded-xl border border-border overflow-hidden flex flex-col"
          >
            {/* Banner */}
            <div
              className="relative"
              style={{ height: '60px' }}
            >
              {creator.bannerImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={creator.bannerImage}
                  alt={`${creator.displayName} — creator banner on noizu.direct`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="w-full h-full"
                  style={{
                    background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 50%, #0ea5e9 100%)',
                  }}
                />
              )}

              {/* Avatar overlapping banner */}
              <div className="absolute left-4 -bottom-5">
                {creator.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={creator.avatar}
                    alt={creator.displayName}
                    className="w-11 h-11 rounded-full object-cover border-2 border-surface"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-primary/20 border-2 border-surface flex items-center justify-center">
                    <span className="text-primary font-bold text-sm">
                      {creator.displayName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Card body */}
            <div className="px-4 pt-7 pb-4 flex flex-col flex-1 gap-2">
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="font-semibold text-foreground text-sm truncate">
                    {creator.displayName}
                  </p>
                  {creator.isVerified && (
                    <svg className="w-4 h-4 text-primary flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  )}
                  {creator.isTopCreator && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">
                      Top
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">@{creator.username}</p>
              </div>

              {/* Commission status */}
              <span
                className={`inline-flex items-center self-start px-2 py-0.5 rounded-full text-xs font-medium ${commissionStyle}`}
              >
                {commissionLabel}
              </span>

              {/* Tags */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {tags.slice(0, 3).map((tag: string) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-background text-muted-foreground"
                    >
                      {CATEGORY_LABELS[tag] ?? tag}
                    </span>
                  ))}
                  {tags.length > 3 && (
                    <span className="text-xs text-muted-foreground">+{tags.length - 3}</span>
                  )}
                </div>
              )}

              {/* Stats */}
              <p className="text-xs text-muted-foreground">
                {creator._count.products} product{creator._count.products !== 1 ? 's' : ''}{' '}
                &middot;{' '}
                {creator.totalSales.toLocaleString()} sale{creator.totalSales !== 1 ? 's' : ''}
              </p>

              {/* Actions */}
              <div className="mt-auto pt-2 flex flex-col gap-2">
                <Link
                  href={`/creator/${creator.username}`}
                  className="bg-primary hover:bg-primary/90 text-white rounded-lg px-4 py-2 text-sm font-medium text-center"
                >
                  Visit Store
                </Link>
                <button
                  suppressHydrationWarning
                  onClick={() => handleUnfollow(creator.id)}
                  disabled={isUnfollowing}
                  className="bg-background hover:bg-red-500/10 border border-border hover:border-red-500/30 text-muted-foreground hover:text-red-400 rounded-lg px-4 py-2 text-sm font-medium text-center transition-colors disabled:opacity-50"
                >
                  {isUnfollowing ? 'Unfollowing...' : 'Unfollow'}
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
