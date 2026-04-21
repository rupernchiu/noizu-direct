'use client'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'

interface DiscountCode {
  id: string
  code: string
  type: string
  value: number
  minimumOrderAmount: number | null
  maxUses: number | null
  usedCount: number
  expiresAt: string | null
  isActive: boolean
  product: { id: string; title: string } | null
  createdAt: string
}

function formatValue(code: DiscountCode): string {
  return code.type === 'PERCENTAGE' ? `${code.value}%` : `$${(code.value / 100).toFixed(2)}`
}

function formatExpiry(expiresAt: string | null): string {
  if (!expiresAt) return 'Never'
  return new Date(expiresAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const inputClass =
  'w-full rounded-lg bg-background border border-border px-3 py-2 text-base sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors'

interface Product {
  id: string
  title: string
}

export default function DiscountCodesPage() {
  const [codes, setCodes] = useState<DiscountCode[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    code: '',
    type: 'PERCENTAGE',
    value: '',
    minimumOrderAmount: '',
    maxUses: '',
    expiresAt: '',
    productId: '',
  })

  useEffect(() => {
    fetch('/api/dashboard/discount-codes')
      .then(r => r.json())
      .then((data: { codes?: DiscountCode[]; products?: Product[] }) => {
        setCodes(data.codes ?? [])
        setProducts(data.products ?? [])
      })
      .catch(() => toast.error('Failed to load discount codes'))
      .finally(() => setLoading(false))
  }, [])

  function setField(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.code.trim() || !form.value) { toast.error('Code and value are required'); return }
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        code: form.code.trim(),
        type: form.type,
        value: form.type === 'PERCENTAGE' ? Number(form.value) : Math.round(Number(form.value) * 100),
      }
      if (form.minimumOrderAmount) body.minimumOrderAmount = Math.round(Number(form.minimumOrderAmount) * 100)
      if (form.maxUses) body.maxUses = Number(form.maxUses)
      if (form.expiresAt) body.expiresAt = form.expiresAt
      if (form.productId) body.productId = form.productId

      const res = await fetch('/api/dashboard/discount-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json() as { discountCode?: DiscountCode; error?: string }
      if (!res.ok) { toast.error(data.error ?? 'Failed to create code'); return }
      const linkedProduct = form.productId ? (products.find(p => p.id === form.productId) ?? null) : null
      setCodes(prev => [{ ...data.discountCode!, product: linkedProduct }, ...prev])
      setForm({ code: '', type: 'PERCENTAGE', value: '', minimumOrderAmount: '', maxUses: '', expiresAt: '', productId: '' })
      toast.success('Discount code created')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string, code: string) {
    if (!confirm(`Delete code "${code}"?`)) return
    const res = await fetch(`/api/dashboard/discount-codes/${id}`, { method: 'DELETE' })
    if (!res.ok) { toast.error('Failed to delete code'); return }
    setCodes(prev => prev.filter(c => c.id !== id))
    toast.success('Code deleted')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Discount Codes</h1>
        <p className="text-sm text-muted-foreground mt-1">Create codes buyers can apply at checkout.</p>
      </div>

      {/* Create form */}
      <div className="rounded-xl bg-card border border-border p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4">New Discount Code</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Code</label>
              <input
                type="text"
                placeholder="SUMMER20"
                value={form.code}
                onChange={e => setField('code', e.target.value.toUpperCase())}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Type</label>
              <select value={form.type} onChange={e => setField('type', e.target.value)} className={inputClass}>
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FIXED_AMOUNT">Fixed Amount ($)</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Applies To</label>
              <select value={form.productId} onChange={e => setField('productId', e.target.value)} className={inputClass}>
                <option value="">All my products (Storewide)</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-muted-foreground">
                Choose a specific product to restrict this code, or leave as storewide.
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Value {form.type === 'PERCENTAGE' ? '(%)' : '(USD)'}
              </label>
              <input
                type="number"
                step={form.type === 'PERCENTAGE' ? '1' : '0.01'}
                min="0"
                max={form.type === 'PERCENTAGE' ? '100' : undefined}
                placeholder={form.type === 'PERCENTAGE' ? '20' : '5.00'}
                value={form.value}
                onChange={e => setField('value', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Min. Order (USD) <span className="text-muted-foreground/60">optional</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="10.00"
                value={form.minimumOrderAmount}
                onChange={e => setField('minimumOrderAmount', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Max Uses <span className="text-muted-foreground/60">optional, blank = unlimited</span>
              </label>
              <input
                type="number"
                min="1"
                placeholder="100"
                value={form.maxUses}
                onChange={e => setField('maxUses', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Expires At <span className="text-muted-foreground/60">optional</span>
              </label>
              <input
                type="datetime-local"
                value={form.expiresAt}
                onChange={e => setField('expiresAt', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-5 py-3 sm:py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Creating...' : 'Create Code'}
            </button>
          </div>
        </form>
      </div>

      {/* Code list */}
      {loading ? (
        <div className="rounded-xl bg-card border border-border p-8 text-center text-sm text-muted-foreground">Loading...</div>
      ) : codes.length === 0 ? (
        <div className="rounded-xl bg-card border border-border p-8 text-center text-sm text-muted-foreground">No discount codes yet.</div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {codes.map(code => {
              const isExpired = code.expiresAt ? new Date(code.expiresAt) < new Date() : false
              const isMaxed = code.maxUses !== null && code.usedCount >= code.maxUses
              const active = code.isActive && !isExpired && !isMaxed
              return (
                <div key={code.id} className="rounded-xl bg-card border border-border p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-mono font-semibold text-foreground text-base">{code.code}</div>
                      <div className="mt-1.5">
                        {code.product
                          ? <span className="text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-2 py-0.5 truncate max-w-full inline-block" title={code.product.title}>{code.product.title}</span>
                          : <span className="text-xs bg-secondary/10 text-secondary border border-secondary/20 rounded-full px-2 py-0.5">Storewide</span>
                        }
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${active ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                        {active ? 'Active' : isExpired ? 'Expired' : isMaxed ? 'Maxed' : 'Inactive'}
                      </span>
                      <button
                        onClick={() => handleDelete(code.id, code.code)}
                        className="size-10 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        aria-label="Delete code"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border text-xs">
                    <div>
                      <div className="text-muted-foreground">Value</div>
                      <div className="text-foreground font-medium">{formatValue(code)} <span className="text-muted-foreground font-normal">({code.type === 'PERCENTAGE' ? 'pct' : 'fixed'})</span></div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Min order</div>
                      <div className="text-foreground font-medium">{code.minimumOrderAmount ? `$${(code.minimumOrderAmount / 100).toFixed(2)}` : '—'}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Uses</div>
                      <div className="text-foreground font-medium">{code.usedCount}{code.maxUses !== null ? `/${code.maxUses}` : ''}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Expires</div>
                      <div className="text-foreground font-medium">{formatExpiry(code.expiresAt)}</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block rounded-xl bg-card border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Code</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Applies To</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Value</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Min Order</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Uses</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Expires</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {codes.map(code => {
                    const isExpired = code.expiresAt ? new Date(code.expiresAt) < new Date() : false
                    const isMaxed = code.maxUses !== null && code.usedCount >= code.maxUses
                    const active = code.isActive && !isExpired && !isMaxed
                    return (
                      <tr key={code.id} className="hover:bg-surface/50 transition-colors">
                        <td className="px-4 py-3 font-mono font-semibold text-foreground">{code.code}</td>
                        <td className="px-4 py-3">
                          {code.product
                            ? <span className="text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-2 py-0.5 truncate max-w-[140px] inline-block" title={code.product.title}>{code.product.title}</span>
                            : <span className="text-xs bg-secondary/10 text-secondary border border-secondary/20 rounded-full px-2 py-0.5">Storewide</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-muted-foreground capitalize">{code.type === 'PERCENTAGE' ? 'Percentage' : 'Fixed'}</td>
                        <td className="px-4 py-3 text-foreground">{formatValue(code)}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {code.minimumOrderAmount ? `$${(code.minimumOrderAmount / 100).toFixed(2)}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {code.usedCount}{code.maxUses !== null ? `/${code.maxUses}` : ''}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{formatExpiry(code.expiresAt)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${active ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                            {active ? 'Active' : isExpired ? 'Expired' : isMaxed ? 'Maxed' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleDelete(code.id, code.code)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            aria-label="Delete code"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
