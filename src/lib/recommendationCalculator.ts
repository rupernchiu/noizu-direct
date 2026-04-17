import { prisma } from '@/lib/prisma'

export interface RecommendationResult {
  pairs: number
  productsProcessed: number
  computedAt: string
}

export async function computeRecommendations(): Promise<RecommendationResult> {
  const windowStart = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

  // Fetch all released orders in last 90 days
  const orders = await prisma.order.findMany({
    where: { escrowStatus: 'RELEASED', createdAt: { gte: windowStart } },
    select: { buyerId: true, productId: true },
  })

  // Group by buyer → set of productIds
  const buyerProducts = new Map<string, Set<string>>()
  for (const { buyerId, productId } of orders) {
    if (!buyerProducts.has(buyerId)) buyerProducts.set(buyerId, new Set())
    buyerProducts.get(buyerId)!.add(productId)
  }

  // Count total buyers per product
  const productBuyerCount = new Map<string, number>()
  for (const products of buyerProducts.values()) {
    for (const pid of products) {
      productBuyerCount.set(pid, (productBuyerCount.get(pid) ?? 0) + 1)
    }
  }

  // Count shared buyers per pair
  const pairShared = new Map<string, number>()
  for (const products of buyerProducts.values()) {
    const pids = [...products]
    for (let i = 0; i < pids.length; i++) {
      for (let j = i + 1; j < pids.length; j++) {
        const key = pids[i] < pids[j] ? `${pids[i]}|${pids[j]}` : `${pids[j]}|${pids[i]}`
        pairShared.set(key, (pairShared.get(key) ?? 0) + 1)
      }
    }
  }

  // Build recommendation rows (both directions) for pairs with >= 2 shared buyers
  type Row = { sourceProductId: string; recommendedProductId: string; score: number; sharedBuyers: number; computedAt: Date }
  const allRows: Row[] = []
  const now = new Date()

  for (const [key, shared] of pairShared) {
    if (shared < 2) continue
    const [a, b] = key.split('|')
    const totalA = productBuyerCount.get(a) ?? 1
    const totalB = productBuyerCount.get(b) ?? 1
    const score = shared / (Math.sqrt(totalA) * Math.sqrt(totalB))
    allRows.push({ sourceProductId: a, recommendedProductId: b, score, sharedBuyers: shared, computedAt: now })
    allRows.push({ sourceProductId: b, recommendedProductId: a, score, sharedBuyers: shared, computedAt: now })
  }

  // Replace all existing recommendations atomically
  await prisma.$transaction(async (tx) => {
    await tx.productRecommendation.deleteMany()
  })

  // Insert in batches of 100
  const BATCH_SIZE = 100
  const totalBatches = Math.ceil(allRows.length / BATCH_SIZE)

  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const batch = allRows.slice(batchIndex * BATCH_SIZE, (batchIndex + 1) * BATCH_SIZE)
    try {
      await prisma.productRecommendation.createMany({ data: batch, skipDuplicates: true })
    } catch (err) {
      console.error(`Recommendations batch ${batchIndex + 1}/${totalBatches} failed:`, err)
    }
    console.log(`Recommendations batch ${batchIndex + 1}/${totalBatches} complete`)
    if (batchIndex < totalBatches - 1) await new Promise(r => setTimeout(r, 100))
  }

  return {
    pairs: Math.floor(allRows.length / 2),
    productsProcessed: productBuyerCount.size,
    computedAt: now.toISOString(),
  }
}
