import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Plus, ShoppingBag, DollarSign, Ticket } from 'lucide-react'
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

  let profile = await prisma.creatorProfile.findUnique({ where: { userId } })
  if (!profile) {
    // Try to recover: create a minimal profile from application or user data
    const [user, application] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true, avatar: true } }),
      prisma.creatorApplication.findUnique({ where: { userId }, select: { username: true, displayName: true, bio: true, categoryTags: true } }),
    ])
    const baseUsername = (application?.username || user?.email?.split('@')[0] || 'creator').toLowerCase().replace(/[^a-z0-9_]/g, '')
    // Ensure username uniqueness
    let username = baseUsername
    let suffix = 1
    while (await prisma.creatorProfile.findUnique({ where: { username } })) {
      username = `${baseUsername}${suffix++}`
    }
    try {
      profile = await prisma.creatorProfile.create({
        data: {
          userId,
          username,
          displayName: application?.displayName || user?.name || username,
          bio: application?.bio ?? null,
          avatar: user?.avatar ?? null,
          categoryTags: application?.categoryTags ?? '[]',
        },
      })
    } catch {
      return (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
          <p className="text-foreground font-semibold">Store setup incomplete</p>
          <p className="text-muted-foreground text-sm max-w-sm">Your creator store hasn&apos;t been fully set up. Please contact support so we can resolve this.</p>
          <a href="mailto:hello@noizu.direct" className="text-sm text-primary hover:underline">hello@noizu.direct</a>
        </div>
      )
    }
  }

  const { computeUnreadTicketCount } = await import('@/lib/tickets')
  const [totalRevenue, pendingOrders, activeListings, unreadMessages, creatorApp, userRow] = await Promise.all([
    prisma.transaction.aggregate({
      where: { creatorId: userId, status: 'COMPLETED' },
      _sum: { creatorAmount: true },
    }),
    prisma.order.count({ where: { creatorId: userId, status: 'PENDING' } }),
    prisma.product.count({ where: { creatorId: profile.id, isActive: true } }),
    computeUnreadTicketCount(userId),
    prisma.creatorApplication.findUnique({
      where: { userId },
      select: { status: true, rejectionReason: true, submittedAt: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { payoutFrozen: true, payoutFrozenReason: true },
    }),
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

  // ── Payout-readiness banner ─────────────────────────────────────────────────
  // Surfaces KYC + payout-method state so creators understand why earnings
  // are or aren't payable. Order matters: payout-frozen wins, then KYC state,
  // then missing payout details. Only one banner renders at a time.
  type BannerTone = 'red' | 'amber' | 'blue' | 'green'
  let banner: { tone: BannerTone; title: string; body: string; cta?: { label: string; href: string } } | null = null
  const appStatus = creatorApp?.status ?? 'DRAFT'

  if (userRow?.payoutFrozen) {
    banner = {
      tone: 'red',
      title: 'Payouts are paused on your account',
      body: userRow.payoutFrozenReason || 'Please contact support to resolve this so future earnings can be paid out.',
      cta: { label: 'Contact support', href: '/dashboard/tickets/new' },
    }
  } else if (appStatus === 'REJECTED') {
    banner = {
      tone: 'red',
      title: 'Your KYC application was rejected',
      body: creatorApp?.rejectionReason || 'Review the rejection reason and resubmit to unlock payouts.',
      cta: { label: 'Resubmit application', href: '/start-selling' },
    }
  } else if (appStatus === 'DRAFT') {
    banner = {
      tone: 'amber',
      title: 'Finish your creator application to receive payouts',
      body: 'You can list products and accept orders, but earnings are held in escrow until KYC is approved.',
      cta: { label: 'Resume application', href: '/start-selling' },
    }
  } else if (appStatus === 'SUBMITTED' || appStatus === 'UNDER_REVIEW') {
    banner = {
      tone: 'blue',
      title: 'KYC submitted — under review',
      body: 'We typically review applications within 1–3 business days. Earnings continue to accumulate and will be paid out once approved.',
    }
  } else if (appStatus === 'APPROVED' && !profile.payoutDetails) {
    banner = {
      tone: 'amber',
      title: 'Add your payout details',
      body: 'Your KYC is approved, but we need a payout destination before we can release earnings.',
      cta: { label: 'Set up payouts', href: '/dashboard/earnings/payout' },
    }
  }

  const bannerStyles: Record<BannerTone, { bg: string; border: string; text: string; cta: string }> = {
    red:   { bg: 'bg-red-500/10',    border: 'border-red-500/30',    text: 'text-red-700 dark:text-red-300',       cta: 'bg-red-500 hover:bg-red-500/90 text-white' },
    amber: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-800 dark:text-yellow-200', cta: 'bg-yellow-500 hover:bg-yellow-500/90 text-black' },
    blue:  { bg: 'bg-blue-500/10',   border: 'border-blue-500/30',   text: 'text-blue-800 dark:text-blue-200',     cta: 'bg-blue-500 hover:bg-blue-500/90 text-white' },
    green: { bg: 'bg-green-500/10',  border: 'border-green-500/30',  text: 'text-green-800 dark:text-green-200',   cta: 'bg-green-500 hover:bg-green-500/90 text-white' },
  }

  // Compute onboarding steps. Tax qualification is the gating step for the
  // rest of the storefront setup (Phase 3 of the 2026-04-27 tax architecture
  // build). Surfacing it as the first item keeps the existing checklist UX
  // working without forcing a redirect-once gate at the layout level.
  const taxOnboardingDone = !!(profile as any).taxOnboardingAcknowledgedAt
  const onboardingSteps = [
    { id: 'tax', label: 'Complete tax qualification', completed: taxOnboardingDone, href: '/dashboard/onboarding/tax' },
    { id: 'avatar', label: 'Add profile photo', completed: !!profile.avatar, href: '/dashboard/profile' },
    { id: 'banner', label: 'Add banner image', completed: !!profile.bannerImage, href: '/dashboard/profile' },
    { id: 'bio', label: 'Write your bio', completed: !!(profile.bio && profile.bio.length > 20), href: '/dashboard/profile' },
    { id: 'social', label: 'Add social links', completed: !!(profile.socialLinks && profile.socialLinks !== '{}' && profile.socialLinks !== 'null'), href: '/dashboard/profile' },
    { id: 'product', label: 'List your first product', completed: activeListings > 0, href: '/dashboard/listings/new' },
    { id: 'profile', label: 'Complete store profile', completed: !!(profile.displayName && profile.username), href: '/dashboard/profile' },
  ]
  const allOnboardingComplete = onboardingSteps.every(s => s.completed)

  return (
    <div className="space-y-8">
      {/* Payout-readiness banner */}
      {banner && (
        <div className={`rounded-xl border ${bannerStyles[banner.tone].bg} ${bannerStyles[banner.tone].border} px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3`}>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold ${bannerStyles[banner.tone].text}`}>{banner.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{banner.body}</p>
          </div>
          {banner.cta && (
            <Link
              href={banner.cta.href}
              className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${bannerStyles[banner.tone].cta}`}
            >
              {banner.cta.label}
            </Link>
          )}
        </div>
      )}

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
          { label: 'Tickets', href: '/dashboard/tickets', icon: Ticket, color: 'bg-card text-foreground border border-border hover:border-primary/30' },
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
      <OnboardingChecklistWrapper steps={onboardingSteps} allComplete={allOnboardingComplete} dismissed={profile.onboardingDismissed} />

      {/* Recent orders */}
      <div>
        <div className="flex items-center justify-between mb-3">
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
          <>
            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {recentOrders.map((order) => (
                <div key={order.id} className="bg-surface rounded-xl border border-border p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground font-semibold text-sm truncate">{order.product?.title ?? '—'}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {order.buyer?.name ?? 'Unknown'} · {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0 ${statusStyles[order.status as OrderStatus] ?? 'bg-muted-foreground/20 text-muted-foreground'}`}>
                      {STATUS_LABELS[order.status] ?? order.status}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-border">
                    <span className="text-foreground font-semibold text-sm">${order.amountUsd.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop table */}
            <div className="hidden md:block bg-surface rounded-xl border border-border overflow-hidden">
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
            </div>
          </>
        )}
      </div>
    </div>
  )
}
