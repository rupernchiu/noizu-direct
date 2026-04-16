'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'

const STATUS_TABS = [
  { value: '',           label: 'All'       },
  { value: 'PENDING',    label: 'Pending'   },
  { value: 'PAID',       label: 'Paid'      },
  { value: 'PROCESSING', label: 'Processing'},
  { value: 'SHIPPED',    label: 'Shipped'   },
  { value: 'COMPLETED',  label: 'Completed' },
  { value: 'CANCELLED',  label: 'Cancelled' },
  { value: 'DISPUTED',   label: 'Disputed'  },
]

const TYPE_OPTIONS = [
  { value: '',         label: 'All Types' },
  { value: 'DIGITAL',  label: 'Digital'  },
  { value: 'PHYSICAL', label: 'Physical' },
  { value: 'POD',      label: 'POD'      },
]

const DATE_OPTIONS = [
  { value: '',       label: 'All Time'       },
  { value: 'week',   label: 'This Week'      },
  { value: 'month',  label: 'This Month'     },
  { value: '3month', label: 'Last 3 Months'  },
]

const ESCROW_OPTIONS = [
  { value: '',                  label: 'All Escrow'        },
  { value: 'HELD',              label: 'Held'              },
  { value: 'TRACKING_ADDED',    label: 'Tracking Added'    },
  { value: 'RELEASED',          label: 'Released'          },
  { value: 'DISPUTED',          label: 'Disputed'          },
]

const SORT_OPTIONS = [
  { value: 'newest',   label: 'Newest First'          },
  { value: 'oldest',   label: 'Oldest First'           },
  { value: 'high',     label: 'Amount: High → Low'    },
  { value: 'low',      label: 'Amount: Low → High'    },
  { value: 'deadline', label: 'Fulfillment Deadline'  },
]

interface Props {
  counts: Record<string, number>
  total: number
  page: number
  perPage: number
}

function SelectFilter({
  paramName,
  options,
  value,
  onChange,
}: {
  paramName: string
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-border bg-card text-foreground text-sm px-3 py-2 focus:outline-none focus:border-primary/50 transition-colors"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

export function OrdersFilters({ counts, total, page, perPage }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentStatus = searchParams.get('status') ?? ''
  const currentType   = searchParams.get('type')   ?? ''
  const currentDate   = searchParams.get('date')   ?? ''
  const currentEscrow = searchParams.get('escrow') ?? ''
  const currentSort   = searchParams.get('sort')   ?? 'newest'
  const currentQ      = searchParams.get('q')      ?? ''

  const [searchValue, setSearchValue] = useState(currentQ)
  const mountedRef = useRef(false)

  // sync search input → URL with 300ms debounce
  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return }
    const t = setTimeout(() => push({ q: searchValue || null, page: null }), 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue])

  function push(overrides: Record<string, string | null>) {
    const p = new URLSearchParams(searchParams.toString())
    for (const [k, v] of Object.entries(overrides)) {
      if (v === null || v === '') p.delete(k)
      else p.set(k, v)
    }
    // reset page whenever any filter changes (except page itself)
    if (!('page' in overrides)) p.delete('page')
    router.replace(`${pathname}?${p.toString()}`)
  }

  const showing = Math.min(perPage, total - (page - 1) * perPage)
  const from = total === 0 ? 0 : (page - 1) * perPage + 1
  const to   = (page - 1) * perPage + showing

  return (
    <div className="space-y-3">
      {/* Status tabs */}
      <div className="flex flex-wrap gap-1 border-b border-border pb-3">
        {STATUS_TABS.map((tab) => {
          const active = currentStatus === tab.value
          const count  = tab.value === '' ? counts['ALL'] : counts[tab.value]
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => push({ status: tab.value || null })}
              className={`
                relative flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors
                ${active
                  ? 'bg-primary/10 text-primary border border-primary/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card border border-transparent'
                }
              `}
            >
              {tab.label}
              {count != null && count > 0 && (
                <span
                  className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-semibold rounded-full ${
                    active ? 'bg-primary/20 text-primary' : 'bg-muted-foreground/20 text-muted-foreground'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Search + secondary filters row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search bar */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search by order ID or product…"
            className="w-full pl-9 pr-8 py-2 rounded-lg border border-border bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
          />
          {searchValue && (
            <button
              type="button"
              onClick={() => { setSearchValue(''); push({ q: null }) }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Type */}
        <SelectFilter
          paramName="type"
          options={TYPE_OPTIONS}
          value={currentType}
          onChange={(v) => push({ type: v || null })}
        />

        {/* Date range */}
        <SelectFilter
          paramName="date"
          options={DATE_OPTIONS}
          value={currentDate}
          onChange={(v) => push({ date: v || null })}
        />

        {/* Escrow */}
        <SelectFilter
          paramName="escrow"
          options={ESCROW_OPTIONS}
          value={currentEscrow}
          onChange={(v) => push({ escrow: v || null })}
        />

        {/* Sort */}
        <SelectFilter
          paramName="sort"
          options={SORT_OPTIONS}
          value={currentSort}
          onChange={(v) => push({ sort: v === 'newest' ? null : v })}
        />
      </div>

      {/* Results count */}
      {total > 0 && (
        <p className="text-xs text-muted-foreground">
          Showing {from}–{to} of {total} order{total !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}
