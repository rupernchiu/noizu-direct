'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

interface PaginationProps {
  total: number
  page: number
  perPage: number
  paramName?: string
}

export function Pagination({ total, page, perPage, paramName = 'page' }: PaginationProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const totalPages = Math.ceil(total / perPage)

  if (totalPages <= 1 && total <= perPage) return null

  function goTo(p: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set(paramName, String(p))
    router.replace(`${pathname}?${params.toString()}`)
  }

  const pageNums = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce<(number | '...')[]>((acc, p, idx, arr) => {
      if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...')
      acc.push(p)
      return acc
    }, [])

  const start = (page - 1) * perPage + 1
  const end = Math.min(page * perPage, total)

  return (
    <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">
        Showing {start}–{end} of {total} {total === 1 ? 'result' : 'results'}
      </p>
      {totalPages > 1 && (
        <div className="flex items-center gap-1 flex-wrap justify-center">
          <button
            suppressHydrationWarning
            onClick={() => goTo(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-lg border border-border bg-card text-sm text-muted-foreground hover:bg-border hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          {pageNums.map((item, idx) =>
            item === '...' ? (
              <span key={`e-${idx}`} className="px-2 text-muted-foreground">
                …
              </span>
            ) : (
              <button
                suppressHydrationWarning
                key={item}
                onClick={() => goTo(item as number)}
                className={cn(
                  'size-9 rounded-lg text-sm font-medium transition-colors',
                  page === item
                    ? 'bg-primary text-white'
                    : 'border border-border bg-card text-muted-foreground hover:bg-border hover:text-foreground'
                )}
              >
                {item}
              </button>
            )
          )}
          <button
            suppressHydrationWarning
            onClick={() => goTo(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 rounded-lg border border-border bg-card text-sm text-muted-foreground hover:bg-border hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
