'use client'

import { useState, useEffect, useCallback } from 'react'
import { SearchIcon, PackageOpenIcon } from 'lucide-react'
import { ProductCard } from '@/components/ui/ProductCard'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

// ---- types ----

interface ProductSummary {
  id: string
  title: string
  description: string
  price: number
  category: string
  type: string
  images: string
  creator: {
    username: string
    displayName: string
    avatar: string | null
    isVerified: boolean
    isTopCreator: boolean
  }
}

interface ApiResponse {
  products: ProductSummary[]
  total: number
  page: number
  totalPages: number
}

// ---- constants ----

const CATEGORIES = [
  { value: 'ALL', label: 'All' },
  { value: 'DIGITAL_ART', label: 'Digital Art' },
  { value: 'DOUJIN', label: 'Doujin' },
  { value: 'COSPLAY_PRINT', label: 'Cosplay Prints' },
  { value: 'PHYSICAL_MERCH', label: 'Merch' },
  { value: 'STICKERS', label: 'Stickers' },
] as const
const SORT_OPTIONS = [
  { value: 'NEWEST', label: 'Newest' },
  { value: 'PRICE_ASC', label: 'Price: Low to High' },
  { value: 'PRICE_DESC', label: 'Price: High to Low' },
  { value: 'POPULAR', label: 'Most Popular' },
] as const

type TypeFilter = 'ALL' | 'PHYSICAL' | 'DIGITAL'
type SortOption = (typeof SORT_OPTIONS)[number]['value']

// ---- skeleton card ----

function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-[#2a2a3a] bg-[#1e1e2a]">
      <Skeleton className="aspect-square w-full bg-[#2a2a3a]" />
      <div className="flex flex-col gap-2 p-3">
        <Skeleton className="h-4 w-3/4 bg-[#2a2a3a]" />
        <Skeleton className="h-3 w-1/2 bg-[#2a2a3a]" />
        <Skeleton className="h-5 w-1/3 bg-[#2a2a3a]" />
      </div>
    </div>
  )
}

// ---- main page ----

export default function MarketplacePage() {
  const [category, setCategory] = useState<string>('ALL')
  const [sort, setSort] = useState<SortOption>('NEWEST')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)

  const [products, setProducts] = useState<ProductSummary[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(timer)
  }, [search])

  // Reset to page 1 on filter change
  useEffect(() => {
    setPage(1)
  }, [category, sort, typeFilter, debouncedSearch])

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        sort,
        category,
      })
      if (typeFilter !== 'ALL') params.set('type', typeFilter)
      if (debouncedSearch) params.set('search', debouncedSearch)

      const res = await fetch(`/api/products?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch products')
      const data: ApiResponse = await res.json()
      setProducts(data.products)
      setTotal(data.total)
      setTotalPages(data.totalPages)
    } catch (err) {
      console.error(err)
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [page, sort, category, typeFilter, debouncedSearch])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  return (
    <div className="min-h-screen bg-[#0d0d12] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Heading */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-[#f0f0f5] sm:text-4xl">
            Marketplace
          </h1>
          <p className="mt-2 text-[#8888aa]">
            Discover original art, doujin, cosplay and merch from Southeast Asia&apos;s best creators.
          </p>
        </div>

        {/* Filter bar */}
        <div className="mb-8 space-y-4">
          {/* Category pills */}
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                className={cn(
                  'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                  category === cat.value
                    ? 'bg-[#7c3aed] text-white'
                    : 'bg-[#1e1e2a] text-[#8888aa] hover:bg-[#2a2a3a] hover:text-[#f0f0f5]'
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Sort + Type + Search row */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Sort */}
            <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
              <SelectTrigger className="w-48 border-[#2a2a3a] bg-[#1e1e2a] text-[#f0f0f5]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Type toggle */}
            <div className="flex rounded-lg border border-[#2a2a3a] bg-[#1e1e2a] p-0.5">
              {(['ALL', 'PHYSICAL', 'DIGITAL'] as TypeFilter[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={cn(
                    'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                    typeFilter === t
                      ? 'bg-[#7c3aed] text-white'
                      : 'text-[#8888aa] hover:text-[#f0f0f5]'
                  )}
                >
                  {t === 'ALL' ? 'All' : t.charAt(0) + t.slice(1).toLowerCase()}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative flex-1 min-w-48">
              <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8888aa]" />
              <Input
                type="search"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border-[#2a2a3a] bg-[#1e1e2a] pl-9 text-[#f0f0f5] placeholder:text-[#8888aa] focus-visible:border-[#7c3aed]"
              />
            </div>

            {/* Result count */}
            {!loading && (
              <span className="text-sm text-[#8888aa] whitespace-nowrap">
                {total} {total === 1 ? 'result' : 'results'}
              </span>
            )}
            {loading && <LoadingSpinner className="size-4" />}
          </div>
        </div>

        {/* Product grid */}
        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            icon={<PackageOpenIcon className="size-8" />}
            title="No products found"
            description={
              debouncedSearch
                ? `No results for "${debouncedSearch}". Try a different search term.`
                : 'No products match your current filters. Try adjusting them.'
            }
            action={
              <button
                onClick={() => {
                  setCategory('ALL')
                  setTypeFilter('ALL')
                  setSearch('')
                  setSort('NEWEST')
                }}
                className="rounded-lg bg-[#7c3aed] px-4 py-2 text-sm font-semibold text-white hover:bg-[#6d28d9] transition-colors"
              >
                Clear filters
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="mt-10 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border border-[#2a2a3a] bg-[#1e1e2a] px-4 py-2 text-sm font-medium text-[#8888aa] transition-colors hover:bg-[#2a2a3a] hover:text-[#f0f0f5] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>

            {/* Page numbers */}
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...')
                  acc.push(p)
                  return acc
                }, [])
                .map((item, idx) =>
                  item === '...' ? (
                    <span key={`ellipsis-${idx}`} className="px-2 text-[#8888aa]">
                      …
                    </span>
                  ) : (
                    <button
                      key={item}
                      onClick={() => setPage(item as number)}
                      className={cn(
                        'size-9 rounded-lg text-sm font-medium transition-colors',
                        page === item
                          ? 'bg-[#7c3aed] text-white'
                          : 'border border-[#2a2a3a] bg-[#1e1e2a] text-[#8888aa] hover:bg-[#2a2a3a] hover:text-[#f0f0f5]'
                      )}
                    >
                      {item}
                    </button>
                  )
                )}
            </div>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-lg border border-[#2a2a3a] bg-[#1e1e2a] px-4 py-2 text-sm font-medium text-[#8888aa] transition-colors hover:bg-[#2a2a3a] hover:text-[#f0f0f5] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
