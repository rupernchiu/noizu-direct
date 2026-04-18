'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search } from 'lucide-react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'

interface SearchProduct { id: string; title: string; price: number; images: string; category: string; creator: { username: string; displayName: string } }
interface SearchCreator { username: string; displayName: string; avatar: string | null; isVerified: boolean; isTopCreator: boolean }
interface SearchPost { slug: string; title: string; excerpt: string | null; coverImage: string | null }
interface SearchResults { products: SearchProduct[]; creators: SearchCreator[]; posts: SearchPost[] }

const P = '#7c3aed'

export function SearchBar() {
  const pathname = usePathname()

  // Hide on admin, dashboard, account pages
  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/account')
  ) {
    return null
  }

  return <SearchBarInner />
}

function SearchBarInner() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [btnHovered, setBtnHovered] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const doFetch = useCallback(async (q: string) => {
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
    timerRef.current = setTimeout(() => void doFetch(query), 300)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [query, doFetch])

  useEffect(() => {
    function onOut(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onEsc(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onOut)
    window.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onOut)
      window.removeEventListener('keydown', onEsc)
    }
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (query.trim()) { router.push(`/search?q=${encodeURIComponent(query.trim())}`); setOpen(false) }
  }

  const hasResults = results && (results.products.length + results.creators.length + results.posts.length) > 0

  return (
    <div
      style={{
        width: '100%',
        height: '52px',
        flexShrink: 0,
        background: 'var(--surface)',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 24px',
      }}
    >
      <div ref={containerRef} style={{ position: 'relative', width: '100%', maxWidth: '600px' }}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            {/* Input */}
            <div style={{ position: 'relative', flex: 1 }}>
              <Search
                size={16}
                style={{
                  position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--muted-foreground)', pointerEvents: 'none', flexShrink: 0,
                }}
              />
              <input
                suppressHydrationWarning
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onFocus={() => { if (hasResults) setOpen(true) }}
                placeholder="Search products, creators, doujin..."
                style={{
                  width: '100%',
                  height: '40px',
                  paddingLeft: '36px',
                  paddingRight: '12px',
                  fontSize: '16px',
                  color: 'var(--foreground)',
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRight: 'none',
                  borderRadius: '8px 0 0 8px',
                  outline: 'none',
                }}
              />
            </div>

            {/* Search button */}
            <button
              suppressHydrationWarning
              type="submit"
              style={{
                height: '40px',
                padding: '0 18px',
                background: btnHovered ? '#6d28d9' : P,
                color: '#fff',
                fontSize: '14px',
                fontWeight: 600,
                border: 'none',
                borderRadius: '0 8px 8px 0',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'background 0.15s ease',
                flexShrink: 0,
              }}
              onMouseEnter={() => setBtnHovered(true)}
              onMouseLeave={() => setBtnHovered(false)}
            >
              Search
            </button>
          </div>
        </form>

        {/* Results dropdown */}
        {open && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 50,
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            overflow: 'hidden',
          }}>
            {loading && (
              <div style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--muted-foreground)' }}>
                Searching…
              </div>
            )}

            {!loading && !hasResults && query.length >= 2 && (
              <div style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--muted-foreground)' }}>
                No results for &ldquo;{query}&rdquo;
              </div>
            )}

            {!loading && hasResults && (
              <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                {results!.products.length > 0 && (
                  <div style={{ padding: '8px' }}>
                    <p style={{ fontSize: '10px', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '4px 8px', margin: 0 }}>
                      Products
                    </p>
                    {results!.products.map(p => {
                      const imgs = (() => { try { return JSON.parse(p.images) as string[] } catch { return [] } })()
                      return (
                        <Link
                          key={p.id}
                          href={`/creator/${p.creator.username}/product/${p.id}`}
                          onClick={() => setOpen(false)}
                          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: '8px', textDecoration: 'none', color: 'inherit' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          {imgs[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={imgs[0]} alt="" style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }} />
                          ) : (
                            <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: 'var(--surface)', flexShrink: 0 }} />
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: '13px', fontWeight: 500, color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</p>
                            <p style={{ margin: 0, fontSize: '12px', color: 'var(--muted-foreground)' }}>{p.creator.displayName} · ${(p.price / 100).toFixed(2)}</p>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                )}

                {results!.creators.length > 0 && (
                  <div style={{ padding: '8px', borderTop: '1px solid var(--border)' }}>
                    <p style={{ fontSize: '10px', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '4px 8px', margin: 0 }}>
                      Creators
                    </p>
                    {results!.creators.map(c => (
                      <Link
                        key={c.username}
                        href={`/creator/${c.username}`}
                        onClick={() => setOpen(false)}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: '8px', textDecoration: 'none', color: 'inherit' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        {c.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={c.avatar} alt="" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(124,58,237,0.2)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: '#7c3aed' }}>
                            {c.displayName.slice(0, 1)}
                          </div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: '13px', fontWeight: 500, color: 'var(--foreground)' }}>
                            {c.displayName}
                            {c.isVerified && <span style={{ marginLeft: '4px', fontSize: '10px', color: '#7c3aed' }}>✓</span>}
                          </p>
                          <p style={{ margin: 0, fontSize: '12px', color: 'var(--muted-foreground)' }}>@{c.username}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                {results!.posts.length > 0 && (
                  <div style={{ padding: '8px', borderTop: '1px solid var(--border)' }}>
                    <p style={{ fontSize: '10px', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '4px 8px', margin: 0 }}>
                      Blog
                    </p>
                    {results!.posts.map(post => (
                      <Link
                        key={post.slug}
                        href={`/blog/${post.slug}`}
                        onClick={() => setOpen(false)}
                        style={{ display: 'flex', alignItems: 'center', padding: '6px 8px', borderRadius: '8px', textDecoration: 'none', color: 'inherit' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: '13px', fontWeight: 500, color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.title}</p>
                          {post.excerpt && <p style={{ margin: 0, fontSize: '12px', color: 'var(--muted-foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.excerpt}</p>}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                <div style={{ padding: '8px', borderTop: '1px solid var(--border)' }}>
                  <button
                    suppressHydrationWarning
                    onClick={() => { router.push(`/search?q=${encodeURIComponent(query)}`); setOpen(false) }}
                    style={{ width: '100%', textAlign: 'center', fontSize: '12px', color: '#7c3aed', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                  >
                    See all results for &ldquo;{query}&rdquo; →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
