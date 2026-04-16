'use client'

import { useState } from 'react'

interface FollowButtonProps {
  creatorId: string
  initialFollowing: boolean
  isLoggedIn: boolean
  creatorUsername: string
}

export function FollowButton({ creatorId, initialFollowing, isLoggedIn, creatorUsername }: FollowButtonProps) {
  const [following, setFollowing] = useState(initialFollowing)
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    if (!isLoggedIn) {
      window.location.href = `/login?callbackUrl=/creator/${creatorUsername}`
      return
    }

    setLoading(true)
    try {
      if (following) {
        await fetch(`/api/following/${creatorId}`, { method: 'DELETE' })
        setFollowing(false)
      } else {
        await fetch('/api/following', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ creatorId }),
        })
        setFollowing(true)
      }
    } catch {
      // silently fail — state stays unchanged
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={[
        'mb-2 inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium transition-all',
        following
          ? 'border-primary bg-primary text-white hover:bg-primary/90'
          : 'border-border text-foreground hover:border-primary/60 hover:text-primary',
        loading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
      ].join(' ')}
      aria-label={following ? 'Unfollow creator' : 'Follow creator'}
    >
      {/* Users icon */}
      <svg
        viewBox="0 0 24 24"
        className="size-4 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
      {following ? 'Following ✓' : 'Follow'}
    </button>
  )
}
