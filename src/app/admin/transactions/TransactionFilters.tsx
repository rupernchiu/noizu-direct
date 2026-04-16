'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

const STATUS_OPTIONS = [
  { value: 'PENDING',   label: 'Pending' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'FAILED',    label: 'Failed' },
  { value: 'REFUNDED',  label: 'Refunded' },
]

export interface TxCreatorOption { userId: string; displayName: string }
export interface TxBuyerOption   { id: string; name: string; email: string }

interface Props {
  creators: TxCreatorOption[]
  buyers:   TxBuyerOption[]
  total:    number
  filtered: number
}

const selectCls = 'h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer'
const inputCls  = 'h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring w-36'

export function TransactionFilters({ creators, buyers, total, filtered }: Props) {
  const router       = useRouter()
  const pathname     = usePathname()
  const searchParams = useSearchParams()

  const creatorParam  = searchParams.get('creator')  ?? ''
  const buyerParam    = searchParams.get('buyer')    ?? ''
  const statusParam   = searchParams.get('status')   ?? ''
  const dateFromParam = searchParams.get('dateFrom') ?? ''
  const dateToParam   = searchParams.get('dateTo')   ?? ''
  const amtMinParam   = searchParams.get('amtMin')   ?? ''
  const amtMaxParam   = searchParams.get('amtMax')   ?? ''

  // Local state for text-like inputs — committed to URL on blur
  const [dateFrom, setDateFrom] = useState(dateFromParam)
  const [dateTo,   setDateTo]   = useState(dateToParam)
  const [amtMin,   setAmtMin]   = useState(amtMinParam)
  const [amtMax,   setAmtMax]   = useState(amtMaxParam)

  // Sync local state when URL params change (e.g. clear all)
  useEffect(() => { setDateFrom(dateFromParam) }, [dateFromParam])
  useEffect(() => { setDateTo(dateToParam)     }, [dateToParam])
  useEffect(() => { setAmtMin(amtMinParam)     }, [amtMinParam])
  useEffect(() => { setAmtMax(amtMaxParam)     }, [amtMaxParam])

  function setParam(name: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (!value) params.delete(name)
    else params.set(name, value)
    params.delete('page')
    router.replace(`${pathname}?${params.toString()}`)
  }

  function commitTextFilters() {
    const params = new URLSearchParams(searchParams.toString())
    ;[['dateFrom', dateFrom], ['dateTo', dateTo], ['amtMin', amtMin], ['amtMax', amtMax]].forEach(
      ([k, v]) => { if (v) params.set(k, v); else params.delete(k) }
    )
    params.delete('page')
    router.replace(`${pathname}?${params.toString()}`)
  }

  function clearParams(...names: string[]) {
    const params = new URLSearchParams(searchParams.toString())
    names.forEach(n => params.delete(n))
    params.delete('page')
    router.replace(`${pathname}?${params.toString()}`)
  }

  function clearAll() {
    const q = searchParams.get('q')
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    router.replace(`${pathname}?${params.toString()}`)
  }

  // Compute active filter count + labels for pills
  const activeFilters = [creatorParam, buyerParam, statusParam, dateFromParam, dateToParam, amtMinParam, amtMaxParam].filter(Boolean).length

  const creatorLabel = creatorParam ? (creators.find(c => c.userId === creatorParam)?.displayName ?? creatorParam) : null
  const buyerLabel   = buyerParam   ? (buyers.find(b => b.id === buyerParam)?.name ?? buyerParam) : null
  const statusLabel  = statusParam  ? (STATUS_OPTIONS.find(s => s.value === statusParam)?.label ?? statusParam) : null
  const dateLabel    = dateFromParam || dateToParam
    ? [dateFromParam && `from ${dateFromParam}`, dateToParam && `to ${dateToParam}`].filter(Boolean).join(' ')
    : null
  const amtLabel     = amtMinParam || amtMaxParam
    ? [amtMinParam && `≥$${amtMinParam}`, amtMaxParam && `≤$${amtMaxParam}`].filter(Boolean).join(' ')
    : null

  return (
    <div className="space-y-2">
      {/* Filter row 1: dropdowns */}
      <div className="flex flex-wrap gap-2 items-center">
        <select className={selectCls} value={creatorParam} onChange={e => setParam('creator', e.target.value)}>
          <option value="">All Creators</option>
          {creators.map(c => (
            <option key={c.userId} value={c.userId}>{c.displayName}</option>
          ))}
        </select>

        <select className={selectCls} value={buyerParam} onChange={e => setParam('buyer', e.target.value)}>
          <option value="">All Buyers</option>
          {buyers.map(b => (
            <option key={b.id} value={b.id}>{b.name} ({b.email})</option>
          ))}
        </select>

        <select className={selectCls} value={statusParam} onChange={e => setParam('status', e.target.value)}>
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Filter row 2: date range + amount range */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground shrink-0">Date:</span>
          <input
            type="date"
            className={inputCls}
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            onBlur={commitTextFilters}
            placeholder="From"
          />
          <span className="text-xs text-muted-foreground">–</span>
          <input
            type="date"
            className={inputCls}
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            onBlur={commitTextFilters}
            placeholder="To"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground shrink-0">Amount:</span>
          <input
            type="number"
            className={`${inputCls} w-24`}
            value={amtMin}
            onChange={e => setAmtMin(e.target.value)}
            onBlur={commitTextFilters}
            placeholder="Min $"
            min="0"
            step="0.01"
          />
          <span className="text-xs text-muted-foreground">–</span>
          <input
            type="number"
            className={`${inputCls} w-24`}
            value={amtMax}
            onChange={e => setAmtMax(e.target.value)}
            onBlur={commitTextFilters}
            placeholder="Max $"
            min="0"
            step="0.01"
          />
        </div>

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
          {buyerLabel && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary">
              Buyer: {buyerLabel}
              <button onClick={() => setParam('buyer', '')} className="hover:opacity-60 cursor-pointer leading-none">×</button>
            </span>
          )}
          {statusLabel && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary">
              Status: {statusLabel}
              <button onClick={() => setParam('status', '')} className="hover:opacity-60 cursor-pointer leading-none">×</button>
            </span>
          )}
          {dateLabel && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary">
              Date: {dateLabel}
              <button onClick={() => clearParams('dateFrom', 'dateTo')} className="hover:opacity-60 cursor-pointer leading-none">×</button>
            </span>
          )}
          {amtLabel && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary">
              Amount: {amtLabel}
              <button onClick={() => clearParams('amtMin', 'amtMax')} className="hover:opacity-60 cursor-pointer leading-none">×</button>
            </span>
          )}
        </div>
      )}
    </div>
  )
}
