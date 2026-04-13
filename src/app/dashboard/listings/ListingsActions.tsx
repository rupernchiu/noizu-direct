'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ListingsActionsProps {
  productId: string
  isActive: boolean
  isPinned: boolean
  mode: 'status' | 'pin' | 'delete'
}

export function ListingsActions({ productId, isActive, isPinned, mode }: ListingsActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function toggle(field: 'isActive' | 'isPinned', value: boolean) {
    setLoading(true)
    try {
      await fetch(`/api/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
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
      await fetch(`/api/products/${productId}`, { method: 'DELETE' })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  if (mode === 'status') {
    return (
      <button
        onClick={() => toggle('isActive', !isActive)}
        disabled={loading}
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium transition-colors disabled:opacity-50 ${
          isActive
            ? 'bg-[#00d4aa]/20 text-[#00d4aa] hover:bg-red-500/20 hover:text-red-400'
            : 'bg-[#8888aa]/20 text-[#8888aa] hover:bg-[#00d4aa]/20 hover:text-[#00d4aa]'
        }`}
      >
        {isActive ? 'Active' : 'Inactive'}
      </button>
    )
  }

  if (mode === 'pin') {
    return (
      <button
        onClick={() => toggle('isPinned', !isPinned)}
        disabled={loading}
        className={`text-xs transition-colors disabled:opacity-50 ${
          isPinned ? 'text-[#7c3aed]' : 'text-[#8888aa] hover:text-[#f0f0f5]'
        }`}
        title={isPinned ? 'Unpin' : 'Pin to top'}
      >
        {isPinned ? '📌 Pinned' : 'Pin'}
      </button>
    )
  }

  return (
    <button
      onClick={deleteProduct}
      disabled={loading}
      className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50 transition-colors"
    >
      Delete
    </button>
  )
}
