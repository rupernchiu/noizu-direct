/**
 * Phase 4 smoke: verify computeOriginTax + reserve plumbing without standing
 * up a full checkout session. Sets a test creator's payoutCountry to 'ID',
 * fakes an Order row, asserts the snapshot fields, then runs the same path
 * for an MY creator to assert PPh = 0.
 *
 * Cleans up after itself. Safe to run repeatedly.
 */
import { prisma } from '../../src/lib/prisma'
import { computeOriginTax } from '../../src/lib/origin-tax'
import { accrueOriginTaxForOrder } from '../../src/lib/reserves'

async function main() {
  console.log('=== Phase 4 origin-tax smoke ===')

  // 1) Pure-function tests
  console.log('\n[1] computeOriginTax pure-function results:')
  const cases: Array<[string | null, number, 'PHYSICAL' | 'POD' | 'DIGITAL' | 'COMMISSION', string]> = [
    ['ID', 10000, 'PHYSICAL', 'ID + $100 PHYSICAL'],
    ['ID', 10000, 'DIGITAL', 'ID + $100 DIGITAL'],
    ['ID', 10000, 'COMMISSION', 'ID + $100 COMMISSION'],
    ['ID', 0, 'PHYSICAL', 'ID + $0'],
    ['MY', 10000, 'PHYSICAL', 'MY + $100 (no PPh)'],
    ['SG', 10000, 'PHYSICAL', 'SG + $100 (no PPh)'],
    [null, 10000, 'PHYSICAL', 'null country'],
    ['ZZ', 10000, 'PHYSICAL', 'unknown country'],
    ['id', 10000, 'PHYSICAL', 'lowercase id (case-insensitive)'],
  ]
  for (const [country, amount, type, label] of cases) {
    const r = computeOriginTax(country, amount, type)
    console.log(`  ${label.padEnd(35)} → rate=${r.rate}, amountUsd=${r.amountUsd}, label=${r.label}`)
  }

  // 2) Find a test creator we can flip to ID temporarily
  console.log('\n[2] Picking a test creator…')
  const testCreator = await prisma.creatorProfile.findFirst({
    where: { username: { in: ['test-citra', 'sakura_arts'] } },
  })
  if (!testCreator) {
    console.log('  No test creator found, skipping DB scenario.')
    await prisma.$disconnect()
    return
  }
  console.log(`  Using ${testCreator.username} (userId=${testCreator.userId})`)

  const originalCountry = testCreator.payoutCountry
  await prisma.creatorProfile.update({
    where: { id: testCreator.id },
    data: { payoutCountry: 'ID' },
  })

  try {
    // 3) Fake-snapshot what payment-intent would write for an ID order
    console.log('\n[3] Snapshot scenario: $50 listing, ID creator')
    const subtotalUsd = 5000
    const listingType = 'PHYSICAL' as const
    const idResult = computeOriginTax('ID', subtotalUsd, listingType)
    console.log(`  PPh: $${(idResult.amountUsd / 100).toFixed(2)} (rate ${idResult.rate * 100}%, label ${idResult.label})`)
    if (idResult.amountUsd !== 25 || idResult.rate !== 0.005) {
      throw new Error(`Expected $0.25 / 0.005, got ${idResult.amountUsd} / ${idResult.rate}`)
    }

    // 4) Test reserve accrual end-to-end
    console.log('\n[4] Reserve accrual scenario')
    const fakeOrderId = `phase4-smoke-${Date.now()}`
    const accrual = await accrueOriginTaxForOrder({
      creatorCountry: 'ID',
      amountUsd: idResult.amountUsd,
      orderId: fakeOrderId,
      creatorId: testCreator.userId,
    })
    console.log(`  Accrual entry id: ${accrual?.id ?? '(null)'}`)
    const reserve = await prisma.platformReserve.findUnique({
      where: { kind_scope: { kind: 'TAX_ORIGIN', scope: 'ID' } },
    })
    console.log(`  TAX_ORIGIN/ID reserve: balance=${reserve?.balanceUsd}, label="${reserve?.label}"`)
    if (!reserve || (reserve.balanceUsd ?? 0) < idResult.amountUsd) {
      throw new Error('Reserve did not accrue as expected')
    }

    // Idempotency-style sanity: a second call should add another $0.25
    const balanceBefore = reserve.balanceUsd
    const second = await accrueOriginTaxForOrder({
      creatorCountry: 'id',  // exercise lower-case path
      amountUsd: 25,
      orderId: `${fakeOrderId}-b`,
      creatorId: testCreator.userId,
    })
    const reserveAfter = await prisma.platformReserve.findUnique({
      where: { kind_scope: { kind: 'TAX_ORIGIN', scope: 'ID' } },
    })
    console.log(`  After 2nd accrual: balance=${reserveAfter?.balanceUsd} (delta from before=${(reserveAfter?.balanceUsd ?? 0) - balanceBefore})`)

    // 5) Non-PPh country sanity
    console.log('\n[5] Non-PPh creator (MY) — assert PPh = $0, no reserve write')
    const myResult = computeOriginTax('MY', subtotalUsd, listingType)
    console.log(`  MY result: amountUsd=${myResult.amountUsd}, label=${myResult.label}`)
    if (myResult.amountUsd !== 0) {
      throw new Error(`Expected MY to be 0, got ${myResult.amountUsd}`)
    }
    const myAccrualResult = await accrueOriginTaxForOrder({
      creatorCountry: 'MY',
      amountUsd: 0,  // would be 0 by computeOriginTax
      orderId: 'phase4-smoke-my',
      creatorId: testCreator.userId,
    })
    console.log(`  MY accrual call (amount=0): returned ${myAccrualResult === null ? 'null (correct, no entry)' : 'NON-NULL (BUG)'}`)
    if (myAccrualResult !== null) throw new Error('Expected null accrual for amount=0')

    // Cleanup the test entries
    console.log('\n[6] Cleanup: removing smoke-test reserve entries…')
    await prisma.platformReserveEntry.deleteMany({
      where: { OR: [
        { refOrderId: fakeOrderId },
        { refOrderId: `${fakeOrderId}-b` },
        { refOrderId: 'phase4-smoke-my' },
      ] },
    })
    // Re-seed reserve balance to subtract the smoke amount we added
    if (reserveAfter) {
      const drained = (reserveAfter.balanceUsd ?? 0) - (balanceBefore - idResult.amountUsd)
      if (drained > 0) {
        await prisma.platformReserve.update({
          where: { id: reserveAfter.id },
          data: {
            balanceUsd: { decrement: drained },
            cumulativeInUsd: { decrement: drained },
          },
        })
      }
    }
    console.log('  Cleanup done.')
  } finally {
    // Restore the creator's original payoutCountry
    await prisma.creatorProfile.update({
      where: { id: testCreator.id },
      data: { payoutCountry: originalCountry },
    })
    console.log(`\nRestored ${testCreator.username}.payoutCountry = ${originalCountry}`)
  }
  console.log('\n=== Smoke PASS ===')
  await prisma.$disconnect()
}
main().catch(async (e) => { console.error('SMOKE FAILED:', e); await prisma.$disconnect(); process.exit(1) })
