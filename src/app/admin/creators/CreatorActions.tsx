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
  userEmail: string
  badges: string[]
  legalFullName?: string | null
  boostMultiplier: number
}

export function CreatorActions({
  creatorId,
  isVerified,
  isTopCreator,
  isSuspended,
  username,
  userEmail,
  badges,
  legalFullName,
  boostMultiplier,
}: CreatorActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [badgesOpen, setBadgesOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [legalNameOpen, setLegalNameOpen] = useState(false)
  const [legalNameInput, setLegalNameInput] = useState(legalFullName ?? '')
  const [boostOpen, setBoostOpen] = useState(false)
  const [boostInput, setBoostInput] = useState(String(boostMultiplier))
  const [boostSaving, setBoostSaving] = useState(false)
  const boostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (boostRef.current && !boostRef.current.contains(e.target as Node)) setBoostOpen(false)
    }
    if (boostOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [boostOpen])

  async function saveBoost() {
    const val = parseFloat(boostInput)
    if (isNaN(val) || val < 0 || val > 10) return
    setBoostSaving(true)
    await fetch(`/api/admin/creators/${creatorId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ boostMultiplier: val }),
    })
    setBoostSaving(false)
    setBoostOpen(false)
    router.refresh()
  }
  const [legalNameSaving, setLegalNameSaving] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const legalNameRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (legalNameRef.current && !legalNameRef.current.contains(e.target as Node)) {
        setLegalNameOpen(false)
      }
    }
    if (legalNameOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [legalNameOpen])

  async function saveLegalName() {
    if (!legalNameInput.trim()) return
    setLegalNameSaving(true)
    await fetch(`/api/admin/creators/${creatorId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ legalFullName: legalNameInput.trim() }),
    })
    setLegalNameSaving(false)
    setLegalNameOpen(false)
    router.refresh()
  }

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

  async function handleDelete() {
    setDeleteError(null)
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/creators/${creatorId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmText: deleteConfirmText }),
      })
      if (!res.ok) {
        const b = await res.json().catch(() => ({})) as { error?: string }
        setDeleteError(b.error ?? 'Failed to delete account')
        return
      }
      setDeleteOpen(false)
      setDeleteConfirmText('')
      router.refresh()
    } catch {
      setDeleteError('Something went wrong')
    } finally {
      setDeleting(false)
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

      {/* Legal Name */}
      <div className="relative" ref={legalNameRef}>
        <button
          onClick={() => setLegalNameOpen((o) => !o)}
          className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
            legalFullName
              ? 'bg-border text-muted-foreground hover:bg-card hover:text-foreground'
              : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
          }`}
        >
          {legalFullName ? 'Legal Name ✓' : '⚠ Set Legal Name'}
        </button>
        {legalNameOpen && (
          <div className="absolute left-0 top-full mt-1 z-50 min-w-[220px] bg-card border border-border rounded-lg shadow-xl p-3 space-y-2">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Legal Full Name</p>
            <input
              value={legalNameInput}
              onChange={e => setLegalNameInput(e.target.value)}
              placeholder="e.g. Ahmad Farhan bin Aziz"
              className="w-full px-2 py-1.5 text-xs bg-background border border-border rounded text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
              onKeyDown={e => { if (e.key === 'Enter') saveLegalName() }}
              autoFocus
            />
            <button
              onClick={saveLegalName}
              disabled={legalNameSaving || !legalNameInput.trim()}
              className="w-full py-1 text-xs font-medium bg-primary/20 text-primary rounded hover:bg-primary/30 disabled:opacity-40 transition-colors"
            >
              {legalNameSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}
      </div>

      {/* Discovery Boost */}
      <div className="relative" ref={boostRef}>
        <button
          onClick={() => setBoostOpen(o => !o)}
          className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
            boostMultiplier !== 1
              ? 'bg-primary/20 text-primary hover:bg-primary/30'
              : 'bg-border text-muted-foreground hover:bg-card hover:text-foreground'
          }`}
        >
          Boost ×{boostMultiplier}
        </button>
        {boostOpen && (
          <div className="absolute left-0 top-full mt-1 z-50 min-w-[200px] bg-card border border-border rounded-lg shadow-xl p-3 space-y-2">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Discovery Boost Multiplier</p>
            <p className="text-[10px] text-muted-foreground">1.0 = normal · 2.0 = double · 0.0 = hide</p>
            <input
              type="number"
              min="0" max="10" step="0.1"
              value={boostInput}
              onChange={e => setBoostInput(e.target.value)}
              className="w-full px-2 py-1.5 text-xs bg-background border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              onKeyDown={e => { if (e.key === 'Enter') saveBoost() }}
              autoFocus
            />
            <button
              onClick={saveBoost}
              disabled={boostSaving}
              className="w-full py-1 text-xs font-medium bg-primary/20 text-primary rounded hover:bg-primary/30 disabled:opacity-40 transition-colors"
            >
              {boostSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}
      </div>

      {/* Delete Account */}
      <button
        onClick={() => { setDeleteError(null); setDeleteConfirmText(''); setDeleteOpen(true) }}
        disabled={loading}
        className="px-2 py-0.5 rounded text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-colors disabled:opacity-50"
      >
        Delete
      </button>

      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-semibold text-red-400">Delete creator account?</h3>
            <p className="text-sm text-muted-foreground">
              This revokes access for <strong className="text-foreground">{userEmail}</strong> and marks the account as
              <span className="font-mono text-xs"> DELETED / CLOSED</span>. Order history, payouts, and tax records are preserved.
              The user is forcibly logged out.
            </p>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Type <span className="font-mono text-foreground">DELETE</span> to confirm
              </label>
              <input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full rounded-lg bg-background border border-red-500/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-red-500/40"
                autoFocus
              />
            </div>
            {deleteError && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-xs text-red-400">
                {deleteError}
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting || deleteConfirmText !== 'DELETE'}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? 'Deleting…' : 'Delete Account'}
              </button>
              <button
                type="button"
                onClick={() => { setDeleteOpen(false); setDeleteError(null); setDeleteConfirmText('') }}
                className="flex-1 px-4 py-2 rounded-lg bg-card border border-border text-muted-foreground text-sm hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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
