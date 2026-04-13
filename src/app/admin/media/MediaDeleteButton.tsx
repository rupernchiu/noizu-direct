'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function MediaDeleteButton({ mediaId }: { mediaId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function del() {
    if (!confirm('Delete this media file?')) return
    setLoading(true)
    try {
      await fetch(`/api/admin/media/${mediaId}`, { method: 'DELETE' })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={del}
      disabled={loading}
      className="px-2 py-0.5 rounded text-xs font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
    >
      Delete
    </button>
  )
}
