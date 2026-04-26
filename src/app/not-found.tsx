import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Page Not Found',
  robots: { index: false, follow: false },
}

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
      {/* Large 404 */}
      <div className="text-[120px] font-extrabold leading-none mb-2" style={{
        background: 'linear-gradient(135deg, #7c3aed, #00d4aa)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }}>
        404
      </div>

      <h1 className="text-2xl font-bold text-foreground mb-2">
        This page has gone missing
      </h1>
      <p className="text-muted-foreground mb-8 max-w-md">
        The page you&apos;re looking for may have moved, been removed, or never existed.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-white hover:bg-primary/90 transition-colors"
        >
          Go Home
        </Link>
        <Link
          href="/marketplace"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-6 py-3 font-semibold text-foreground hover:border-primary/30 transition-colors"
        >
          Browse Marketplace
        </Link>
      </div>
    </div>
  )
}
