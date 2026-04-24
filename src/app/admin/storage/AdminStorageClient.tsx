'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { HardDrive, Play, Users, AlertTriangle, Tag, ChevronLeft, ChevronRight } from 'lucide-react'

const PER_PAGE = 20

function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

type StatusKey = 'healthy' | 'warning' | 'high' | 'full'

const STATUS_CONFIG: Record<StatusKey, { label: string; color: string; icon: string }> = {
  healthy: { label: 'Healthy',  color: 'text-green-500',  icon: '✅' },
  warning: { label: 'Warning',  color: 'text-yellow-500', icon: '🟡' },
  high:    { label: 'High',     color: 'text-orange-500', icon: '🟠' },
  full:    { label: 'Full',     color: 'text-red-500',    icon: '🔴' },
}

type PlanKey = 'FREE' | 'CREATOR' | 'PRO'

interface CreatorRow {
  id: string; name: string; email: string
  plan: PlanKey
  usedBytes: number; quotaBytes: number; bonusBytes: number; pct: number
  status: StatusKey
}

interface Props {
  creatorRows: CreatorRow[]
  totalUsed: number
  totalAllocated: number
  overQuota: number
}

const PLAN_BADGE: Record<PlanKey, string> = {
  FREE:    'border-border text-muted-foreground',
  CREATOR: 'border-primary/40 bg-primary/10 text-primary',
  PRO:     'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-300',
}

type FilterKey = 'all' | 'over_quota' | 'high' | 'warning' | 'healthy'

export function AdminStorageClient({ creatorRows, totalUsed, totalAllocated, overQuota }: Props) {
  const router      = useRouter()
  const pathname    = usePathname()
  const searchParams = useSearchParams()

  const [filter, setFilter]           = useState<FilterKey>('all')
  const [cronResults, setCronResults] = useState<Record<string, string> | null>(null)
  const [cronRunning, setCronRunning] = useState<string | null>(null)
  const [selected, setSelected]       = useState<Set<string>>(new Set())
  const [trendingRunning, setTrendingRunning] = useState(false)
  const [trendingResult, setTrendingResult]   = useState<string | null>(null)
  const [recsRunning, setRecsRunning]         = useState(false)
  const [recsResult, setRecsResult]           = useState<string | null>(null)

  const currentPage = Math.max(1, Number(searchParams.get('page') ?? '1'))

  const setPage = useCallback((p: number) => {
    const params = new URLSearchParams(searchParams.toString())
    if (p === 1) params.delete('page')
    else params.set('page', String(p))
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [router, pathname, searchParams])

  function changeFilter(key: FilterKey) {
    setFilter(key)
    setSelected(new Set())
    setPage(1)
  }

  const utilizationPct = totalAllocated > 0 ? Math.round((totalUsed / totalAllocated) * 100) : 0

  const filteredRows = creatorRows.filter(r => {
    if (filter === 'all') return true
    if (filter === 'over_quota') return r.pct >= 100
    if (filter === 'high')       return r.pct >= 95 && r.pct < 100
    if (filter === 'warning')    return r.pct >= 80 && r.pct < 95
    if (filter === 'healthy')    return r.pct < 80
    return true
  })

  const totalFiltered = filteredRows.length
  const totalPages    = Math.max(1, Math.ceil(totalFiltered / PER_PAGE))
  const safePage      = Math.min(currentPage, totalPages)
  const from          = totalFiltered === 0 ? 0 : (safePage - 1) * PER_PAGE + 1
  const to            = Math.min(safePage * PER_PAGE, totalFiltered)
  const pageRows      = filteredRows.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE)

  async function runTrendingCron() {
    setTrendingRunning(true)
    setTrendingResult(null)
    try {
      const res = await fetch('/api/cron/trending', { method: 'POST' })
      const data = await res.json()
      setTrendingResult(`${data.updated} products updated, algorithm v${data.version}, calculated at ${new Date(data.calculatedAt).toLocaleTimeString()}`)
    } catch {
      setTrendingResult('Error')
    } finally {
      setTrendingRunning(false)
    }
  }

  async function runRecsCron() {
    setRecsRunning(true)
    setRecsResult(null)
    try {
      const res = await fetch('/api/cron/recommendations', { method: 'POST' })
      const data = await res.json()
      setRecsResult(`${data.pairs} pairs computed across ${data.productsProcessed} products`)
    } catch {
      setRecsResult('Error')
    } finally {
      setRecsRunning(false)
    }
  }

  async function runCron(job: string) {
    setCronRunning(job)
    try {
      const res  = await fetch('/api/admin/storage/cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job }),
      })
      const data = await res.json() as { results?: Record<string, string>; ranAt?: string }
      setCronResults(data.results ?? {})
    } finally {
      setCronRunning(null)
    }
  }

  function toggleSelectAll() {
    if (selected.size === pageRows.length && pageRows.length > 0) setSelected(new Set())
    else setSelected(new Set(pageRows.map(r => r.id)))
  }
  function toggleRow(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <HardDrive className="size-6" /> Storage Monitor
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Platform-wide storage usage and enforcement.</p>
        </div>
        <Link
          href="/admin/storage/pricing"
          className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-border text-foreground hover:bg-card transition-colors"
        >
          <Tag className="size-4" /> Storage Pricing
        </Link>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Storage Used',   value: fmtBytes(totalUsed),              icon: '💾' },
          { label: 'Total Allocated',       value: fmtBytes(totalAllocated),         icon: '📦' },
          { label: 'Platform Utilization',  value: `${utilizationPct}%`,            icon: '📊', warn: utilizationPct > 70 },
          { label: 'Over Quota (Full)',      value: String(overQuota),               icon: '🔴', warn: overQuota > 0 },
        ].map(({ label, value, icon, warn }) => (
          <div key={label} className={`rounded-xl border ${warn ? 'border-destructive/40 bg-destructive/5' : 'border-border bg-card'} p-4`}>
            <div className="text-xl mb-1">{icon}</div>
            <div className={`text-2xl font-bold ${warn ? 'text-destructive' : 'text-foreground'}`}>{value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
        {[
          { label: 'Total Creators',    value: String(creatorRows.length), icon: <Users className="size-4" /> },
          { label: 'High Usage (80%+)', value: String(creatorRows.filter(r => r.pct >= 80).length), icon: <AlertTriangle className="size-4 text-yellow-500" /> },
        ].map(({ label, value, icon }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4">
            <div className="text-xl mb-1 flex items-center">{icon}</div>
            <div className="text-2xl font-bold text-foreground">{value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Creator storage table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-5 pt-5 pb-3 flex items-center justify-between flex-wrap gap-3">
          <h3 className="text-base font-semibold text-foreground">Creator Storage</h3>
          <div className="text-xs text-muted-foreground">Quota per creator reflects their current plan (Free / Creator / Pro) plus any admin bonus.</div>
        </div>

        {/* Filters */}
        <div className="px-5 pb-3 flex gap-2 overflow-x-auto">
          {([
            { key: 'all',       label: 'All' },
            { key: 'over_quota',label: 'Over Quota' },
            { key: 'high',      label: 'High (95%+)' },
            { key: 'warning',   label: 'Warning (80%+)' },
            { key: 'healthy',   label: 'Healthy' },
          ] as { key: FilterKey; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => changeFilter(key)}
              className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors ${filter === key ? 'bg-primary border-primary text-white' : 'border-border text-muted-foreground hover:text-foreground'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Bulk actions */}
        {selected.size > 0 && (
          <div className="mx-5 mb-3 flex items-center gap-3 rounded-xl bg-primary/10 border border-primary/20 px-4 py-2.5">
            <span className="text-xs text-primary font-medium">{selected.size} selected</span>
            <button className="text-xs px-3 py-1.5 rounded-lg border border-border text-foreground hover:bg-card">Send Warning to Selected</button>
            <button className="text-xs px-3 py-1.5 rounded-lg bg-primary/20 text-primary hover:bg-primary/30">Grant +1GB to Selected</button>
          </div>
        )}

        <div className="overflow-x-auto border-t border-border">
          {filteredRows.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">No creators match this filter.</div>
          ) : (
            <table className="w-full text-sm [&_td]:whitespace-nowrap">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border">
                  <th className="px-3 py-1.5 text-left w-10">
                    <input type="checkbox" checked={selected.size === pageRows.length && pageRows.length > 0} onChange={toggleSelectAll} className="rounded border-border" />
                  </th>
                  <th className="px-3 py-1.5 text-left">Creator</th>
                  <th className="px-3 py-1.5 text-left">Plan</th>
                  <th className="px-3 py-1.5 text-left">Used</th>
                  <th className="px-3 py-1.5 text-left">Quota</th>
                  <th className="px-3 py-1.5 text-left">Usage</th>
                  <th className="px-3 py-1.5 text-left">Status</th>
                  <th className="px-3 py-1.5 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pageRows.map(row => {
                  const sc = STATUS_CONFIG[row.status]
                  return (
                    <tr key={row.id} className="hover:bg-border/20">
                      <td className="px-3 py-1.5">
                        <input type="checkbox" checked={selected.has(row.id)} onChange={() => toggleRow(row.id)} className="rounded border-border" />
                      </td>
                      <td className="px-3 py-1.5">
                        <div className="font-medium text-foreground">{row.name}</div>
                        <div className="text-xs text-muted-foreground">{row.email}</div>
                      </td>
                      <td className="px-3 py-1.5">
                        <span className={`text-xs px-2 py-1 rounded-full border ${PLAN_BADGE[row.plan]}`}>{row.plan}</span>
                      </td>
                      <td className="px-3 py-1.5 text-muted-foreground">{fmtBytes(row.usedBytes)}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">
                        {fmtBytes(row.quotaBytes)}
                        {row.bonusBytes > 0 && (
                          <span className="ml-1 text-[10px] text-primary">(+{fmtBytes(row.bonusBytes)})</span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 w-36">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${row.pct}%`, backgroundColor: row.pct >= 100 ? '#ef4444' : row.pct >= 95 ? '#f97316' : row.pct >= 80 ? '#eab308' : '#22c55e' }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-10 text-right">{row.pct}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-1.5">
                        <span className={`text-xs font-medium ${sc.color}`}>{sc.icon} {sc.label}</span>
                      </td>
                      <td className="px-3 py-1.5">
                        <div className="flex gap-1 flex-wrap">
                          <button className="text-xs px-2 py-1 rounded border border-border text-foreground hover:bg-card whitespace-nowrap">+1GB</button>
                          <button className="text-xs px-2 py-1 rounded border border-border text-foreground hover:bg-card">Adjust</button>
                          <button className="text-xs px-2 py-1 rounded border border-border text-foreground hover:bg-card">Warn</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-border flex items-center justify-between gap-4 flex-wrap">
            <p className="text-xs text-muted-foreground">
              Showing {from}–{to} of {totalFiltered} creator{totalFiltered !== 1 ? 's' : ''}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(safePage - 1)}
                disabled={safePage === 1}
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-card disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="size-3.5" /> Prev
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                .reduce<(number | '…')[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('…')
                  acc.push(p)
                  return acc
                }, [])
                .map((p, idx) =>
                  p === '…'
                    ? <span key={`ellipsis-${idx}`} className="text-xs px-1.5 text-muted-foreground">…</span>
                    : <button
                        key={p}
                        onClick={() => setPage(p as number)}
                        className={`text-xs min-w-[28px] h-7 rounded-lg border transition-colors ${safePage === p ? 'bg-primary border-primary text-white font-medium' : 'border-border text-muted-foreground hover:text-foreground hover:bg-card'}`}
                      >
                        {p}
                      </button>
                )
              }

              <button
                onClick={() => setPage(safePage + 1)}
                disabled={safePage === totalPages}
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-card disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next <ChevronRight className="size-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Cron controls */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2"><Play className="size-4" /> Cron Controls</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { job: 'storage_enforcement', label: 'Storage Enforcement' },
            { job: 'fee_enforcement',     label: 'Fee Enforcement' },
            { job: 'mark_orphans',        label: 'Mark Orphaned Files' },
            { job: 'all',                 label: 'Run All' },
          ].map(({ job, label }) => (
            <button
              key={job}
              onClick={() => runCron(job)}
              disabled={cronRunning !== null}
              className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl border border-border text-foreground hover:bg-card disabled:opacity-50 transition-colors"
            >
              <Play className={`size-4 ${cronRunning === job ? 'animate-pulse text-primary' : 'text-muted-foreground'}`} />
              {cronRunning === job ? 'Running…' : `▶ ${label}`}
            </button>
          ))}
        </div>
        {cronResults && (
          <div className="rounded-xl bg-border/30 p-4 space-y-1">
            {Object.entries(cronResults).map(([key, msg]) => (
              <p key={key} className="text-xs text-muted-foreground">✅ {msg}</p>
            ))}
          </div>
        )}
      </div>

      {/* Trending Recalculation */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2"><Play className="size-4" /> Trending Recalculation</h3>
        <button
          onClick={runTrendingCron}
          disabled={trendingRunning}
          className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl border border-border text-foreground hover:bg-card disabled:opacity-50 transition-colors"
        >
          <Play className={`size-4 ${trendingRunning ? 'animate-pulse text-primary' : 'text-muted-foreground'}`} />
          {trendingRunning ? 'Running…' : '▶ Recalculate Trending'}
        </button>
        {trendingResult && (
          <div className="rounded-xl bg-border/30 p-4">
            <p className="text-xs text-muted-foreground">✅ {trendingResult}</p>
          </div>
        )}
      </div>

      {/* Recommendations Recomputation */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2"><Play className="size-4" /> Recommendations Recomputation</h3>
        <p className="text-xs text-muted-foreground">Recomputes co-purchase pairs using Jaccard similarity across all completed orders.</p>
        <button
          onClick={runRecsCron}
          disabled={recsRunning}
          className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl border border-border text-foreground hover:bg-card disabled:opacity-50 transition-colors"
        >
          <Play className={`size-4 ${recsRunning ? 'animate-pulse text-primary' : 'text-muted-foreground'}`} />
          {recsRunning ? 'Running…' : '▶ Recompute Recommendations'}
        </button>
        {recsResult && (
          <div className="rounded-xl bg-border/30 p-4">
            <p className="text-xs text-muted-foreground">✅ {recsResult}</p>
          </div>
        )}
      </div>
    </div>
  )
}
