import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Suspense } from 'react'
import { SearchBar } from '@/components/ui/SearchBar'
import { DiscountFilters } from './DiscountFilters'
import { DiscountAdminActions } from './DiscountAdminActions'
import { CreateDiscountForm } from './CreateDiscountForm'

// Phase 3.1 — Admin discount-code manager.
// Creators self-serve at /dashboard/discount-codes. This admin page sees every
// code across all creators, can deactivate questionable ones, and create codes
// on behalf of any creator (e.g. for partnership/PR campaigns).

interface SearchParamsShape {
  q?: string
  creatorId?: string
  status?: string
}

function formatValue(type: string, value: number): string {
  return type === 'PERCENTAGE' ? `${value}%` : `$${(value / 100).toFixed(2)}`
}

function formatExpiry(expiresAt: Date | null): string {
  if (!expiresAt) return 'Never'
  return new Date(expiresAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default async function AdminDiscountsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsShape>
}) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/')

  const params = await searchParams
  const q = params.q?.trim().toUpperCase() ?? ''
  const creatorId = params.creatorId ?? ''
  const status = params.status ?? ''

  const where: any = {}
  if (creatorId) where.creatorId = creatorId
  if (q) where.code = { contains: q }
  if (status === 'ACTIVE') where.isActive = true
  if (status === 'INACTIVE') where.isActive = false

  const [allCodes, totalAll, creators] = await Promise.all([
    prisma.discountCode.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        creator: { select: { id: true, displayName: true } },
        product: { select: { id: true, title: true } },
      },
      take: 200,
    }),
    prisma.discountCode.count(),
    prisma.creatorProfile.findMany({
      select: { id: true, displayName: true },
      orderBy: { displayName: 'asc' },
    }),
  ])

  const now = new Date()
  const codes = allCodes.filter(c => {
    const expired = c.expiresAt !== null && c.expiresAt < now
    const maxed = c.maxUses !== null && c.usedCount >= c.maxUses
    if (status === 'EXPIRED') return expired
    if (status === 'MAXED') return maxed
    return true
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">Discount Codes</h2>
        <CreateDiscountForm creators={creators} />
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <Suspense fallback={null}>
          <SearchBar placeholder="Search by code…" className="min-w-52 flex-1" />
        </Suspense>
      </div>

      <Suspense fallback={null}>
        <DiscountFilters creators={creators} total={totalAll} filtered={codes.length} />
      </Suspense>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm [&_td]:whitespace-nowrap">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-3 py-2 text-muted-foreground font-medium">Code</th>
                <th className="text-left px-3 py-2 text-muted-foreground font-medium">Creator</th>
                <th className="text-left px-3 py-2 text-muted-foreground font-medium">Applies To</th>
                <th className="text-left px-3 py-2 text-muted-foreground font-medium">Type</th>
                <th className="text-left px-3 py-2 text-muted-foreground font-medium">Value</th>
                <th className="text-left px-3 py-2 text-muted-foreground font-medium">Min Order</th>
                <th className="text-left px-3 py-2 text-muted-foreground font-medium">Uses</th>
                <th className="text-left px-3 py-2 text-muted-foreground font-medium">Expires</th>
                <th className="text-left px-3 py-2 text-muted-foreground font-medium">Created</th>
                <th className="text-left px-3 py-2 text-muted-foreground font-medium">Status</th>
                <th className="text-left px-3 py-2 text-muted-foreground font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {codes.map(code => {
                const expired = code.expiresAt !== null && code.expiresAt < now
                const maxed = code.maxUses !== null && code.usedCount >= code.maxUses
                const live = code.isActive && !expired && !maxed
                const statusLabel = live ? 'Active' : expired ? 'Expired' : maxed ? 'Maxed' : 'Inactive'
                const statusClass = live
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-border text-muted-foreground'
                return (
                  <tr key={code.id} className="border-b border-border last:border-0 hover:bg-surface">
                    <td className="px-3 py-1.5 font-mono font-semibold text-foreground">{code.code}</td>
                    <td className="px-3 py-1.5 text-muted-foreground">{code.creator.displayName}</td>
                    <td className="px-3 py-1.5">
                      {code.product
                        ? <span className="text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-2 py-0.5 truncate max-w-[140px] inline-block" title={code.product.title}>{code.product.title}</span>
                        : <span className="text-xs bg-secondary/10 text-secondary border border-secondary/20 rounded-full px-2 py-0.5">Storewide</span>
                      }
                    </td>
                    <td className="px-3 py-1.5 text-muted-foreground">{code.type === 'PERCENTAGE' ? 'Percentage' : 'Fixed'}</td>
                    <td className="px-3 py-1.5 text-foreground">{formatValue(code.type, code.value)}</td>
                    <td className="px-3 py-1.5 text-muted-foreground">
                      {code.minimumOrderAmount ? `$${(code.minimumOrderAmount / 100).toFixed(2)}` : '—'}
                    </td>
                    <td className="px-3 py-1.5 text-muted-foreground">
                      {code.usedCount}{code.maxUses !== null ? `/${code.maxUses}` : ''}
                    </td>
                    <td className="px-3 py-1.5 text-muted-foreground">{formatExpiry(code.expiresAt)}</td>
                    <td className="px-3 py-1.5 text-muted-foreground text-xs">{new Date(code.createdAt).toLocaleDateString()}</td>
                    <td className="px-3 py-1.5">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusClass}`}>{statusLabel}</span>
                    </td>
                    <td className="px-3 py-1.5">
                      <DiscountAdminActions
                        id={code.id}
                        code={code.code}
                        isActive={code.isActive}
                        hasRedemptions={code.usedCount > 0}
                      />
                    </td>
                  </tr>
                )
              })}
              {codes.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-muted-foreground">
                    {q || creatorId || status ? 'No codes match your filters.' : 'No discount codes yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Showing up to 200 most recent codes. Use creator/status filters to narrow.
      </p>
    </div>
  )
}
