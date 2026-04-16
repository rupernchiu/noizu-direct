'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'

const CATEGORY_OPTIONS = [
  { value: 'DIGITAL_ART', label: 'Digital Art' },
  { value: 'DOUJIN', label: 'Doujin' },
  { value: 'COSPLAY_PRINT', label: 'Cosplay Prints' },
  { value: 'PHYSICAL_MERCH', label: 'Merch' },
  { value: 'STICKERS', label: 'Stickers' },
]
const TYPE_OPTIONS    = [{ value: 'DIGITAL', label: 'Digital' }, { value: 'PHYSICAL', label: 'Physical' }]
const STATUS_OPTIONS  = [{ value: 'ACTIVE', label: 'Active' }, { value: 'INACTIVE', label: 'Inactive' }]

export interface ProductCreatorOption { id: string; displayName: string }

interface Props {
  creators: ProductCreatorOption[]
  total: number
  filtered: number
}

const selectCls = 'h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer'

export function ProductFilters({ creators, total, filtered }: Props) {
  const router      = useRouter()
  const pathname    = usePathname()
  const searchParams = useSearchParams()

  const q        = searchParams.get('q') ?? ''
  const category = searchParams.get('category') ?? ''
  const type     = searchParams.get('type') ?? ''
  const status   = searchParams.get('status') ?? ''
  const creator  = searchParams.get('creator') ?? ''

  const activeFilters = [category, type, status, creator].filter(Boolean).length

  function setParam(name: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (!value) params.delete(name)
    else params.set(name, value)
    params.delete('page')
    router.replace(`${pathname}?${params.toString()}`)
  }

  function clearAll() {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    router.replace(`${pathname}?${params.toString()}`)
  }

  const creatorLabel = creator
    ? (creators.find(c => c.id === creator)?.displayName ?? creator)
    : null
  const categoryLabel = category ? (CATEGORY_OPTIONS.find(o => o.value === category)?.label ?? category) : null
  const typeLabel     = type     ? (TYPE_OPTIONS.find(o => o.value === type)?.label ?? type) : null
  const statusLabel   = status   ? (STATUS_OPTIONS.find(o => o.value === status)?.label ?? status) : null

  return (
    <div className="space-y-2">
      {/* Filter row */}
      <div className="flex flex-wrap gap-2 items-center">
        <select className={selectCls} value={creator} onChange={e => setParam('creator', e.target.value)}>
          <option value="">All Creators</option>
          {creators.map(c => (
            <option key={c.id} value={c.id}>{c.displayName}</option>
          ))}
        </select>

        <select className={selectCls} value={category} onChange={e => setParam('category', e.target.value)}>
          <option value="">All Categories</option>
          {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <select className={selectCls} value={type} onChange={e => setParam('type', e.target.value)}>
          <option value="">All Types</option>
          {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <select className={selectCls} value={status} onChange={e => setParam('status', e.target.value)}>
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <div className="ml-auto flex items-center gap-3">
          {activeFilters > 0 && (
            <button onClick={clearAll} className="text-xs text-muted-foreground hover:text-foreground underline cursor-pointer">
              Clear filters
              <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary/20 text-primary text-[10px] font-bold">
                {activeFilters}
              </span>
            </button>
          )}
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            Showing {filtered} of {total}
          </span>
        </div>
      </div>

      {/* Active filter pills */}
      {activeFilters > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {creatorLabel && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary">
              Creator: {creatorLabel}
              <button onClick={() => setParam('creator', '')} className="hover:opacity-60 cursor-pointer leading-none">×</button>
            </span>
          )}
          {categoryLabel && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary">
              Category: {categoryLabel}
              <button onClick={() => setParam('category', '')} className="hover:opacity-60 cursor-pointer leading-none">×</button>
            </span>
          )}
          {typeLabel && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary">
              Type: {typeLabel}
              <button onClick={() => setParam('type', '')} className="hover:opacity-60 cursor-pointer leading-none">×</button>
            </span>
          )}
          {statusLabel && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary">
              Status: {statusLabel}
              <button onClick={() => setParam('status', '')} className="hover:opacity-60 cursor-pointer leading-none">×</button>
            </span>
          )}
        </div>
      )}
    </div>
  )
}
