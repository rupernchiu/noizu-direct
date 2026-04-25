'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'

export interface DiscountCreatorOption { id: string; displayName: string }

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'MAXED', label: 'Maxed out' },
]

const selectCls =
  'h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer'

export function DiscountFilters({ creators, total, filtered }: {
  creators: DiscountCreatorOption[]
  total: number
  filtered: number
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const creatorId = searchParams.get('creatorId') ?? ''
  const status = searchParams.get('status') ?? ''

  function setParam(name: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (!value) params.delete(name)
    else params.set(name, value)
    router.replace(`${pathname}?${params.toString()}`)
  }

  function clearAll() {
    const params = new URLSearchParams()
    const q = searchParams.get('q')
    if (q) params.set('q', q)
    router.replace(`${pathname}?${params.toString()}`)
  }

  const activeFilters = [creatorId, status].filter(Boolean).length

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <select className={selectCls} value={creatorId} onChange={e => setParam('creatorId', e.target.value)}>
        <option value="">All creators</option>
        {creators.map(c => (
          <option key={c.id} value={c.id}>{c.displayName}</option>
        ))}
      </select>
      <select className={selectCls} value={status} onChange={e => setParam('status', e.target.value)}>
        <option value="">All statuses</option>
        {STATUS_OPTIONS.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      <div className="ml-auto flex items-center gap-3">
        {activeFilters > 0 && (
          <button onClick={clearAll} className="text-xs text-muted-foreground hover:text-foreground underline">
            Clear filters
          </button>
        )}
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          Showing {filtered} of {total}
        </span>
      </div>
    </div>
  )
}
