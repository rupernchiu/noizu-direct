'use client'

import Link from 'next/link'
import { useEffect } from 'react'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="text-6xl mb-4">⚠️</div>

      <h1 className="text-2xl font-bold text-foreground mb-2">
        Something went wrong
      </h1>
      <p className="text-muted-foreground mb-8 max-w-md">
        An unexpected error occurred. Our team has been notified and is working on a fix.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-white hover:bg-primary/90 transition-colors"
        >
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-6 py-3 font-semibold text-foreground hover:border-primary/30 transition-colors"
        >
          Go Home
        </Link>
      </div>

      {error.digest && (
        <p className="mt-6 text-xs text-muted-foreground font-mono">
          Error ID: {error.digest}
        </p>
      )}
    </div>
  )
}
