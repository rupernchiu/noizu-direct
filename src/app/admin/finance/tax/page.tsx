/**
 * /admin/finance/tax — server entrypoint.
 *
 * Phase 6 turned this page into a tabbed dashboard. The page itself is a thin
 * server wrapper for auth; the real layout lives in `AdminTaxClient.tsx` so
 * filter state can sync with URL query params via `useSearchParams`.
 */
import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import AdminTaxClient from './AdminTaxClient'

export default async function AdminTaxPage() {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/')

  return (
    <Suspense fallback={<div className="py-24 text-center text-muted-foreground">Loading…</div>}>
      <AdminTaxClient />
    </Suspense>
  )
}
