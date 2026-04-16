import type { Metadata } from 'next'
import { Suspense } from 'react'
import { SearchResults } from './SearchResults'

export const metadata: Metadata = {
  title: 'Search | NOIZU-DIRECT',
  description: 'Search for products, creators, and posts on NOIZU-DIRECT.',
  robots: { index: false, follow: true },
}

interface Props { searchParams: Promise<{ q?: string; tab?: string }> }

export default async function SearchPage({ searchParams }: Props) {
  const { q = '' } = await searchParams
  return (
    <div className="max-w-screen-xl mx-auto px-4 py-8">
      <Suspense fallback={null}>
        <SearchResults initialQuery={q.trim()} />
      </Suspense>
    </div>
  )
}
