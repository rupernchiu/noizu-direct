import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { ArrowLeft } from 'lucide-react'
import { STATUS_LABELS, TYPE_LABELS } from '@/lib/labels'
import { CommissionActions } from './CommissionActions'

const statusStyles: Record<string, string> = {
  PENDING:    'bg-yellow-500/20 text-yellow-400',
  PAID:       'bg-blue-500/20 text-blue-400',
  PROCESSING: 'bg-orange-500/20 text-orange-400',
  SHIPPED:    'bg-primary/20 text-primary',
  DELIVERED:  'bg-primary/20 text-primary',
  COMPLETED:  'bg-secondary/20 text-secondary',
  CANCELLED:  'bg-red-500/20 text-red-400',
  REFUNDED:   'bg-muted-foreground/20 text-muted-foreground',
}

const commissionStatusLabels: Record<string, string> = {
  PENDING_ACCEPTANCE: 'Awaiting your acceptance',
  ACCEPTED:           'Accepted — in progress',
  REVISION_REQUESTED: 'Revision requested',
  DELIVERED:          'Delivered — awaiting buyer',
  COMPLETED:          'Completed',
}

function formatDateTime(date: Date | null): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function parseJsonArray<T = unknown>(s: string | null): T[] {
  if (!s) return []
  try { return JSON.parse(s) as T[] } catch { return [] }
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')
  if ((session.user as { role?: string }).role !== 'CREATOR') redirect('/')
  const userId = (session.user as { id: string }).id
  const { id } = await params

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      buyer:   { select: { name: true, email: true } },
      product: { select: { title: true, type: true, commissionRevisionsIncluded: true, commissionTurnaroundDays: true } },
    },
  })

  if (!order) notFound()
  if (order.creatorId !== userId) redirect('/dashboard/orders')

  const isCommission = order.product.type === 'COMMISSION'
  const referenceImages = parseJsonArray<string>(order.commissionReferenceImages)
  const deliveryFiles = parseJsonArray<string>(order.commissionDeliveryFiles)
  const revisionsAllowed = order.commissionRevisionsAllowed ?? order.product.commissionRevisionsIncluded ?? 0
  const revisionsUsed = order.commissionRevisionsUsed ?? 0

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link
          href="/dashboard/orders"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to orders
        </Link>
        <h1 className="text-2xl font-bold text-foreground mt-2">
          Order #{order.id.slice(-8).toUpperCase()}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Placed {formatDateTime(order.createdAt)}
        </p>
      </div>

      <div className="bg-surface rounded-xl border border-border p-5 space-y-4">
        <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Buyer</p>
            <p className="text-foreground font-medium">{order.buyer?.name ?? 'Unknown'}</p>
            <p className="text-xs text-muted-foreground">{order.buyer?.email ?? ''}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Product</p>
            <p className="text-foreground">{order.product?.title ?? '—'}</p>
            <p className="text-xs text-muted-foreground">{TYPE_LABELS[order.product?.type ?? ''] ?? order.product?.type}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Amount</p>
            <p className="text-foreground">${(order.amountUsd / 100).toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Order status</p>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[order.status] ?? 'bg-muted-foreground/20 text-muted-foreground'}`}>
              {STATUS_LABELS[order.status] ?? order.status}
            </span>
          </div>
          {order.escrowStatus && (
            <div>
              <p className="text-xs text-muted-foreground">Escrow</p>
              <p className="text-foreground text-sm">{order.escrowStatus}</p>
            </div>
          )}
        </div>
      </div>

      {isCommission && (
        <div className="bg-surface rounded-xl border border-border p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Commission</h2>
            <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
              {commissionStatusLabels[order.commissionStatus ?? ''] ?? order.commissionStatus ?? '—'}
            </span>
          </div>

          {order.commissionBriefText && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Brief</p>
              <p className="text-sm text-foreground whitespace-pre-wrap bg-card border border-border rounded-lg p-3">
                {order.commissionBriefText}
              </p>
            </div>
          )}

          {referenceImages.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Reference images ({referenceImages.length})</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {referenceImages.map((src, i) => (
                  <a key={i} href={src} target="_blank" rel="noopener noreferrer" className="block aspect-square rounded-lg overflow-hidden bg-card border border-border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`Reference ${i + 1}`} className="w-full h-full object-cover" />
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Deposit</p>
              <p className="text-foreground">
                {order.commissionDepositAmount != null
                  ? `$${(order.commissionDepositAmount / 100).toFixed(2)} (${order.commissionDepositPercent ?? 0}%)`
                  : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Revisions</p>
              <p className="text-foreground">{revisionsUsed} / {revisionsAllowed}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Accept by</p>
              <p className="text-foreground text-xs">{formatDateTime(order.commissionAcceptDeadlineAt)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Turnaround</p>
              <p className="text-foreground">{order.product.commissionTurnaroundDays ?? '—'} days</p>
            </div>
          </div>

          {deliveryFiles.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Delivered files ({deliveryFiles.length})</p>
              <ul className="space-y-1">
                {deliveryFiles.map((f, i) => (
                  <li key={i} className="text-sm text-foreground bg-card border border-border rounded-lg px-3 py-2 truncate">
                    {f}
                  </li>
                ))}
              </ul>
              {order.commissionDeliveredAt && (
                <p className="text-xs text-muted-foreground mt-2">
                  Delivered {formatDateTime(order.commissionDeliveredAt)}
                </p>
              )}
            </div>
          )}

          <CommissionActions
            orderId={order.id}
            commissionStatus={order.commissionStatus ?? ''}
            acceptDeadlineAt={order.commissionAcceptDeadlineAt?.toISOString() ?? null}
          />
        </div>
      )}

      {!isCommission && order.shippingAddress && (
        <div className="bg-surface rounded-xl border border-border p-5">
          <h2 className="text-lg font-semibold text-foreground mb-3">Shipping</h2>
          <p className="text-sm text-foreground whitespace-pre-wrap">{order.shippingAddress}</p>
          {order.trackingNumber && (
            <p className="text-sm text-muted-foreground mt-2">Tracking: {order.trackingNumber}</p>
          )}
        </div>
      )}
    </div>
  )
}
