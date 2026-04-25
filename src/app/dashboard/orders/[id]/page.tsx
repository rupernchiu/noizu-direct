import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { ArrowLeft } from 'lucide-react'
import { STATUS_LABELS, TYPE_LABELS } from '@/lib/labels'
import { CommissionActions } from './CommissionActions'
import { MilestoneCreatorActions } from './MilestoneCreatorActions'
import { TrackingForm } from './TrackingForm'
import { getTrackingUrl, getCourierName } from '@/lib/courier-tracking'

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

const milestoneStatusLabels: Record<string, string> = {
  PENDING:            'Not started',
  IN_PROGRESS:        'In progress',
  DELIVERED:          'Delivered — awaiting buyer',
  APPROVED:           'Approved',
  REVISION_REQUESTED: 'Revision requested',
  COMPLETED:          'Paid out',
  REFUNDED:           'Refunded',
}

const milestoneStatusStyles: Record<string, string> = {
  PENDING:            'bg-muted text-muted-foreground',
  IN_PROGRESS:        'bg-yellow-500/20 text-yellow-400',
  DELIVERED:          'bg-blue-500/20 text-blue-400',
  APPROVED:           'bg-primary/20 text-primary',
  REVISION_REQUESTED: 'bg-orange-500/20 text-orange-400',
  COMPLETED:          'bg-secondary/20 text-secondary',
  REFUNDED:           'bg-red-500/20 text-red-400',
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
      milestones: { orderBy: { order: 'asc' } },
    },
  })

  if (!order) notFound()
  if (order.creatorId !== userId) redirect('/dashboard/orders')

  const isCommission = order.product.type === 'COMMISSION'
  const isMilestone = order.commissionIsMilestoneBased === true
  const referenceImages = parseJsonArray<string>(order.commissionReferenceImages)
  const deliveryFiles = parseJsonArray<string>(order.commissionDeliveryFiles)
  const revisionsAllowed = order.commissionRevisionsAllowed ?? order.product.commissionRevisionsIncluded ?? 0
  const revisionsUsed = order.commissionRevisionsUsed ?? 0
  const escrowFunded = order.status === 'PAID' || order.status === 'PROCESSING' || order.status === 'SHIPPED' || order.status === 'DELIVERED' || order.status === 'COMPLETED'

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
            {!isMilestone && (
              <div>
                <p className="text-xs text-muted-foreground">Deposit</p>
                <p className="text-foreground">
                  {order.commissionDepositAmount != null
                    ? `$${(order.commissionDepositAmount / 100).toFixed(2)} (${order.commissionDepositPercent ?? 0}%)`
                    : '—'}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">Revisions</p>
              <p className="text-foreground">{revisionsUsed} / {revisionsAllowed}</p>
            </div>
            {!isMilestone && (
              <div>
                <p className="text-xs text-muted-foreground">Accept by</p>
                <p className="text-foreground text-xs">{formatDateTime(order.commissionAcceptDeadlineAt)}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">Turnaround</p>
              <p className="text-foreground">{order.product.commissionTurnaroundDays ?? '—'} days</p>
            </div>
            {isMilestone && (
              <div>
                <p className="text-xs text-muted-foreground">Structure</p>
                <p className="text-foreground">{order.milestones.length} milestones</p>
              </div>
            )}
          </div>

          {!isMilestone && deliveryFiles.length > 0 && (
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

          {!isMilestone && (
            <CommissionActions
              orderId={order.id}
              commissionStatus={order.commissionStatus ?? ''}
              acceptDeadlineAt={order.commissionAcceptDeadlineAt?.toISOString() ?? null}
            />
          )}
        </div>
      )}

      {isCommission && isMilestone && (
        <div className="bg-surface rounded-xl border border-border p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Milestones</h2>
            <p className="text-xs text-muted-foreground">
              {escrowFunded ? 'Escrow funded — deliver each milestone to release payment.' : 'Awaiting payment from buyer.'}
            </p>
          </div>
          <div className="space-y-3">
            {order.milestones.map((m, i) => {
              const mFiles = parseJsonArray<{ key?: string; filename?: string } | string>(m.deliveryFiles)
              return (
                <div key={m.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        {i + 1}. {m.title}
                      </p>
                      {m.description && (
                        <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{m.description}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-foreground">${(m.amountUsd / 100).toFixed(2)}</p>
                      <span className={`inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${milestoneStatusStyles[m.status] ?? 'bg-muted text-muted-foreground'}`}>
                        {milestoneStatusLabels[m.status] ?? m.status}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                    <span>Revisions: {m.revisionsUsed}/{m.revisionsAllowed}</span>
                    {m.deliveredAt && <span>Delivered {formatDateTime(m.deliveredAt)}</span>}
                    {m.autoReleaseAt && m.status === 'DELIVERED' && (
                      <span>Auto-releases {formatDateTime(m.autoReleaseAt)}</span>
                    )}
                    {m.releasedAt && <span>Paid out {formatDateTime(m.releasedAt)}</span>}
                  </div>

                  {m.revisionNote && m.status === 'REVISION_REQUESTED' && (
                    <div className="text-xs text-foreground bg-orange-500/5 border border-orange-500/30 rounded-lg p-2 whitespace-pre-wrap">
                      <span className="font-medium text-orange-400">Revision request:</span> {m.revisionNote}
                    </div>
                  )}

                  {mFiles.length > 0 && (
                    <ul className="space-y-1">
                      {mFiles.map((f, fi) => {
                        const label = typeof f === 'string' ? f : (f.filename ?? f.key ?? '')
                        return (
                          <li key={fi} className="text-xs text-foreground bg-background border border-border rounded-lg px-2.5 py-1.5 truncate">
                            {label}
                          </li>
                        )
                      })}
                    </ul>
                  )}

                  {escrowFunded && (
                    <MilestoneCreatorActions milestoneId={m.id} status={m.status} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!isCommission && order.shippingAddress && (
        <div className="bg-surface rounded-xl border border-border p-5">
          <h2 className="text-lg font-semibold text-foreground mb-3">Shipping address</h2>
          <p className="text-sm text-foreground whitespace-pre-wrap">{order.shippingAddress}</p>
        </div>
      )}

      {!isCommission && (order.product?.type === 'PHYSICAL' || order.product?.type === 'POD') && escrowFunded && (
        <TrackingForm
          orderId={order.id}
          productType={order.product.type}
          isPod={order.product.type === 'POD'}
          trackingNumber={order.trackingNumber}
          courierCode={order.courierCode}
          courierName={order.courierCode ? getCourierName(order.courierCode) : order.courierName}
          estimatedDelivery={order.estimatedDelivery}
          trackingAddedAt={order.trackingAddedAt}
          trackingUrl={
            order.courierCode && order.trackingNumber
              ? getTrackingUrl(order.courierCode, order.trackingNumber)
              : null
          }
          escrowStatus={order.escrowStatus}
          escrowAutoReleaseAt={order.escrowAutoReleaseAt}
        />
      )}
    </div>
  )
}
