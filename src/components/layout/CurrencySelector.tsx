'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronDown } from 'lucide-react'

const CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'US Dollar' },
  { code: 'MYR', symbol: 'RM', label: 'Malaysian Ringgit' },
  { code: 'PHP', symbol: '₱', label: 'Philippine Peso' },
  { code: 'SGD', symbol: 'S$', label: 'Singapore Dollar' },
  { code: 'IDR', symbol: 'Rp', label: 'Indonesian Rupiah' },
  { code: 'THB', symbol: '฿', label: 'Thai Baht' },
]

const LS_KEY = 'nd_currency'

export function CurrencySelector() {
  const [current, setCurrent] = useState('USD')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY)
      if (saved && CURRENCIES.find(c => c.code === saved)) setCurrent(saved)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function select(code: string) {
    setCurrent(code)
    try { localStorage.setItem(LS_KEY, code) } catch { /* ignore */ }
    setOpen(false)
    window.dispatchEvent(new CustomEvent('nd:currency-change', { detail: code }))
  }

  const curr = CURRENCIES.find(c => c.code === current)!

  return (
    <div ref={ref} className="relative">
      <button
        suppressHydrationWarning
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-1.5 py-1 rounded-md hover:bg-surface"
      >
        <span className="font-medium">{curr.symbol}</span>
        <span>{curr.code}</span>
        <ChevronDown className={`size-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-44 rounded-xl border border-border bg-card shadow-xl py-1 overflow-hidden">
          {CURRENCIES.map(c => (
            <button
              suppressHydrationWarning
              key={c.code}
              type="button"
              onClick={() => select(c.code)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors hover:bg-surface ${c.code === current ? 'text-primary font-medium' : 'text-foreground'}`}
            >
              <span className="w-6 text-muted-foreground">{c.symbol}</span>
              <span className="flex-1">{c.label}</span>
              {c.code === current && <span className="text-primary text-xs">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
