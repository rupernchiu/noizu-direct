/**
 * Fee model segregation report.
 *
 * Buckets every Order in the database into one of:
 *   - rail-aware:   has paymentRail + subtotalUsd + buyerFeeUsd + creatorCommissionUsd
 *   - legacy-flat:  pre-sprint-0.1 orders that still rely on the 2.5% feeFromGross
 *                   path in the webhook
 *   - partial:      one or more rail-aware columns set but not all (data corruption
 *                   indicator — a write that crashed mid-flight)
 *
 * For each bucket reports row count, gross USD, the rail breakdown, and the
 * date range. The legacy bucket is the migration backlog: anything created
 * after the rail-aware launch should be zero. The partial bucket should
 * always be zero — non-zero means an integrity issue worth investigating.
 *
 * Mirrors what the admin Treasury / Insights pages assume so the team can
 * eyeball whether reported revenue lines up with the underlying ledger.
 *
 * Usage:  npx tsx scripts/fee-segregation-report.ts
 */

import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const dbUrl = process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL!
const pool = new Pool({ connectionString: dbUrl })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter } as any)

function fmtUsd(cents: number): string {
  return `USD ${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

async function main() {
  const orders = await prisma.order.findMany({
    select: {
      id: true,
      amountUsd: true,
      paymentRail: true,
      subtotalUsd: true,
      buyerFeeUsd: true,
      creatorCommissionUsd: true,
      createdAt: true,
      status: true,
    },
  })

  type Bucket = {
    count: number
    gross: number
    minDate: Date | null
    maxDate: Date | null
    railCounts: Map<string, number>
    statusCounts: Map<string, number>
    sampleIds: string[]
  }
  const fresh = (): Bucket => ({
    count: 0,
    gross: 0,
    minDate: null,
    maxDate: null,
    railCounts: new Map(),
    statusCounts: new Map(),
    sampleIds: [],
  })
  const railAware = fresh()
  const legacyFlat = fresh()
  const partial = fresh()

  for (const o of orders) {
    const flags = [
      o.paymentRail != null,
      o.subtotalUsd != null,
      o.buyerFeeUsd != null,
      o.creatorCommissionUsd != null,
    ]
    const railCount = flags.filter(Boolean).length
    let bucket: Bucket
    if (railCount === 4) bucket = railAware
    else if (railCount === 0) bucket = legacyFlat
    else bucket = partial

    bucket.count++
    bucket.gross += o.amountUsd
    if (!bucket.minDate || o.createdAt < bucket.minDate) bucket.minDate = o.createdAt
    if (!bucket.maxDate || o.createdAt > bucket.maxDate) bucket.maxDate = o.createdAt

    const railKey = o.paymentRail ?? '(null)'
    bucket.railCounts.set(railKey, (bucket.railCounts.get(railKey) ?? 0) + 1)
    bucket.statusCounts.set(o.status, (bucket.statusCounts.get(o.status) ?? 0) + 1)

    if (bucket.sampleIds.length < 5) bucket.sampleIds.push(o.id)
  }

  function printBucket(name: string, b: Bucket): void {
    console.log(`\n── ${name} ──────────────────────────────────`)
    console.log(`  rows:   ${b.count}`)
    console.log(`  gross:  ${fmtUsd(b.gross)}`)
    if (b.minDate && b.maxDate) {
      console.log(`  range:  ${b.minDate.toISOString().slice(0, 10)} → ${b.maxDate.toISOString().slice(0, 10)}`)
    }
    if (b.railCounts.size > 0) {
      const railLine = Array.from(b.railCounts.entries())
        .sort((a, c) => c[1] - a[1])
        .map(([r, n]) => `${r}=${n}`)
        .join(' ')
      console.log(`  rails:  ${railLine}`)
    }
    if (b.statusCounts.size > 0) {
      const statusLine = Array.from(b.statusCounts.entries())
        .sort((a, c) => c[1] - a[1])
        .map(([s, n]) => `${s}=${n}`)
        .join(' ')
      console.log(`  status: ${statusLine}`)
    }
    if (b.sampleIds.length > 0) {
      console.log(`  ids:    ${b.sampleIds.join(', ')}${b.count > b.sampleIds.length ? ', …' : ''}`)
    }
  }

  console.log('═══════════════════════════════════════════════════')
  console.log('  Fee-model segregation report')
  console.log(`  Generated: ${new Date().toISOString()}`)
  console.log(`  Total orders: ${orders.length}`)
  console.log('═══════════════════════════════════════════════════')

  printBucket('Rail-aware (5/5.5/8 model)', railAware)
  printBucket('Legacy flat-fee (pre-sprint 0.1)', legacyFlat)
  printBucket('PARTIAL — data integrity flag', partial)

  if (partial.count > 0) {
    console.log('\n⚠  PARTIAL bucket non-empty — investigate the listed order ids.')
    console.log('   Likely cause: a write crashed between setting subtotalUsd and')
    console.log('   creatorCommissionUsd. The webhook will treat these as legacy')
    console.log('   (feeFromGross at 2.5%), so the buyer paid full new-model fees')
    console.log('   but the ledger was reconstructed at the old rate.')
  }

  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
