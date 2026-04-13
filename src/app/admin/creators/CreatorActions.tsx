'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface CreatorActionsProps {
  creatorId: string
  isVerified: boolean
  isTopCreator: boolean
}

export function CreatorActions({ creatorId, isVerified, isTopCreator }: CreatorActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function update(data: { isVerified?: boolean; isTopCreator?: boolean }) {
    setLoading(true)
    try {
      await fetch(`/api/admin/creators/${creatorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => update({ isVerified: !isVerified })}
        disabled={loading}
        className={`px-2 py-0.5 rounded text-xs font-medium transition-colors disabled:opacity-50 ${
          isVerified
            ? 'bg-green-500/20 text-green-400 hover:bg-red-500/20 hover:text-red-400'
            : 'bg-[#2a2a3a] text-[#8888aa] hover:bg-green-500/20 hover:text-green-400'
        }`}
      >
        {isVerified ? 'Verified ✓' : 'Unverified'}
      </button>
      <button
        onClick={() => update({ isTopCreator: !isTopCreator })}
        disabled={loading}
        className={`px-2 py-0.5 rounded text-xs font-medium transition-colors disabled:opacity-50 ${
          isTopCreator
            ? 'bg-[#7c3aed]/20 text-[#7c3aed] hover:bg-[#2a2a3a] hover:text-[#8888aa]'
            : 'bg-[#2a2a3a] text-[#8888aa] hover:bg-[#7c3aed]/20 hover:text-[#7c3aed]'
        }`}
      >
        {isTopCreator ? 'Top Creator ★' : 'Not Top'}
      </button>
    </div>
  )
}
