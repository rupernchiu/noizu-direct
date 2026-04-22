'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface SearchProduct { id: string; title: string; price: number; images: string; category: string; creator: { username: string; displayName: string } }
interface SearchCreator { username: string; displayName: string; avatar: string | null; isVerified: boolean; isTopCreator: boolean }
interface SearchPost { slug: string; title: string; excerpt: string | null; coverImage: string | null }
interface SearchResults { products: SearchProduct[]; creators: SearchCreator[]; posts: SearchPost[] }

export function GlobalSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const fetch_ = useCallback(async (q: string) => {
    if (q.length < 2) { setResults(null); setOpen(false); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      const data = await res.json() as SearchResults
      setResults(data)
      setOpen(true)
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => void fetch_(query), 300)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [query, fetch_])

  // Close on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function clear() { setQuery(''); setResults(null); setOpen(false) }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (query.trim()) { router.push(`/search?q=${encodeURIComponent(query.trim())}`); setOpen(false) }
  }

  const hasResults = results && (results.products.length + results.creators.length + results.posts.length) > 0

  return (
    <div ref={containerRef} className="relative flex-1 max-w-lg">
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => { if (hasResults) setOpen(true) }}
            placeholder="Search products, creators…"
            className="w-full h-9 pl-9 pr-8 rounded-lg bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
          />
          {query && (
            <button type="button" onClick={clear} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </form>

      {open && (
        <div className="absolute top-full mt-1.5 left-0 right-0 z-50 rounded-xl border border-border bg-card shadow-xl overflow-hidden">
          {loading && <div className="px-4 py-3 text-xs text-muted-foreground">Searching…</div>}

          {!loading && !hasResults && query.length >= 2 && (
            <div className="px-4 py-3 text-xs text-muted-foreground">No results for "{query}"</div>
          )}

          {!loading && hasResults && (
            <div className="divide-y divide-border max-h-[70vh] overflow-y-auto">
              {results.products.length > 0 && (
                <div className="p-2">
                  <p className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Products</p>
                  {results.products.map(p => {
                    const imgs = (() => { try { return JSON.parse(p.images) as string[] } catch { return [] } })()
                    return (
                      <Link
                        key={p.id}
                        href={`/creator/${p.creator.username}/product/${p.id}`}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface transition-colors group"
                      >
                        {imgs[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={imgs[0]} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded bg-surface shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{p.title}</p>
                          <p className="text-xs text-muted-foreground">{p.creator.displayName} · ${(p.price / 100).toFixed(2)}</p>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}

              {results.creators.length > 0 && (
                <div className="p-2">
                  <p className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Creators</p>
                  {results.creators.map(c => (
                    <Link
                      key={c.username}
                      href={`/creator/${c.username}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface transition-colors group"
                    >
                      {c.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.avatar} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-primary/20 shrink-0 flex items-center justify-center text-xs font-bold text-primary">
                          {c.displayName.slice(0, 1)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                          {c.displayName}
                          {c.isVerified && <span className="ml-1 text-[10px] text-primary">✓</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">@{c.username}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {results.posts.length > 0 && (
                <div className="p-2">
                  <p className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Articles</p>
                  {results.posts.map(post => (
                    <Link
                      key={post.slug}
                      href={`/blog/${post.slug}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{post.title}</p>
                        {post.excerpt && <p className="text-xs text-muted-foreground truncate">{post.excerpt}</p>}
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              <div className="p-2">
                <button
                  onClick={() => { router.push(`/search?q=${encodeURIComponent(query)}`); setOpen(false) }}
                  className="w-full text-center text-xs text-primary hover:underline py-1"
                >
                  See all results for "{query}" →
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
