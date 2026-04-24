'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, X, Check, AlertTriangle, User as UserIcon } from 'lucide-react'

export interface BuyerOption {
  id: string
  name: string | null
  email: string | null
  avatar: string | null
  contexts: { tickets: number; requests: number; openRequests: number; orders: number }
}

export interface BuyerPickerProps {
  value: BuyerOption | null
  onChange: (buyer: BuyerOption | null) => void
  // When set, shows the "Paste email instead" fallback with warnings
  emailFallback: string
  onEmailFallback: (email: string) => void
}

function useDebounced<T>(value: T, delay: number): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return v
}

function contextChips(ctx: BuyerOption['contexts']): string[] {
  const out: string[] = []
  if (ctx.openRequests > 0) out.push(`${ctx.openRequests} open request${ctx.openRequests === 1 ? '' : 's'}`)
  else if (ctx.requests > 0) out.push(`${ctx.requests} past request${ctx.requests === 1 ? '' : 's'}`)
  if (ctx.orders > 0) out.push(`${ctx.orders} order${ctx.orders === 1 ? '' : 's'}`)
  if (ctx.tickets > 0) out.push(`${ctx.tickets} ticket${ctx.tickets === 1 ? '' : 's'}`)
  return out
}

export function BuyerPicker(props: BuyerPickerProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<BuyerOption[]>([])
  const [showEmailFallback, setShowEmailFallback] = useState(!!props.emailFallback)
  const containerRef = useRef<HTMLDivElement>(null)
  const debouncedQuery = useDebounced(query, 200)

  const fetchBuyers = useCallback(async (q: string) => {
    setLoading(true)
    try {
      const url = q ? `/api/dashboard/commissions/buyer-search?q=${encodeURIComponent(q)}` : '/api/dashboard/commissions/buyer-search'
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json() as { buyers: BuyerOption[] }
        setResults(data.buyers)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) fetchBuyers(debouncedQuery)
  }, [open, debouncedQuery, fetchBuyers])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function select(buyer: BuyerOption) {
    props.onChange(buyer)
    setOpen(false)
    setQuery('')
    setShowEmailFallback(false)
    props.onEmailFallback('')
  }

  function clear() {
    props.onChange(null)
    setQuery('')
  }

  // Selected state — show pill confirmation
  if (props.value) {
    const chips = contextChips(props.value.contexts)
    const initial = (props.value.name?.[0] ?? props.value.email?.[0] ?? '?').toUpperCase()
    return (
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
          Quoting to
        </label>
        <div className="flex items-center gap-3 bg-primary/5 border-2 border-primary/30 rounded-xl p-3">
          <div className="shrink-0 size-10 rounded-full overflow-hidden bg-gradient-to-br from-primary/40 to-secondary/40 flex items-center justify-center text-sm font-bold text-white">
            {props.value.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={props.value.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              initial
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <Check className="size-4 text-primary shrink-0" />
              <p className="font-semibold text-foreground truncate">{props.value.name ?? 'Unnamed buyer'}</p>
            </div>
            <p className="text-xs text-muted-foreground truncate">{props.value.email ?? '—'}</p>
            {chips.length > 0 && (
              <div className="flex gap-1 mt-1 flex-wrap">
                {chips.map((c, i) => (
                  <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full bg-card text-muted-foreground border border-border">
                    {c}
                  </span>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={clear}
            className="shrink-0 text-muted-foreground hover:text-foreground p-1 rounded"
            aria-label="Clear buyer"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef}>
      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
        Quote recipient
      </label>

      {!showEmailFallback && (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
              onFocus={() => setOpen(true)}
              placeholder="Search by name or email…"
              className="w-full text-base sm:text-sm pl-10 pr-3 py-3 rounded-lg bg-card border border-border text-foreground"
              autoComplete="off"
            />
          </div>

          {open && (
            <div className="mt-1 bg-card border border-border rounded-lg shadow-lg max-h-80 overflow-y-auto z-10 relative">
              {loading ? (
                <div className="p-4 text-center text-xs text-muted-foreground">Searching…</div>
              ) : results.length === 0 ? (
                <div className="p-4 text-center">
                  <UserIcon className="size-5 text-muted-foreground mx-auto mb-1" />
                  <p className="text-sm text-foreground">No buyers found</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {query ? 'Try a different search.' : 'Only buyers who\'ve opened a ticket, ordered from you, or requested a commission appear here.'}
                  </p>
                </div>
              ) : (
                results.map((buyer) => {
                  const chips = contextChips(buyer.contexts)
                  const initial = (buyer.name?.[0] ?? buyer.email?.[0] ?? '?').toUpperCase()
                  return (
                    <button
                      type="button"
                      key={buyer.id}
                      onClick={() => select(buyer)}
                      className="w-full flex items-start gap-3 p-3 text-left hover:bg-background transition-colors border-b border-border last:border-0"
                    >
                      <div className="shrink-0 size-9 rounded-full overflow-hidden bg-gradient-to-br from-primary/40 to-secondary/40 flex items-center justify-center text-xs font-bold text-white">
                        {buyer.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={buyer.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          initial
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{buyer.name ?? 'Unnamed'}</p>
                        <p className="text-xs text-muted-foreground truncate">{buyer.email ?? '—'}</p>
                        {chips.length > 0 && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {chips.map((c, i) => (
                              <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full bg-background text-muted-foreground border border-border">
                                {c}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          )}
        </>
      )}

      {showEmailFallback && (
        <div className="space-y-2">
          <input
            type="email"
            value={props.emailFallback}
            onChange={(e) => props.onEmailFallback(e.target.value)}
            placeholder="buyer@example.com"
            className="w-full text-base sm:text-sm p-3 rounded-lg bg-card border-2 border-yellow-500/40 text-foreground"
          />
          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-2.5">
            <AlertTriangle className="size-4 text-yellow-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-foreground font-medium">Double-check the address.</p>
              <p>Your quote is sensitive — a typo sends it to the wrong person. The buyer must already have a noizu.direct account at this exact email, or the quote won&apos;t send.</p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-2 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {showEmailFallback
            ? 'Sending by email (risky — mistypes go to the wrong buyer).'
            : 'Only buyers who\'ve interacted with your store appear in the picker.'}
        </p>
        <button
          type="button"
          onClick={() => {
            setShowEmailFallback(v => !v)
            if (showEmailFallback) props.onEmailFallback('')
            setQuery('')
            setOpen(false)
          }}
          className="text-xs text-primary hover:underline shrink-0"
        >
          {showEmailFallback ? 'Use picker instead' : 'Can\'t find them? Use email'}
        </button>
      </div>
    </div>
  )
}
