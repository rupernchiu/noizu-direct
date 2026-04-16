import { prisma } from '@/lib/prisma'
import { TRENDING_CONFIG } from '@/lib/trendingConfig'

export async function calculateTrending() {
  const now = new Date()
  const windowStart = new Date(now.getTime() - TRENDING_CONFIG.windowDays * 24 * 60 * 60 * 1000)

  const products = await prisma.product.findMany({
    where: { isActive: true, isTrendingSuppressed: false },
    select: { id: true, manualBoost: true, creator: { select: { userId: true } } },
  })

  let updated = 0

  for (const product of products) {
    const creatorUserId = product.creator.userId
    const [orders_7d, wishlist_7d, cart_7d, views_7d] = await Promise.all([
      prisma.order.count({ where: { productId: product.id, createdAt: { gte: windowStart }, escrowStatus: 'RELEASED' } }),
      prisma.wishlistItem.count({ where: { productId: product.id, addedAt: { gte: windowStart } } }),
      prisma.cartItem.count({ where: { productId: product.id, addedAt: { gte: windowStart } } }),
      prisma.productView.count({ where: { productId: product.id, createdAt: { gte: windowStart }, NOT: { userId: creatorUserId } } }),
    ])

    const raw =
      orders_7d  * TRENDING_CONFIG.weights.orders +
      wishlist_7d * TRENDING_CONFIG.weights.wishlist +
      cart_7d    * TRENDING_CONFIG.weights.cart +
      views_7d   * TRENDING_CONFIG.weights.views

    const [latestOrder, latestWishlist, latestCart, latestView] = await Promise.all([
      prisma.order.findFirst({ where: { productId: product.id }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
      prisma.wishlistItem.findFirst({ where: { productId: product.id }, orderBy: { addedAt: 'desc' }, select: { addedAt: true } }),
      prisma.cartItem.findFirst({ where: { productId: product.id }, orderBy: { addedAt: 'desc' }, select: { addedAt: true } }),
      prisma.productView.findFirst({ where: { productId: product.id }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
    ])

    const timestamps = [
      latestOrder?.createdAt,
      latestWishlist?.addedAt,
      latestCart?.addedAt,
      latestView?.createdAt,
    ].filter((t): t is Date => t != null)

    const mostRecent = timestamps.length > 0
      ? new Date(Math.max(...timestamps.map(t => t.getTime())))
      : now

    const daysSinceActivity = Math.max(0, (now.getTime() - mostRecent.getTime()) / (24 * 60 * 60 * 1000))
    const decayedScore = raw * Math.pow(TRENDING_CONFIG.decayFactor, daysSinceActivity)
    const manualBoost = product.manualBoost
    const finalScore = decayedScore + manualBoost

    const breakdown = {
      orders_7d,
      wishlist_7d,
      cart_7d,
      views_7d,
      raw,
      decay_applied: daysSinceActivity,
      manualBoost,
      final: finalScore,
      version: TRENDING_CONFIG.version,
    }

    await prisma.$transaction([
      prisma.productTrendingScore.upsert({
        where: { productId: product.id },
        update: {
          version: TRENDING_CONFIG.version,
          score: finalScore,
          breakdown: JSON.stringify(breakdown),
          calculatedAt: now,
        },
        create: {
          productId: product.id,
          version: TRENDING_CONFIG.version,
          score: finalScore,
          breakdown: JSON.stringify(breakdown),
          calculatedAt: now,
        },
      }),
      prisma.product.update({
        where: { id: product.id },
        data: {
          trendingScore: finalScore,
          trendingVersion: TRENDING_CONFIG.version,
          trendingUpdatedAt: now,
        },
      }),
    ])

    updated++
  }

  return {
    processed: products.length,
    updated,
    version: TRENDING_CONFIG.version,
    calculatedAt: now.toISOString(),
  }
}
