import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(date))
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(date))
}

function formatAmount(amountUsd: number) {
  return `$${(amountUsd / 100).toFixed(2)}`
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
  RESOLVED_REFUND: 'Resolved — Refund Issued',
  RESOLVED_RELEASE: 'Resolved — Funds Released',
  CLOSED: 'Closed',
}

const reasonLabels: Record<DisputeReason, string> = {
  NEVER_ARRIVED: 'Never Arrived',
  WRONG_ITEM: 'Wrong Item Received',
  PRINT_QUALITY: 'Poor Print Quality',
  WRONG_SIZE: 'Wrong Size',
  DAMAGED: 'Item Damaged',
  OTHER: 'Other',
}

const escrowTypeLabels: Record<string, string> = {
  HOLD: 'Funds Held',
  RELEASE: 'Funds Released to Creator',
  REFUND: 'Refund Issued',
  PARTIAL_REFUND: 'Partial Refund',
  FEE: 'Platform Fee',
}

const escrowTypeStyles: Record<string, string> = {
  HOLD: 'bg-yellow-500/20 text-yellow-400',
  RELEASE: 'bg-blue-500/20 text-blue-400',
  REFUND: 'bg-green-500/20 text-green-400',
  PARTIAL_REFUND: 'bg-green-500/20 text-green-400',
  FEE: 'bg-muted-foreground/20 text-muted-foreground',
}

export default async function DisputeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')
  const userId = (session.user as any).id

  const { id } = await params

  const dispute = await prisma.dispute.findFirst({
    where: { id, order: { buyerId: userId } },
    include: {
      order: {
        include: {
          product: { select: { title: true, images: true, type: true, price: true } },
          creator: { select: { name: true } },
          escrowTransactions: { orderBy: { createdAt: 'asc' } },
        },
      },
    },
  })

  if (!dispute) notFound()

  let evidence: string[] = []
  try {
    const parsed = JSON.parse(dispute.evidence ?? '[]')
    evidence = Array.isArray(parsed) ? parsed : []
  } catch {
    evidence = []
  }

  let thumbnailUrl: string | null = null
  try {
    const imgs = JSON.parse(dispute.order.product.images)
    thumbnailUrl = Array.isArray(imgs) && imgs.length > 0 ? imgs[0] : null
  } catch {
    thumbnailUrl = null
  }

  const statusStyle = statusStyles[dispute.status as DisputeStatus] ?? 'bg-muted/20 text-muted-foreground'
  const statusLabel = statusLabels[dispute.status as DisputeStatus] ?? dispute.status
  const reasonLabel = reasonLabels[dispute.reason as DisputeReason] ?? dispute.reason

  const isResolved =
    dispute.status === 'RESOLVED_REFUND' ||
    dispute.status === 'RESOLVED_RELEASE' ||
    dispute.status === 'CLOSED'

  return (
    <div className="space-y-6">
      {/* Back nav */}
      <div>
        <Link
          href="/account/disputes"
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Disputes
        </Link>
      </div>

      {/* Page header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dispute Details</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Opened {formatDate(dispute.createdAt)} &middot; Reason: {reasonLabel}
          </p>
        </div>
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusStyle}`}
        >
          {statusLabel}
        </span>
      </div>

      {/* Order summary */}
      <div className="bg-surface rounded-xl border border-border p-6">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
          Order
        </h2>
        <div className="flex items-center gap-4">
          {thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbnailUrl}
              alt={dispute.order.product.title}
              className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-background flex items-center justify-center flex-shrink-0">
              <svg
                className="w-8 h-8 text-muted-foreground"
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
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground">{dispute.order.product.title}</p>
            <p className="text-sm text-muted-foreground">
              by {dispute.order.creator?.name ?? 'Unknown Creator'}
            </p>
            <div className="flex items-center gap-3 mt-1">
              <Link
                href={`/account/orders/${dispute.orderId}`}
                className="text-xs text-primary hover:underline font-mono"
              >
                Order #{dispute.orderId.slice(-8).toUpperCase()}
              </Link>
              <span className="text-xs text-muted-foreground">
                {formatAmount(dispute.order.product.price)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Dispute description */}
      <div className="bg-surface rounded-xl border border-border p-6">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Your Complaint
        </h2>
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
          {dispute.description}
        </p>
      </div>

      {/* Evidence */}
      {evidence.length > 0 && (
        <div className="bg-surface rounded-xl border border-border p-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Your Evidence
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {evidence.map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative block rounded-lg overflow-hidden border border-border"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Evidence ${i + 1}`}
                  className="w-full h-24 object-cover group-hover:opacity-80 transition-opacity"
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Creator response */}
      {dispute.creatorResponse ? (
        <div className="bg-surface rounded-xl border border-border p-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Creator&apos;s Response
          </h2>
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
            {dispute.creatorResponse}
          </p>
        </div>
      ) : (
        <div className="bg-surface rounded-xl border border-border p-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Creator&apos;s Response
          </h2>
          <p className="text-sm text-muted-foreground italic">
            The creator has not responded yet.
          </p>
        </div>
      )}

      {/* Admin notes */}
      {dispute.adminNote && (
        <div className="bg-yellow-500/5 rounded-xl border border-yellow-500/20 p-6">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-sm font-semibold text-yellow-400 uppercase tracking-wide">
              Admin Note
            </h2>
          </div>
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
            {dispute.adminNote}
          </p>
        </div>
      )}

      {/* Resolution outcome */}
      {isResolved && (
        <div className="bg-green-500/5 rounded-xl border border-green-500/20 p-6">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-sm font-semibold text-green-400 uppercase tracking-wide">
              Resolution
            </h2>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Outcome</span>
              <span className="text-foreground font-medium">{statusLabel}</span>
            </div>
            {dispute.refundAmount != null && dispute.refundAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Refund Amount</span>
                <span className="text-green-400 font-bold">{formatAmount(dispute.refundAmount)}</span>
              </div>
            )}
            {dispute.resolvedAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Resolved On</span>
                <span className="text-foreground">{formatDate(dispute.resolvedAt)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Escrow timeline */}
      {dispute.order.escrowTransactions.length > 0 && (
        <div className="bg-surface rounded-xl border border-border p-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
            Escrow Timeline
          </h2>
          <div className="space-y-3">
            {dispute.order.escrowTransactions.map(txn => (
              <div key={txn.id} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        escrowTypeStyles[txn.type] ?? 'bg-muted/20 text-muted-foreground'
                      }`}
                    >
                      {escrowTypeLabels[txn.type] ?? txn.type}
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      {formatAmount(txn.amount)}
                    </span>
                  </div>
                  {txn.note && (
                    <p className="text-xs text-muted-foreground mt-0.5">{txn.note}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDateTime(txn.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer actions */}
      <div className="flex gap-3 flex-wrap">
        <Link
          href="/account/disputes"
          className="bg-background hover:bg-surface border border-border text-foreground rounded-lg px-4 py-2 text-sm font-medium"
        >
          Back to Disputes
        </Link>
        <Link
          href={`/account/orders/${dispute.orderId}`}
          className="bg-primary hover:bg-primary/90 text-white rounded-lg px-4 py-2 text-sm font-medium"
        >
          View Order
        </Link>
      </div>
    </div>
  )
}
