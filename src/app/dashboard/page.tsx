import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Plus, ShoppingBag, DollarSign, MessageCircle } from 'lucide-react'
import { STATUS_LABELS } from '@/lib/labels'
import { OnboardingChecklistWrapper } from '@/components/ui/OnboardingChecklistWrapper'

type OrderStatus = 'PENDING' | 'PAID' | 'PROCESSING' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED'

const statusStyles: Record<OrderStatus, string> = {
  PENDING: 'bg-yellow-500/20 text-yellow-400',
  PAID: 'bg-blue-500/20 text-blue-400',
  PROCESSING: 'bg-orange-500/20 text-orange-400',
  SHIPPED: 'bg-primary/20 text-primary',
  COMPLETED: 'bg-secondary/20 text-secondary',
  CANCELLED: 'bg-red-500/20 text-red-400',
  REFUNDED: 'bg-muted-foreground/20 text-muted-foreground',
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date)
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if ((session.user as any).role !== 'CREATOR') redirect('/')
  const userId = (session.user as any).id

  const profile = await prisma.creatorProfile.findUnique({ where: { userId } })
  if (!profile) redirect('/')

  const [totalRevenue, pendingOrders, activeListings, unreadMessages] = await Promise.all([
    prisma.transaction.aggregate({
      where: { creatorId: userId, status: 'COMPLETED' },
      _sum: { creatorAmount: true },
    }),
    prisma.order.count({ where: { creatorId: userId, status: 'PENDING' } }),
    prisma.product.count({ where: { creatorId: profile.id, isActive: true } }),
    prisma.message.count({ where: { receiverId: userId, isRead: false } }),
  ])

  const recentOrders = await prisma.order.findMany({
    where: { creatorId: userId },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      buyer: { select: { name: true } },
      product: { select: { title: true } },
    },
  })

  const revenue = totalRevenue._sum.creatorAmount ?? 0

  const stats = [
    {
      label: 'Total Revenue',
      value: `$${revenue.toFixed(2)}`,
      color: 'text-secondary',
      bg: 'bg-secondary/10',
    },
    {
      label: 'Pending Orders',
      value: pendingOrders.toString(),
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
    },
    {
      label: 'Active Listings',
      value: activeListings.toString(),
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'Unread Messages',
      value: unreadMessages.toString(),
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
  ]

  // Compute onboarding steps
  const onboardingSteps = [
    { id: 'avatar', label: 'Add profile photo', completed: !!profile.avatar, href: '/dashboard/profile' },
    { id: 'banner', label: 'Add banner image', completed: !!profile.bannerImage, href: '/dashboard/profile' },
    { id: 'bio', label: 'Write your bio', completed: !!(profile.bio && profile.bio.length > 20), href: '/dashboard/profile' },
    { id: 'social', label: 'Add social links', completed: !!(profile.socialLinks && profile.socialLinks !== '{}' && profile.socialLinks !== 'null'), href: '/dashboard/profile' },
    { id: 'product', label: 'List your first product', completed: activeListings > 0, href: '/dashboard/listings/new' },
  ]
  const allOnboardingComplete = onboardingSteps.every(s => s.completed)

  return (
    <div className="space-y-8">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className={`rounded-xl border border-border p-4 ${s.bg}`}>
            <p className="text-xs font-medium text-muted-foreground mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Add Product', href: '/dashboard/listings/new', icon: Plus, color: 'bg-primary text-white' },
          { label: 'View Orders', href: '/dashboard/orders', icon: ShoppingBag, color: 'bg-card text-foreground border border-border hover:border-primary/30' },
          { label: 'Earnings', href: '/dashboard/earnings', icon: DollarSign, color: 'bg-card text-foreground border border-border hover:border-primary/30' },
          { label: 'Messages', href: '/dashboard/messages', icon: MessageCircle, color: 'bg-card text-foreground border border-border hover:border-primary/30' },
        ].map(action => {
          const Icon = action.icon
          return (
            <Link key={action.label} href={action.href}
              className={`rounded-xl px-4 py-3 flex items-center gap-2 font-medium text-sm transition-colors ${action.color}`}>
              <Icon className="size-4" />
              {action.label}
            </Link>
          )
        })}
      </div>

      {/* Onboarding checklist */}
      <OnboardingChecklistWrapper steps={onboardingSteps} allComplete={allOnboardingComplete} />

      {/* Recent orders */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Recent Orders</h2>
          <Link href="/dashboard/orders" className="text-xs text-primary hover:underline">
            View all
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <div className="bg-surface rounded-xl border border-border px-5 py-12 text-center">
            <ShoppingBag className="size-10 text-muted-foreground/40 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-foreground mb-1">No orders yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Orders will appear here when fans purchase your products.</p>
            <Link href="/dashboard/listings" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
              View your listings →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border">
                  <th className="px-5 py-3 text-left font-medium">Buyer</th>
                  <th className="px-5 py-3 text-left font-medium">Product</th>
                  <th className="px-5 py-3 text-left font-medium">Amount</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                  <th className="px-5 py-3 text-left font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} className="border-b border-border last:border-0 hover:bg-card/50">
                    <td className="px-5 py-3 text-foreground">{order.buyer?.name ?? 'Unknown'}</td>
                    <td className="px-5 py-3 text-muted-foreground truncate max-w-[160px]">
                      {order.product?.title ?? '—'}
                    </td>
                    <td className="px-5 py-3 text-foreground">
                      ${order.amountUsd.toFixed(2)}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          statusStyles[order.status as OrderStatus] ?? 'bg-muted-foreground/20 text-muted-foreground'
                        }`}
                      >
                        {STATUS_LABELS[order.status] ?? order.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{formatDate(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
