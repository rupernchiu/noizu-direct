import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { STATUS_LABELS } from '@/lib/labels'
import { Pagination } from '@/components/ui/Pagination'

const PER_PAGE = 25

function statusColor(s: string) {
  if (s === 'OPEN') return '#ef4444'
  if (s === 'UNDER_REVIEW') return '#f97316'
  if (s.startsWith('RESOLVED')) return '#22c55e'
  return 'var(--muted-foreground)'
}

function daysOpen(d: Date): number {
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
}

function getDisputeUrgency(createdAt: Date): { label: string; colorClass: string } {
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24))
  if (days < 1) return { label: '< 1 day', colorClass: 'bg-success/10 text-success border-success/20' }
  if (days < 2) return { label: `${days} day`, colorClass: 'bg-warning/10 text-warning border-warning/20' }
  if (days < 3) return { label: `${days} days`, colorClass: 'bg-orange-500/10 text-orange-400 border-orange-500/20' }
  return { label: `${days} days`, colorClass: 'bg-destructive/10 text-destructive border-destructive/20' }
}

export default async function AdminDisputesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const session = await auth()
  const user = session?.user as { id?: string; role?: string } | undefined
  if (user?.role !== 'ADMIN') redirect('/login')

  const { page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)

  const [total, openCount, disputes] = await Promise.all([
    prisma.dispute.count(),
    prisma.dispute.count({ where: { status: 'OPEN' } }),
    prisma.dispute.findMany({
      include: {
        order: {
          include: {
            product: { select: { title: true, type: true } },
            buyer: { select: { name: true, email: true } },
            creator: { select: { name: true } },
          },
        },
        raiser: { select: { name: true } },
      },
      orderBy: { createdAt: 'asc' },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
  ])

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Disputes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{openCount} open · {total} total</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
              {['Order', 'Product', 'Buyer', 'Creator', 'Reason', 'Status', 'Age', 'Days Open', ''].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {disputes.length === 0 && (
              <tr><td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: 'var(--muted-foreground)' }}>No disputes yet</td></tr>
            )}
            {disputes.map(d => {
              const days = daysOpen(d.createdAt)
              const urgent = d.status === 'OPEN' && days >= 2
              return (
                <tr key={d.id} style={{ borderBottom: '1px solid var(--border)', background: urgent ? 'rgba(239,68,68,0.04)' : 'transparent' }}>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: '12px', color: 'var(--foreground)' }}>#{d.orderId.slice(-8).toUpperCase()}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--foreground)', maxWidth: '180px' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{d.order.product.title}</span>
                    <span style={{ fontSize: '11px', color: 'var(--muted-foreground)' }}>{d.order.product.type}</span>
                  </td>
                  <td style={{ padding: '10px 14px', color: 'var(--foreground)' }}>{d.order.buyer.name}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--foreground)' }}>{d.order.creator.name}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--foreground)' }}>{d.reason.replace(/_/g, ' ')}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: statusColor(d.status), background: `${statusColor(d.status)}18`, padding: '2px 8px', borderRadius: '10px' }}>
                      {STATUS_LABELS[d.status] ?? d.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {(() => {
                      const urgency = getDisputeUrgency(d.createdAt)
                      return (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${urgency.colorClass}`}>
                          {urgency.label}
                        </span>
                      )
                    })()}
                  </td>
                  <td style={{ padding: '10px 14px', color: urgent ? '#ef4444' : 'var(--foreground)', fontWeight: urgent ? 700 : 400 }}>{days}d</td>
                  <td style={{ padding: '10px 14px' }}>
                    <Link href={`/admin/disputes/${d.id}`} style={{ fontSize: '12px', color: '#7c3aed', textDecoration: 'none', fontWeight: 600 }}>View →</Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Pagination total={total} page={page} perPage={PER_PAGE} />
    </div>
  )
}
