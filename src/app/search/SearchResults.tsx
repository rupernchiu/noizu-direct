'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProductResult {
  id: string; title: string; price: number; images: string; category: string; type: string
  trendingScore: number; score: number
  creator: { username: string; displayName: string; avatar: string | null; isVerified: boolean; storeStatus: string }
}
interface CreatorResult {
  username: string; displayName: string; avatar: string | null
  isVerified: boolean; isTopCreator: boolean; bio: string | null
  categoryTags: string; totalSales: number
  _count: { products: number }
}
interface PostResult {
  slug: string; title: string; excerpt: string | null; content: string | null
  coverImage: string | null; publishedAt: string | null
}
interface SearchResponse {
  products: ProductResult[]
  creators: CreatorResult[]
  posts: PostResult[]
  counts: { products: number; creators: number; posts: number }
}

type Tab = 'products' | 'creators' | 'posts'

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

function parseImages(raw: string): string[] {
  try { return JSON.parse(raw) as string[] } catch { return [] }
}

function parseTags(raw: string): string[] {
  try { return JSON.parse(raw) as string[] } catch { return [] }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function EmptyTab({ query, label }: { query: string; label: string }) {
  return (
    <p className="py-12 text-center text-muted-foreground text-sm">
      No {label} found for &ldquo;{query}&rdquo;
    </p>
  )
}

function Pagination({ page, total, perPage, onPage }: { page: number; total: number; perPage: number; onPage: (p: number) => void }) {
  const totalPages = Math.ceil(total / perPage)
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      <button onClick={() => onPage(page - 1)} disabled={page === 1}
        className="px-3 py-1.5 rounded-lg border border-border bg-card text-sm text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
        Previous
      </button>
      <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
      <button onClick={() => onPage(page + 1)} disabled={page >= totalPages}
        className="px-3 py-1.5 rounded-lg border border-border bg-card text-sm text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
        Next
      </button>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function SearchResults({ initialQuery }: { initialQuery: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [query, setQuery] = useState(initialQuery)
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery)
  const [activeTab, setActiveTab] = useState<Tab>((searchParams.get('tab') as Tab) ?? 'products')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<SearchResponse | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounce query → debouncedQuery
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(query)
      setPage(1)
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  // Sync URL when debouncedQuery changes
  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      const params = new URLSearchParams({ q: debouncedQuery, tab: activeTab })
      router.replace(`/search?${params.toString()}`, { scroll: false })
    }
  }, [debouncedQuery, activeTab, router])

  // Fetch results
  const fetchResults = useCallback(async () => {
    if (debouncedQuery.length < 2) { setData(null); return }
    setLoading(true)
    try {
      const params = new URLSearchParams({ q: debouncedQuery, type: activeTab, page: String(page) })
      const res = await fetch(`/api/search?${params.toString()}`)
      if (!res.ok) throw new Error('fetch failed')
      setData(await res.json() as SearchResponse)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [debouncedQuery, activeTab, page])

  useEffect(() => { fetchResults() }, [fetchResults])

  function switchTab(tab: Tab) {
    setActiveTab(tab)
    setPage(1)
  }

  const counts = data?.counts ?? { products: 0, creators: 0, posts: 0 }
  const total = counts.products + counts.creators + counts.posts

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'products', label: 'Products', count: counts.products },
    { id: 'creators', label: 'Creators', count: counts.creators },
    { id: 'posts',    label: 'Posts',    count: counts.posts },
  ]

  return (
    <div>
      {/* Search input */}
      <div className="relative mb-6">
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search products, creators, posts…"
          className="w-full max-w-xl px-4 py-2.5 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:border-primary outline-none transition-colors pr-10"
          autoFocus
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <LoadingSpinner className="size-4" />
          </div>
        )}
      </div>

      {/* Header */}
      {debouncedQuery.length >= 2 && (
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-foreground mb-1">
            Results for &ldquo;<span className="text-primary">{debouncedQuery}</span>&rdquo;
          </h1>
          {data && !loading && (
            <p className="text-sm text-muted-foreground">{total} result{total !== 1 ? 's' : ''}</p>
          )}
        </div>
      )}

      {debouncedQuery.length < 2 ? (
        <p className="text-muted-foreground text-sm">Enter at least 2 characters to search.</p>
      ) : (
        <>
          {/* Tab bar */}
          <div className="flex gap-1 border-b border-border mb-6">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => switchTab(t.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  activeTab === t.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {t.label} {data && !loading && `(${t.count})`}
              </button>
            ))}
          </div>

          {/* Results */}
          {loading ? (
            <div className="flex justify-center py-16"><LoadingSpinner className="size-8" /></div>
          ) : !data || total === 0 ? (
            <p className="text-muted-foreground text-sm py-12 text-center">
              No results found for &ldquo;{debouncedQuery}&rdquo;.
            </p>
          ) : (
            <>
              {/* Products tab */}
              {activeTab === 'products' && (
                <>
                  {data.products.length === 0 ? (
                    <EmptyTab query={debouncedQuery} label="products" />
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {data.products.map(p => {
                        const imgs = parseImages(p.images)
                        return (
                          <Link key={p.id} href={`/product/${p.id}`} className="group">
                            <div className="aspect-square rounded-xl overflow-hidden bg-card border border-border mb-2">
                              {imgs[0] ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={imgs[0]} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20" />
                              )}
                            </div>
                            <p className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">{p.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{formatPrice(p.price)}</p>
                            <p className="text-[10px] text-muted-foreground">by {p.creator.displayName}{p.creator.isVerified ? ' ✓' : ''}</p>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                  <Pagination page={page} total={counts.products} perPage={12} onPage={setPage} />
                </>
              )}

              {/* Creators tab */}
              {activeTab === 'creators' && (
                <>
                  {data.creators.length === 0 ? (
                    <EmptyTab query={debouncedQuery} label="creators" />
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {data.creators.map(c => {
                        const tags = parseTags(c.categoryTags)
                        return (
                          <Link key={c.username} href={`/creator/${c.username}`} className="group text-center p-3 rounded-xl border border-border hover:border-primary/40 bg-card transition-colors">
                            <div className="w-14 h-14 rounded-full overflow-hidden mx-auto mb-2 border-2 border-border group-hover:border-primary transition-colors">
                              {c.avatar ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={c.avatar} alt={c.displayName} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-primary/20 flex items-center justify-center text-lg font-bold text-primary">
                                  {c.displayName.slice(0, 1)}
                                </div>
                              )}
                            </div>
                            <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                              {c.displayName}{c.isVerified && <span className="ml-1 text-primary text-xs">✓</span>}
                            </p>
                            <p className="text-xs text-muted-foreground">@{c.username}</p>
                            {c.bio && <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{c.bio}</p>}
                            <div className="flex items-center justify-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
                              <span>{c._count.products} product{c._count.products !== 1 ? 's' : ''}</span>
                              {tags[0] && <><span>·</span><span>{tags[0]}</span></>}
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                  <Pagination page={page} total={counts.creators} perPage={10} onPage={setPage} />
                </>
              )}

              {/* Posts tab */}
              {activeTab === 'posts' && (
                <>
                  {data.posts.length === 0 ? (
                    <EmptyTab query={debouncedQuery} label="posts" />
                  ) : (
                    <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {data.posts.map(post => {
                        const excerpt = post.excerpt ?? post.content ?? ''
                        return (
                          <Link key={post.slug} href={`/blog/${post.slug}`} className="group flex gap-3 p-3 rounded-xl border border-border hover:border-primary/50 transition-colors bg-card">
                            {post.coverImage && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={post.coverImage} alt={`${post.title} cover`} className="w-20 h-16 rounded-lg object-cover shrink-0" />
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">{post.title}</p>
                              {excerpt && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{excerpt.slice(0, 150)}</p>}
                              {post.publishedAt && (
                                <p className="text-[10px] text-muted-foreground mt-1">
                                  {new Date(post.publishedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </p>
                              )}
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                  <Pagination page={page} total={counts.posts} perPage={10} onPage={setPage} />
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
