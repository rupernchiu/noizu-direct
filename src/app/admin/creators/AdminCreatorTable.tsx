'use client'

import { useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { CreatorActions } from './CreatorActions'
import { HealthActions } from './HealthActions'
import { Pagination } from '@/components/ui/Pagination'

export interface CreatorRow {
  id: string
  username: string
  displayName: string
  isVerified: boolean
  isTopCreator: boolean
  isSuspended: boolean
  storeStatus: string
  storeStatusReason: string | null
  badges: string[]
  boostMultiplier: number
  totalSales: number   // stale stored count — not displayed; use orderCount instead
  orderCount: number   // live: fulfilled orders (PAID/COMPLETED/SHIPPED/PROCESSING)
  revenue: number      // live: sum of creatorAmount from COMPLETED transactions (cents)
  createdAt: Date
  user: {
    email: string
    createdAt: Date
    legalFullName?: string | null
  }
  _count: {
    products: number
  }
}

interface AdminCreatorTableProps {
  creators: CreatorRow[]
  total: number
  page: number
  perPage: number
  healthTab: string
}

type BulkAction = 'verify' | 'suspend' | 'unsuspend' | 'archive'

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

const HEALTH_BADGE: Record<string, { label: string; className: string }> = {
  ACTIVE:  { label: 'Active',   className: 'bg-green-500/20 text-green-400' },
  IDLE:    { label: 'Idle',     className: 'bg-border text-muted-foreground' },
  HIATUS:  { label: 'Hiatus',   className: 'bg-amber-500/20 text-amber-400' },
  FLAGGED: { label: 'Flagged',  className: 'bg-destructive/20 text-destructive' },
}

export function AdminCreatorTable({ creators, total, page, perPage, healthTab }: AdminCreatorTableProps) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)

  const allIds = creators.map((c) => c.id)
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id))

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(allIds))
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  async function runBulkAction(action: BulkAction) {
    if (selected.size === 0) return
    setBulkLoading(true)
    try {
      await fetch('/api/admin/creators/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ids: Array.from(selected) }),
      })
      setSelected(new Set())
      router.refresh()
    } finally {
      setBulkLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* Bulk actions bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-card border border-border rounded-xl">
          <span className="text-sm text-foreground font-medium">{selected.size} selected</span>
          <div className="flex items-center gap-2 ml-2">
            <button
              onClick={() => runBulkAction('verify')}
              disabled={bulkLoading}
              className="px-3 py-1 rounded text-xs font-medium bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors disabled:opacity-50"
            >
              Verify All
            </button>
            <button
              onClick={() => runBulkAction('suspend')}
              disabled={bulkLoading}
              className="px-3 py-1 rounded text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
            >
              Suspend All
            </button>
            <button
              onClick={() => runBulkAction('unsuspend')}
              disabled={bulkLoading}
              className="px-3 py-1 rounded text-xs font-medium bg-border text-muted-foreground hover:bg-card hover:text-foreground transition-colors disabled:opacity-50"
            >
              Unsuspend All
            </button>
            {(healthTab === 'IDLE' || healthTab === 'HIATUS') && (
              <button
                onClick={() => runBulkAction('archive')}
                disabled={bulkLoading}
                className="px-3 py-1 rounded text-xs font-medium bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors disabled:opacity-50"
              >
                Archive Selected
              </button>
            )}
          </div>
          <button
            onClick={() => setSelected(new Set())}
            className="ml-auto text-muted-foreground hover:text-foreground text-xs transition-colors"
          >
            Clear
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="w-3.5 h-3.5 rounded border-border bg-border accent-primary cursor-pointer"
                    aria-label="Select all"
                  />
                </th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Name</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Email</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Status</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Products</th>
                <th className="text-right px-4 py-3 text-muted-foreground font-medium">Orders</th>
                <th className="text-right px-4 py-3 text-muted-foreground font-medium">Revenue</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Joined</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {creators.map((creator) => {
                const parsedBadges: string[] = (() => {
                  try {
                    return JSON.parse(creator.badges as unknown as string)
                  } catch {
                    return Array.isArray(creator.badges) ? creator.badges : []
                  }
                })()

                return (
                  <tr
                    key={creator.id}
                    className={`border-b border-border last:border-0 hover:bg-surface ${
                      selected.has(creator.id) ? 'bg-surface' : ''
                    }`}
                  >
                    <td className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={selected.has(creator.id)}
                        onChange={() => toggleOne(creator.id)}
                        className="w-3.5 h-3.5 rounded border-border bg-border accent-primary cursor-pointer"
                        aria-label={`Select ${creator.displayName}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-primary/30 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-primary">
                            {getInitials(creator.displayName)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-foreground font-medium truncate">{creator.displayName}</p>
                          <p className="text-muted-foreground text-xs">@{creator.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{creator.user.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {creator.isSuspended && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-400 w-fit">
                            Suspended
                          </span>
                        )}
                        {(() => {
                          const badge = HEALTH_BADGE[creator.storeStatus] ?? HEALTH_BADGE.ACTIVE
                          return (
                            <span className={`px-2 py-0.5 rounded text-xs font-medium w-fit ${badge.className}`}>
                              {badge.label}
                            </span>
                          )
                        })()}
                        {creator.storeStatusReason && (
                          <p className="text-muted-foreground text-[11px] max-w-[140px] truncate" title={creator.storeStatusReason}>
                            {creator.storeStatusReason}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-foreground">{creator._count.products}</td>
                    <td className="px-4 py-3 text-foreground text-right">{creator.orderCount}</td>
                    <td className="px-4 py-3 text-foreground text-right">${(creator.revenue / 100).toFixed(2)}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {new Date(creator.user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-2">
                        <CreatorActions
                          creatorId={creator.id}
                          isVerified={creator.isVerified}
                          isTopCreator={creator.isTopCreator}
                          isSuspended={creator.isSuspended}
                          username={creator.username}
                          badges={parsedBadges}
                          legalFullName={creator.user.legalFullName}
                          boostMultiplier={creator.boostMultiplier ?? 1}
                        />
                        <HealthActions
                          creatorId={creator.id}
                          displayName={creator.displayName}
                          storeStatus={creator.storeStatus}
                        />
                      </div>
                    </td>
                  </tr>
                )
              })}
              {creators.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                    No creators found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Suspense fallback={null}>
        <Pagination total={total} page={page} perPage={perPage} />
      </Suspense>
    </div>
  )
}
