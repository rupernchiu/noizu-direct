'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ProductAdminActionsProps {
  productId: string
  isActive: boolean
}

export function ProductAdminActions({ productId, isActive }: ProductAdminActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

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
    <div className="flex items-center gap-2">
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
    </div>
  )
}
