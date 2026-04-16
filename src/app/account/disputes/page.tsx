import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Scale } from 'lucide-react'

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(date))
}

function daysOpen(date: Date) {
  const now = new Date()
  const diff = now.getTime() - new Date(date).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

type DisputeStatus =
  | 'OPEN'
  | 'UNDER_REVIEW'
  | 'RESOLVED_REFUND'
  | 'RESOLVED_RELEASE'
  | 'CLOSED'

type DisputeReason =
  | 'NEVER_ARRIVED'
  | 'WRONG_ITEM'
  | 'PRINT_QUALITY'
  | 'WRONG_SIZE'
  | 'DAMAGED'
  | 'OTHER'

const statusStyles: Record<DisputeStatus, string> = {
  OPEN: 'bg-red-500/20 text-red-400',
  UNDER_REVIEW: 'bg-yellow-500/20 text-yellow-400',
  RESOLVED_REFUND: 'bg-green-500/20 text-green-400',
  RESOLVED_RELEASE: 'bg-green-500/20 text-green-400',
  CLOSED: 'bg-muted-foreground/20 text-muted-foreground',
}

const statusLabels: Record<DisputeStatus, string> = {
  OPEN: 'Open',
  UNDER_REVIEW: 'Under Review',
  RESOLVED_REFUND: 'Resolved — Refund',
  RESOLVED_RELEASE: 'Resolved — Released',
  CLOSED: 'Closed',
}

const reasonLabels: Record<DisputeReason, string> = {
  NEVER_ARRIVED: 'Never Arrived',
  WRONG_ITEM: 'Wrong Item',
  PRINT_QUALITY: 'Print Quality',
  WRONG_SIZE: 'Wrong Size',
  DAMAGED: 'Damaged',
  OTHER: 'Other',
}

const reasonStyles: Record<DisputeReason, string> = {
  NEVER_ARRIVED: 'bg-red-500/20 text-red-400',
  WRONG_ITEM: 'bg-orange-500/20 text-orange-400',
  PRINT_QUALITY: 'bg-purple-500/20 text-purple-400',
  WRONG_SIZE: 'bg-blue-500/20 text-blue-400',
  DAMAGED: 'bg-yellow-500/20 text-yellow-400',
  OTHER: 'bg-muted-foreground/20 text-muted-foreground',
}

type Tab = 'all' | 'open' | 'under_review' | 'resolved'

const tabs: { key: Tab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'under_review', label: 'Under Review' },
  { key: 'resolved', label: 'Resolved' },
]

function matchesTab(status: string, tab: Tab): boolean {
  if (tab === 'all') return true
  if (tab === 'open') return status === 'OPEN'
  if (tab === 'under_review') return status === 'UNDER_REVIEW'
  if (tab === 'resolved') return status === 'RESOLVED_REFUND' || status === 'RESOLVED_RELEASE' || status === 'CLOSED'
  return true
}

export default async function DisputesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')
  const userId = (session.user as any).id

  const params = await searchParams
  const activeTab = (params.tab ?? 'all') as Tab

  const disputes = await prisma.dispute.findMany({
    where: { order: { buyerId: userId } },
    include: {
      order: {
        include: {
          product: { select: { title: true, images: true, type: true } },
          creator: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const filtered = disputes.filter(d => matchesTab(d.status, activeTab))

  const counts = {
    all: disputes.length,
    open: disputes.filter(d => d.status === 'OPEN').length,
    under_review: disputes.filter(d => d.status === 'UNDER_REVIEW').length,
    resolved: disputes.filter(d =>
      d.status === 'RESOLVED_REFUND' || d.status === 'RESOLVED_RELEASE' || d.status === 'CLOSED'
    ).length,
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Disputes</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track and manage your open disputes and resolutions
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-1 -mb-px">
          {tabs.map(tab => (
            <Link
              key={tab.key}
              href={`/account/disputes?tab=${tab.key}`}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              {tab.label}
              {counts[tab.key] > 0 && (
                <span
                  className={`ml-2 px-1.5 py-0.5 rounded-full text-xs font-medium ${
                    activeTab === tab.key
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted-foreground/20 text-muted-foreground'
                  }`}
                >
                  {counts[tab.key]}
                </span>
              )}
            </Link>
          ))}
        </nav>
      </div>

      {/* Dispute cards */}
      {filtered.length === 0 ? (
        <div className="bg-surface rounded-xl border border-border p-12 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-card text-muted-foreground">
            <Scale className="size-8" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-foreground">No disputes</h3>
          <p className="mb-4 text-sm text-muted-foreground max-w-sm mx-auto">
            {activeTab === 'all'
              ? 'If you have an issue with an order, go to your Orders page to raise a dispute.'
              : `No ${tabs.find(t => t.key === activeTab)?.label.toLowerCase()} disputes.`}
          </p>
          {activeTab === 'all' && (
            <Link
              href="/account/orders"
              className="inline-flex items-center gap-2 rounded-lg bg-card border border-border px-4 py-2 text-sm font-medium text-foreground hover:border-primary/30 transition-colors"
            >
              View Orders
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(dispute => {
            let thumbnailUrl: string | null = null
            try {
              const imgs = JSON.parse(dispute.order.product.images)
              thumbnailUrl = Array.isArray(imgs) && imgs.length > 0 ? imgs[0] : null
            } catch {
              thumbnailUrl = null
            }

            const days = daysOpen(dispute.createdAt)
            const statusStyle = statusStyles[dispute.status as DisputeStatus] ?? 'bg-muted/20 text-muted-foreground'
            const statusLabel = statusLabels[dispute.status as DisputeStatus] ?? dispute.status
            const reasonStyle = reasonStyles[dispute.reason as DisputeReason] ?? 'bg-muted/20 text-muted-foreground'
            const reasonLabel = reasonLabels[dispute.reason as DisputeReason] ?? dispute.reason
            const snippet = dispute.description.length > 100
              ? dispute.description.slice(0, 100) + '…'
              : dispute.description

            return (
              <div
                key={dispute.id}
                className="bg-surface rounded-xl border border-border p-5"
              >
                <div className="flex items-start gap-4">
                  {/* Product thumbnail */}
                  <div className="flex-shrink-0">
                    {thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumbnailUrl}
                        alt={dispute.order.product.title}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-background flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-muted-foreground"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                          />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Main content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p className="font-semibold text-foreground text-sm truncate">
                        {dispute.order.product.title}
                      </p>
                      <span className="text-muted-foreground text-xs">
                        by {dispute.order.creator?.name ?? 'Unknown'}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-2">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${reasonStyle}`}
                      >
                        {reasonLabel}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle}`}
                      >
                        {statusLabel}
                      </span>
                    </div>

                    <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                      {snippet}
                    </p>

                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>Raised {formatDate(dispute.createdAt)}</span>
                        <span>&middot;</span>
                        <span>
                          {days === 0 ? 'Today' : `${days} day${days !== 1 ? 's' : ''} open`}
                        </span>
                      </div>

                      <Link
                        href={`/account/disputes/${dispute.id}`}
                        className="bg-primary hover:bg-primary/90 text-white rounded-lg px-3 py-1.5 text-xs font-medium"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
