'use client'

import { useEffect } from 'react'

interface ProductViewTrackerProps {
  productId: string
  /** @deprecated server reads userId from session — prop kept for call-site compat */
  userId?: string
}

export function ProductViewTracker({ productId }: ProductViewTrackerProps) {
  useEffect(() => {
    const getCookie = (name: string): string | undefined => {
      const match = document.cookie.split('; ').find((row) => row.startsWith(name + '='))
      return match ? match.split('=')[1] : undefined
    }

    let sessionId = getCookie('nd_session')

    if (!sessionId) {
      const arr = new Uint8Array(16)
      crypto.getRandomValues(arr)
      sessionId = Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('')
      document.cookie = `nd_session=${sessionId}; path=/; max-age=${60 * 60 * 24 * 365}`
    }

    const track = async () => {
      try {
        await fetch('/api/track/view', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId, sessionId }),
        })
      } catch {
        // fire and forget — ignore errors
      }
    }

    track()
  }, [productId])

  return null
}
