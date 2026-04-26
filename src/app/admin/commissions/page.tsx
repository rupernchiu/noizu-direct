import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { FileText, Briefcase, Layers } from 'lucide-react'

export const metadata = { title: 'Admin · Commissions' }

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

export default async function AdminCommissionsPage() {
  const session = await auth()
  const user = session?.user as { role?: string } | undefined
  if (user?.role !== 'ADMIN') redirect('/login')

  const now = new Date()
  const [
    requestCounts,
    quoteCounts,
    milestoneAgg,
    recentRequests,
    activeQuotes,
    liveMilestoneOrders,
  ] = await Promise.all([
    prisma.commissionRequest.groupBy({ by: ['status'], _count: true }),
    prisma.commissionQuote.groupBy({ by: ['status'], _count: true }),
    prisma.commissionMilestone.aggregate({
      where: { status: 'DELIVERED', releasedAt: null },
      _sum: { amountUsd: true },
      _count: true,
    }),
    prisma.commissionRequest.findMany({
      orderBy: { createdAt: 'desc' },
      take: 25,
      include: {
        buyer: { select: { name: true, email: true } },
        creator: { select: { username: true, user: { select: { name: true } } } },
      },
    }),
    prisma.commissionQuote.findMany({
      where: { status: { in: ['SENT', 'ACCEPTED'] } },
      orderBy: { sentAt: 'desc' },
      take: 25,
      include: {
        buyer: { select: { name: true } },
        creator: { select: { username: true, user: { select: { name: true } } } },
        order: { select: { id: true, escrowStatus: true } },
      },
    }),
    prisma.order.findMany({
      where: { commissionIsMilestoneBased: true, escrowStatus: { in: ['HELD', 'DISPUTED'] } },
      orderBy: { createdAt: 'desc' },
      take: 25,
      include: {
        buyer: { select: { name: true } },
        creator: { select: { name: true } },
        milestones: { orderBy: { order: 'asc' } },
      },
    }),
  ])

  const rc = Object.fromEntries(requestCounts.map(r => [r.status, r._count])) as Record<string, number>
  const qc = Object.fromEntries(quoteCounts.map(q => [q.status, q._count])) as Record<string, number>

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Commissions</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Oversight of all commission requests, quotes, and milestone-based orders across the platform.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <FileText className="w-5 h-5 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Requests</h2>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Pending</span><span className="text-foreground">{rc.PENDING ?? 0}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Quoted</span><span className="text-foreground">{rc.QUOTED ?? 0}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Accepted</span><span className="text-foreground">{rc.ACCEPTED ?? 0}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Declined</span><span className="text-foreground">{rc.DECLINED ?? 0}</span></div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <Briefcase className="w-5 h-5 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Quotes</h2>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Draft</span><span className="text-foreground">{qc.DRAFT ?? 0}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Sent</span><span className="text-foreground">{qc.SENT ?? 0}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Accepted</span><span className="text-foreground">{qc.ACCEPTED ?? 0}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Rejected</span><span className="text-foreground">{qc.REJECTED ?? 0}</span></div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <Layers className="w-5 h-5 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Milestones in escrow</h2>
          </div>
          <p className="text-2xl font-bold text-foreground">{fmt(milestoneAgg._sum.amountUsd ?? 0)}</p>
          <p className="text-xs text-muted-foreground mt-1">{milestoneAgg._count} delivered awaiting approval</p>
        </div>
      </div>

      <section>
        <h2 className="text-lg font-semibold text-foreground mb-3">Recent requests</h2>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm [&_td]:whitespace-nowrap">
            <thead className="bg-muted text-left">
              <tr>
                <th className="px-3 py-1.5 text-muted-foreground font-medium">Title</th>
                <th className="px-3 py-1.5 text-muted-foreground font-medium">Buyer</th>
                <th className="px-3 py-1.5 text-muted-foreground font-medium">Creator</th>
                <th className="px-3 py-1.5 text-muted-foreground font-medium">Status</th>
                <th className="px-3 py-1.5 text-muted-foreground font-medium">Expires</th>
                <th className="px-3 py-1.5"></th>
              </tr>
            </thead>
            <tbody>
              {recentRequests.length === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No requests yet.</td></tr>
              )}
              {recentRequests.map(r => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-3 py-1.5 text-foreground">{r.title}</td>
                  <td className="px-3 py-1.5 text-muted-foreground">{r.buyer.name ?? r.buyer.email}</td>
                  <td className="px-3 py-1.5 text-muted-foreground">{r.creator.user.name ?? r.creator.username}</td>
                  <td className="px-3 py-1.5"><span className="text-xs px-2 py-0.5 rounded bg-muted text-foreground">{r.status}</span></td>
                  <td className="px-3 py-1.5 text-muted-foreground">{r.expiresAt.toISOString().slice(0, 10)}</td>
                  <td className="px-3 py-1.5 text-right">
                    <Link href={`/admin/commissions/requests/${r.id}`} className="text-primary hover:underline">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground mb-3">Active quotes</h2>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm [&_td]:whitespace-nowrap">
            <thead className="bg-muted text-left">
              <tr>
                <th className="px-3 py-1.5 text-muted-foreground font-medium">Title</th>
                <th className="px-3 py-1.5 text-muted-foreground font-medium">Creator → Buyer</th>
                <th className="px-3 py-1.5 text-muted-foreground font-medium">Amount</th>
                <th className="px-3 py-1.5 text-muted-foreground font-medium">Type</th>
                <th className="px-3 py-1.5 text-muted-foreground font-medium">Status</th>
                <th className="px-3 py-1.5"></th>
              </tr>
            </thead>
            <tbody>
              {activeQuotes.length === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No active quotes.</td></tr>
              )}
              {activeQuotes.map(q => (
                <tr key={q.id} className="border-t border-border">
                  <td className="px-3 py-1.5 text-foreground">{q.title}</td>
                  <td className="px-3 py-1.5 text-muted-foreground">
                    {q.creator.user.name ?? q.creator.username} → {q.buyer.name ?? ''}
                  </td>
                  <td className="px-3 py-1.5 text-foreground">{fmt(q.amountUsd)}</td>
                  <td className="px-3 py-1.5 text-muted-foreground">{q.isMilestoneBased ? 'Milestone' : 'Single'}</td>
                  <td className="px-3 py-1.5"><span className="text-xs px-2 py-0.5 rounded bg-muted text-foreground">{q.status}</span></td>
                  <td className="px-3 py-1.5 text-right">
                    {q.order ? (
                      <Link href={`/admin/orders/${q.order.id}`} className="text-primary hover:underline">Order</Link>
                    ) : (
                      <Link href={`/admin/commissions/quotes/${q.id}`} className="text-primary hover:underline">View</Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground mb-3">Milestone-based orders in progress</h2>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm [&_td]:whitespace-nowrap">
            <thead className="bg-muted text-left">
              <tr>
                <th className="px-3 py-1.5 text-muted-foreground font-medium">Order</th>
                <th className="px-3 py-1.5 text-muted-foreground font-medium">Buyer → Creator</th>
                <th className="px-3 py-1.5 text-muted-foreground font-medium">Amount</th>
                <th className="px-3 py-1.5 text-muted-foreground font-medium">Progress</th>
                <th className="px-3 py-1.5"></th>
              </tr>
            </thead>
            <tbody>
              {liveMilestoneOrders.length === 0 && (
                <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No active milestone orders.</td></tr>
              )}
              {liveMilestoneOrders.map(o => {
                const released = o.milestones.filter(m => m.releasedAt).length
                return (
                  <tr key={o.id} className="border-t border-border">
                    <td className="px-3 py-1.5 text-foreground">#{o.id.slice(-8).toUpperCase()}</td>
                    <td className="px-3 py-1.5 text-muted-foreground">{o.buyer.name ?? ''} → {o.creator.name ?? ''}</td>
                    <td className="px-3 py-1.5 text-foreground">{fmt(o.amountUsd)}</td>
                    <td className="px-3 py-1.5 text-muted-foreground">
                      {released} / {o.milestones.length} released
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <Link href={`/admin/orders/${o.id}`} className="text-primary hover:underline">View</Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
