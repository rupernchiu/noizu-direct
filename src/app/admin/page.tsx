import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { TrendingRecalcButton } from './TrendingRecalcButton'
import { RecommendationsRecomputeButton } from './RecommendationsRecomputeButton'
import { TRENDING_CONFIG } from '@/lib/trendingConfig'

export default async function AdminOverviewPage() {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/')

  const [userCount, creatorCount, revenueAgg, pendingPayouts, recentOrders, topTrendingProducts, recPairCount, topRecPairs, cronHeartbeats] = await Promise.all([
    prisma.user.count(),
    prisma.creatorProfile.count(),
    prisma.transaction.aggregate({ where: { status: 'COMPLETED' }, _sum: { grossAmountUsd: true } }),
    prisma.payout.count({ where: { status: 'PENDING' } }),
    prisma.order.findMany({
      include: {
        buyer: { select: { name: true, email: true } },
        product: { select: { title: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.product.findMany({
      where: { isActive: true, isTrendingSuppressed: false },
      orderBy: { trendingScore: 'desc' },
      take: 10,
      select: { id: true, title: true, trendingScore: true, trendingUpdatedAt: true, trendingScoreRecord: { select: { breakdown: true, calculatedAt: true } } },
    }),
    prisma.productRecommendation.count(),
    prisma.productRecommendation.findMany({
      orderBy: { score: 'desc' },
      take: 10,
      select: {
        score: true,
        sharedBuyers: true,
        computedAt: true,
        sourceProduct: { select: { title: true } },
        recommendedProduct: { select: { title: true } },
      },
    }),
    prisma.cronHeartbeat.findMany({ orderBy: { cronName: 'asc' } }),
  ])

  const totalRevenue = revenueAgg._sum.grossAmountUsd ?? 0

  // Cron staleness thresholds (ms). If lastRanAt older than this, mark red.
  const cronStaleThresholdMs: Record<string, number> = {
    'escrow-processor': 2 * 60 * 60 * 1000,        // hourly → stale at 2h
    'payout': 8 * 24 * 60 * 60 * 1000,             // weekly → stale at 8d
    'storage-renewals': 2 * 60 * 60 * 1000,        // hourly → stale at 2h
    'support-renewals': 2 * 60 * 60 * 1000,        // hourly → stale at 2h
    'kyc-orphan-cleanup': 2 * 24 * 60 * 60 * 1000, // daily → stale at 2d
  }
  const cronNowMs = Date.now()

  const statusColors: Record<string, string> = {
    PENDING: 'bg-yellow-500/20 text-yellow-400',
    PAID: 'bg-blue-500/20 text-blue-400',
    PROCESSING: 'bg-orange-500/20 text-orange-400',
    SHIPPED: 'bg-purple-500/20 text-purple-400',
    COMPLETED: 'bg-green-500/20 text-green-400',
    CANCELLED: 'bg-red-500/20 text-red-400',
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-foreground">Overview</h2>

      <Link
        href="/admin/kb"
        className="block rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors p-4"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Business knowledgebase</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Full reference: what we do, how we operate, fee model, integrations, glossary. Hand to AI or onboard humans.
            </p>
          </div>
          <span className="text-xs font-semibold text-primary whitespace-nowrap">Open →</span>
        </div>
      </Link>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl p-4 border border-border">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Total Users</p>
          <p className="text-2xl font-bold text-foreground mt-1">{userCount}</p>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Creators</p>
          <p className="text-2xl font-bold text-foreground mt-1">{creatorCount}</p>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Total Revenue</p>
          <p className="text-2xl font-bold text-foreground mt-1">${(totalRevenue / 100).toFixed(2)}</p>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Pending Payouts</p>
          <p className="text-2xl font-bold text-destructive mt-1">{pendingPayouts}</p>
        </div>
      </div>

      {/* Cron Health */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Cron Health</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Money-moving jobs &mdash; red = past expected interval</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm [&_td]:whitespace-nowrap">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">Job</th>
                <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">Last Ran</th>
                <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">Status</th>
                <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">Duration</th>
                <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">Runs / Failures</th>
                <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">Last Error</th>
              </tr>
            </thead>
            <tbody>
              {cronHeartbeats.map((hb) => {
                const ageMs = cronNowMs - new Date(hb.lastRanAt).getTime()
                const threshold = cronStaleThresholdMs[hb.cronName] ?? 24 * 60 * 60 * 1000
                const isStale = ageMs > threshold
                const ageLabel =
                  ageMs < 60_000 ? `${Math.round(ageMs / 1000)}s ago` :
                  ageMs < 3_600_000 ? `${Math.round(ageMs / 60_000)}m ago` :
                  ageMs < 86_400_000 ? `${Math.round(ageMs / 3_600_000)}h ago` :
                  `${Math.round(ageMs / 86_400_000)}d ago`
                const statusClass = !hb.lastSucceeded
                  ? 'bg-red-500/20 text-red-400'
                  : isStale
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-green-500/20 text-green-400'
                const statusLabel = !hb.lastSucceeded ? 'FAILED' : isStale ? 'STALE' : 'OK'
                return (
                  <tr key={hb.cronName} className="border-b border-border last:border-0 hover:bg-surface">
                    <td className="px-3 py-1.5 text-foreground font-mono text-xs">{hb.cronName}</td>
                    <td className="px-3 py-1.5 text-muted-foreground text-xs">{ageLabel}</td>
                    <td className="px-3 py-1.5">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusClass}`}>{statusLabel}</span>
                    </td>
                    <td className="px-3 py-1.5 text-muted-foreground text-xs">{hb.lastDurationMs}ms</td>
                    <td className="px-3 py-1.5 text-muted-foreground text-xs">
                      {hb.totalRuns.toLocaleString()} / <span className={hb.totalFailures > 0 ? 'text-red-400' : ''}>{hb.totalFailures}</span>
                    </td>
                    <td className="px-3 py-1.5 text-muted-foreground text-xs truncate max-w-[280px]">{hb.lastError ?? '—'}</td>
                  </tr>
                )
              })}
              {cronHeartbeats.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                    No cron runs recorded yet. Heartbeats appear after the first invocation of an instrumented job.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Recent Orders</h3>
          <Link href="/admin/orders" className="text-xs text-primary hover:underline">View all</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm [&_td]:whitespace-nowrap">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">Order ID</th>
                <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">Buyer</th>
                <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">Product</th>
                <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">Amount</th>
                <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">Status</th>
                <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => (
                <tr key={order.id} className="border-b border-border last:border-0 hover:bg-surface">
                  <td className="px-3 py-1.5 text-muted-foreground font-mono text-xs">{order.id.slice(0, 8)}...</td>
                  <td className="px-3 py-1.5 text-foreground">{order.buyer.name}</td>
                  <td className="px-3 py-1.5 text-foreground">{order.product.title}</td>
                  <td className="px-3 py-1.5 text-foreground">${(order.amountUsd / 100).toFixed(2)}</td>
                  <td className="px-3 py-1.5">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[order.status] ?? 'bg-border text-muted-foreground'}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-muted-foreground text-xs">{new Date(order.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {recentOrders.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">No orders yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Trending Products */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Trending Products</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Algorithm v{TRENDING_CONFIG.version} · Window: {TRENDING_CONFIG.windowDays}d · Decay: {TRENDING_CONFIG.decayFactor}
            </p>
          </div>
          <TrendingRecalcButton />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm [&_td]:whitespace-nowrap">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">Rank</th>
                <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">Title</th>
                <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">Score</th>
                <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">Last Calculated</th>
              </tr>
            </thead>
            <tbody>
              {topTrendingProducts.map((product, i) => (
                <tr key={product.id} className="border-b border-border last:border-0 hover:bg-surface">
                  <td className="px-3 py-1.5 text-muted-foreground font-mono text-xs">#{i + 1}</td>
                  <td className="px-3 py-1.5 text-foreground">{product.title}</td>
                  <td className="px-3 py-1.5 text-foreground font-mono text-xs">{product.trendingScore.toFixed(2)}</td>
                  <td className="px-3 py-1.5 text-muted-foreground text-xs">
                    {product.trendingScoreRecord?.calculatedAt
                      ? new Date(product.trendingScoreRecord.calculatedAt).toLocaleString()
                      : '—'}
                  </td>
                </tr>
              ))}
              {topTrendingProducts.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">No trending data yet. Run recalculation.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Co-Purchase Recommendations</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{recPairCount.toLocaleString()} pairs computed</p>
          </div>
          <RecommendationsRecomputeButton />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm [&_td]:whitespace-nowrap">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">Source</th>
                <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">Recommended</th>
                <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">Score</th>
                <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">Shared Buyers</th>
                <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">Computed</th>
              </tr>
            </thead>
            <tbody>
              {topRecPairs.map((pair, i) => (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-surface">
                  <td className="px-3 py-1.5 text-foreground text-xs truncate max-w-[160px]">{pair.sourceProduct.title}</td>
                  <td className="px-3 py-1.5 text-foreground text-xs truncate max-w-[160px]">{pair.recommendedProduct.title}</td>
                  <td className="px-3 py-1.5 text-foreground font-mono text-xs">{pair.score.toFixed(3)}</td>
                  <td className="px-3 py-1.5 text-muted-foreground text-xs">{pair.sharedBuyers}</td>
                  <td className="px-3 py-1.5 text-muted-foreground text-xs">
                    {new Date(pair.computedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {topRecPairs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">No recommendation data yet. Run recomputation.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
