'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const AVAILABLE_BADGES = ['Convention Veteran', 'NOIZU Member'] as const

interface CreatorActionsProps {
  creatorId: string
  isVerified: boolean
  isTopCreator: boolean
  isSuspended: boolean
  username: string
  badges: string[]
}

export function CreatorActions({
  creatorId,
  isVerified,
  isTopCreator,
  isSuspended,
  username,
  badges,
}: CreatorActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [badgesOpen, setBadgesOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setBadgesOpen(false)
      }
    }
    if (badgesOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [badgesOpen])

  async function update(data: Record<string, unknown>) {
    setLoading(true)
    try {
      await fetch(`/api/admin/creators/${creatorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  async function toggleBadge(badge: string) {
    const next = badges.includes(badge)
      ? badges.filter((b) => b !== badge)
      : [...badges, badge]
    await update({ badges: next })
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* Verify toggle */}
      <button
        onClick={() => update({ isVerified: !isVerified })}
        disabled={loading}
        className={`px-2 py-0.5 rounded text-xs font-medium transition-colors disabled:opacity-50 ${
          isVerified
            ? 'bg-green-500/20 text-green-400 hover:bg-red-500/20 hover:text-red-400'
            : 'bg-border text-muted-foreground hover:bg-green-500/20 hover:text-green-400'
        }`}
      >
        {isVerified ? 'Verified ✓' : 'Unverified'}
      </button>

      {/* Top Creator toggle */}
      <button
        onClick={() => update({ isTopCreator: !isTopCreator })}
        disabled={loading}
        className={`px-2 py-0.5 rounded text-xs font-medium transition-colors disabled:opacity-50 ${
          isTopCreator
            ? 'bg-primary/20 text-primary hover:bg-border hover:text-muted-foreground'
            : 'bg-border text-muted-foreground hover:bg-primary/20 hover:text-primary'
        }`}
      >
        {isTopCreator ? 'Top Creator ★' : 'Not Top'}
      </button>

      {/* Suspend / Unsuspend toggle */}
      <button
        onClick={() => update({ isSuspended: !isSuspended })}
        disabled={loading}
        className={`px-2 py-0.5 rounded text-xs font-medium transition-colors disabled:opacity-50 ${
          isSuspended
            ? 'bg-red-500/20 text-red-400 hover:bg-green-500/20 hover:text-green-400'
            : 'bg-border text-muted-foreground hover:bg-red-500/20 hover:text-red-400'
        }`}
      >
        {isSuspended ? 'Unsuspend' : 'Suspend'}
      </button>

      {/* View Profile link */}
      <a
        href={`/creator/${username}`}
        target="_blank"
        rel="noopener noreferrer"
        className="px-2 py-0.5 rounded text-xs font-medium bg-border text-muted-foreground hover:bg-card hover:text-foreground transition-colors"
      >
        Profile ↗
      </a>

      {/* Badges dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setBadgesOpen((o) => !o)}
          disabled={loading}
          className="px-2 py-0.5 rounded text-xs font-medium bg-border text-muted-foreground hover:bg-card hover:text-foreground transition-colors disabled:opacity-50"
        >
          Badges {badges.length > 0 ? `(${badges.length})` : ''}▾
        </button>

        {badgesOpen && (
          <div className="absolute right-0 top-full mt-1 z-50 min-w-[180px] bg-card border border-border rounded-lg shadow-xl p-2 space-y-1">
            {/* Current badges as removable tags */}
            {badges.length > 0 && (
              <div className="flex flex-wrap gap-1 pb-1 border-b border-border">
                {badges.map((b) => (
                  <span
                    key={b}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-primary/20 text-primary"
                  >
                    {b}
                    <button
                      onClick={() => toggleBadge(b)}
                      className="hover:text-red-400 transition-colors leading-none"
                      aria-label={`Remove badge ${b}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Add badge options */}
            <p className="text-[10px] text-muted-foreground px-1 pt-0.5">Add badge</p>
            {AVAILABLE_BADGES.map((badge) => {
              const active = badges.includes(badge)
              return (
                <button
                  key={badge}
                  onClick={() => toggleBadge(badge)}
                  className={`w-full text-left px-2 py-1 rounded text-xs transition-colors ${
                    active
                      ? 'bg-primary/20 text-primary hover:bg-red-500/10 hover:text-red-400'
                      : 'text-foreground hover:bg-border'
                  }`}
                >
                  {active ? '✓ ' : '+ '}
                  {badge}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
