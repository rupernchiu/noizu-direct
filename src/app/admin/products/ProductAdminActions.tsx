'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ProductAdminActionsProps {
  productId: string
  isActive: boolean
  manualBoost: number
  isTrendingSuppressed: boolean
  breakdown: string | null
}

export function ProductAdminActions({ productId, isActive, manualBoost, isTrendingSuppressed, breakdown }: ProductAdminActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showBreakdown, setShowBreakdown] = useState(false)

  async function toggleActive() {
    setLoading(true)
    try {
      await fetch(`/api/admin/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  async function trendingAction(action: string) {
    setLoading(true)
    try {
      await fetch(`/api/admin/products/${productId}/trending`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  async function deleteProduct() {
    if (!confirm('Delete this product? This cannot be undone.')) return
    setLoading(true)
    try {
      await fetch(`/api/admin/products/${productId}`, { method: 'DELETE' })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex items-center gap-2 flex-wrap">
      <button
        onClick={toggleActive}
        disabled={loading}
        className={`px-2 py-0.5 rounded text-xs font-medium transition-colors disabled:opacity-50 ${
          isActive
            ? 'bg-green-500/20 text-green-400 hover:bg-yellow-500/20 hover:text-yellow-400'
            : 'bg-red-500/20 text-red-400 hover:bg-green-500/20 hover:text-green-400'
        }`}
      >
        {isActive ? 'Active' : 'Inactive'}
      </button>
      <button
        onClick={deleteProduct}
        disabled={loading}
        className="px-2 py-0.5 rounded text-xs font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
      >
        Delete
      </button>
      {manualBoost === 999 ? (
        <button
          onClick={() => trendingAction('unpin')}
          disabled={loading}
          className="px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors disabled:opacity-50"
        >
          Unpin
        </button>
      ) : (
        <button
          onClick={() => trendingAction('pin')}
          disabled={loading}
          className="px-2 py-0.5 rounded text-xs font-medium bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors disabled:opacity-50"
        >
          Pin
        </button>
      )}
      {isTrendingSuppressed ? (
        <button
          onClick={() => trendingAction('unsuppress')}
          disabled={loading}
          className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition-colors disabled:opacity-50"
        >
          Unsuppress
        </button>
      ) : (
        <button
          onClick={() => trendingAction('suppress')}
          disabled={loading}
          className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 transition-colors disabled:opacity-50"
        >
          Suppress
        </button>
      )}
      <button
        onClick={() => setShowBreakdown(v => !v)}
        className="px-2 py-0.5 rounded text-xs font-medium bg-border text-muted-foreground hover:text-foreground transition-colors"
      >
        Breakdown
      </button>
      {showBreakdown && (() => {
        let bd: any = {}
        try { bd = breakdown ? JSON.parse(breakdown) : {} } catch {}
        return (
          <div className="absolute z-10 mt-1 left-0 top-full w-64 bg-card border border-border rounded-lg p-3 shadow-lg space-y-1 text-xs">
            <p className="font-semibold text-foreground mb-2">Score Breakdown</p>
            <div className="space-y-1 text-muted-foreground">
              <div className="flex justify-between"><span>Orders (7d)</span><span>{bd.orders ?? 0}</span></div>
              <div className="flex justify-between"><span>Wishlist adds (7d)</span><span>{bd.wishlist ?? 0}</span></div>
              <div className="flex justify-between"><span>Cart adds (7d)</span><span>{bd.cart ?? 0}</span></div>
              <div className="flex justify-between"><span>Views (7d)</span><span>{bd.views ?? 0}</span></div>
              <div className="flex justify-between"><span>Raw score</span><span>{bd.rawScore ?? 0}</span></div>
              <div className="flex justify-between"><span>Decay applied (days)</span><span>{bd.decayDays ?? 0}</span></div>
              <div className="flex justify-between"><span>Manual boost</span><span>{bd.manualBoost ?? manualBoost}</span></div>
              <div className="flex justify-between font-semibold text-foreground"><span>Final score</span><span>{bd.finalScore ?? 0}</span></div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
