/**
 * Phase 8 smoke: verify creator-sales-tax + platform-fee-tax helpers without
 * standing up a full checkout. Three scenarios mirror spec §11 expectations:
 *
 *   1. Everything off (default at launch). All four new tax fields = 0.
 *   2. APPROVED REGISTERED_BUSINESS creator → SST 6% line populates.
 *   3. PlatformSettings.platformFeeTax flipped on for MY → buyer + creator
 *      sides both populate.
 *
 * Cleans up after itself. Safe to run repeatedly.
 */
import { prisma } from '../../src/lib/prisma'
import {
  computeCreatorSalesTax,
  computePlatformFeeTax,
  loadPlatformFeeTaxRules,
} from '../../src/lib/platform-fee-tax'

interface Cleanup {
  description: string
  run: () => Promise<void>
}
const cleanup: Cleanup[] = []

function assertEq(actual: unknown, expected: unknown, label: string) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}`)
  if (!ok) {
    console.log(`        expected: ${JSON.stringify(expected)}`)
    console.log(`        actual:   ${JSON.stringify(actual)}`)
    process.exitCode = 1
  }
}

async function main() {
  console.log('=== Phase 8 buyer-receipt + platform-fee-tax smoke ===')

  // ── Pure-function tests (no DB) ───────────────────────────────────────────
  console.log('\n[1] computeCreatorSalesTax — gating')
  // All five gates pass:
  assertEq(
    computeCreatorSalesTax(
      {
        creatorClassification: 'REGISTERED_BUSINESS',
        taxId: 'SST-1234567',
        collectsSalesTax: true,
        salesTaxStatus: 'APPROVED',
        salesTaxRate: 0.06,
        salesTaxLabel: 'SST',
      },
      2000,
      500,
    ),
    { rate: 0.06, amountUsd: 150, label: 'SST' },
    'all gates pass → 6% on (2000+500) = 150',
  )
  // INDIVIDUAL classification fails:
  assertEq(
    computeCreatorSalesTax(
      {
        creatorClassification: 'INDIVIDUAL',
        taxId: 'SST-1234567',
        collectsSalesTax: true,
        salesTaxStatus: 'APPROVED',
        salesTaxRate: 0.06,
        salesTaxLabel: 'SST',
      },
      2000,
      500,
    ),
    { rate: 0, amountUsd: 0, label: null },
    'INDIVIDUAL classification → 0',
  )
  // Missing taxId fails:
  assertEq(
    computeCreatorSalesTax(
      {
        creatorClassification: 'REGISTERED_BUSINESS',
        taxId: null,
        collectsSalesTax: true,
        salesTaxStatus: 'APPROVED',
        salesTaxRate: 0.06,
        salesTaxLabel: 'SST',
      },
      2000,
      500,
    ),
    { rate: 0, amountUsd: 0, label: null },
    'no taxId → 0',
  )
  // Status REQUESTED (not APPROVED) fails:
  assertEq(
    computeCreatorSalesTax(
      {
        creatorClassification: 'REGISTERED_BUSINESS',
        taxId: 'SST-1234567',
        collectsSalesTax: true,
        salesTaxStatus: 'REQUESTED',
        salesTaxRate: 0.06,
        salesTaxLabel: 'SST',
      },
      2000,
      500,
    ),
    { rate: 0, amountUsd: 0, label: null },
    'salesTaxStatus=REQUESTED → 0',
  )
  // collectsSalesTax false fails:
  assertEq(
    computeCreatorSalesTax(
      {
        creatorClassification: 'REGISTERED_BUSINESS',
        taxId: 'SST-1234567',
        collectsSalesTax: false,
        salesTaxStatus: 'APPROVED',
        salesTaxRate: 0.06,
        salesTaxLabel: 'SST',
      },
      2000,
      500,
    ),
    { rate: 0, amountUsd: 0, label: null },
    'collectsSalesTax=false → 0',
  )

  console.log('\n[2] computePlatformFeeTax — pure function')
  const rules = {
    MY: { enabled: true, rate: 0.06, label: 'SST', sides: ['BUYER' as const, 'CREATOR' as const] },
    SG: { enabled: true, rate: 0.09, label: 'GST', sides: ['BUYER' as const] },
    PH: { enabled: false, rate: 0.12, label: 'VAT', sides: ['BUYER' as const, 'CREATOR' as const] },
  }
  // MY buyer side on $2.50 fee = 15c
  assertEq(
    computePlatformFeeTax(rules, 'BUYER', 'MY', 250),
    { rate: 0.06, amountUsd: 15, label: 'SST' },
    'MY BUYER side on 250c → 15c',
  )
  // MY creator side on $1 commission = 6c
  assertEq(
    computePlatformFeeTax(rules, 'CREATOR', 'my', 100),
    { rate: 0.06, amountUsd: 6, label: 'SST' },
    'MY CREATOR side, lowercase iso2 → 6c',
  )
  // SG buyer-only — creator side returns 0
  assertEq(
    computePlatformFeeTax(rules, 'CREATOR', 'SG', 200),
    { rate: 0, amountUsd: 0, label: null },
    'SG creator side (BUYER-only rule) → 0',
  )
  // PH disabled
  assertEq(
    computePlatformFeeTax(rules, 'BUYER', 'PH', 250),
    { rate: 0, amountUsd: 0, label: null },
    'PH disabled rule → 0',
  )
  // null country
  assertEq(
    computePlatformFeeTax(rules, 'BUYER', null, 250),
    { rate: 0, amountUsd: 0, label: null },
    'null country → 0',
  )
  // Unknown country
  assertEq(
    computePlatformFeeTax(rules, 'BUYER', 'XX', 250),
    { rate: 0, amountUsd: 0, label: null },
    'unknown country → 0',
  )

  // ── Scenario 3: end-to-end via PlatformSettings ───────────────────────────
  console.log('\n[3] loadPlatformFeeTaxRules — default empty')
  const settings = await prisma.platformSettings.findFirst({ select: { platformFeeTax: true } })
  const previousJson = settings?.platformFeeTax ?? '{}'
  const initialRules = await loadPlatformFeeTaxRules()
  console.log(`  Initial rules from DB: ${JSON.stringify(initialRules)}`)
  if (Object.keys(initialRules).length === 0) {
    console.log('  PASS  default-empty platformFeeTax → no rules loaded')
  } else {
    console.log(
      `  INFO  platformFeeTax has ${Object.keys(initialRules).length} pre-existing rules (will restore after test)`,
    )
  }

  console.log('\n[4] Flip MY rule on temporarily')
  await prisma.platformSettings.updateMany({
    data: {
      platformFeeTax: JSON.stringify({
        MY: { enabled: true, rate: 0.06, label: 'SST', sides: ['BUYER', 'CREATOR'] },
      }),
    },
  })
  cleanup.push({
    description: 'restore platformFeeTax JSON',
    run: async () => {
      await prisma.platformSettings.updateMany({ data: { platformFeeTax: previousJson } })
    },
  })
  const liveRules = await loadPlatformFeeTaxRules()
  console.log(`  Loaded: ${JSON.stringify(liveRules)}`)
  assertEq(liveRules['MY']?.enabled, true, 'MY rule loaded enabled')
  assertEq(liveRules['MY']?.rate, 0.06, 'MY rule rate = 0.06')
  assertEq(liveRules['MY']?.label, 'SST', 'MY rule label = SST')
  assertEq(liveRules['MY']?.sides, ['BUYER', 'CREATOR'], 'MY rule sides = both')

  // Realistic order shape: $20 listing + $2.50 service fee, MY buyer
  const buyerFeeTax = computePlatformFeeTax(liveRules, 'BUYER', 'MY', 250)
  const creatorCommissionTax = computePlatformFeeTax(liveRules, 'CREATOR', 'MY', 100)
  assertEq(buyerFeeTax.amountUsd, 15, 'sample MY buyer fee tax = 15c')
  assertEq(creatorCommissionTax.amountUsd, 6, 'sample MY creator commission tax = 6c')

  // ── Scenario 5: APPROVED creator profile state ────────────────────────────
  console.log('\n[5] Find a creator we can flip to APPROVED REGISTERED_BUSINESS')
  const testCreator = await prisma.creatorProfile.findFirst({
    where: { username: { in: ['test-citra', 'sakura_arts'] } },
    select: {
      id: true,
      username: true,
      creatorClassification: true,
      taxId: true,
      collectsSalesTax: true,
      salesTaxStatus: true,
      salesTaxRate: true,
      salesTaxLabel: true,
    },
  })

  if (!testCreator) {
    console.log('  SKIP  No test creator (test-citra | sakura_arts) found in DB.')
  } else {
    console.log(`  Selected: ${testCreator.username} (${testCreator.id})`)
    const before = { ...testCreator }
    cleanup.push({
      description: `restore creator ${testCreator.username} sales-tax state`,
      run: async () => {
        await prisma.creatorProfile.update({
          where: { id: testCreator.id },
          data: {
            creatorClassification: before.creatorClassification,
            taxId: before.taxId,
            collectsSalesTax: before.collectsSalesTax,
            salesTaxStatus: before.salesTaxStatus,
            salesTaxRate: before.salesTaxRate,
            salesTaxLabel: before.salesTaxLabel,
          },
        })
      },
    })

    await prisma.creatorProfile.update({
      where: { id: testCreator.id },
      data: {
        creatorClassification: 'REGISTERED_BUSINESS',
        taxId: 'TEST-SST-9999',
        collectsSalesTax: true,
        salesTaxStatus: 'APPROVED',
        salesTaxRate: 0.06,
        salesTaxLabel: 'SST',
      },
    })

    const flipped = await prisma.creatorProfile.findUnique({
      where: { id: testCreator.id },
      select: {
        creatorClassification: true,
        taxId: true,
        collectsSalesTax: true,
        salesTaxStatus: true,
        salesTaxRate: true,
        salesTaxLabel: true,
      },
    })
    if (!flipped) throw new Error('flipped creator profile vanished')

    const result = computeCreatorSalesTax(flipped, 2000, 500)
    console.log(`  computeCreatorSalesTax: ${JSON.stringify(result)}`)
    assertEq(result.rate, 0.06, 'rate = 0.06')
    assertEq(result.amountUsd, 150, 'amount = 6% × (2000+500) = 150c')
    assertEq(result.label, 'SST', 'label = SST')
  }

  // ── Verify scenario 1 (everything off) integration ────────────────────────
  console.log('\n[6] Scenario 1 — INDIVIDUAL creator, no flips, all four fields = 0')
  // Synthetic profile
  assertEq(
    computeCreatorSalesTax(
      {
        creatorClassification: 'INDIVIDUAL',
        taxId: null,
        collectsSalesTax: false,
        salesTaxStatus: 'NONE',
        salesTaxRate: null,
        salesTaxLabel: null,
      },
      2000,
      500,
    ).amountUsd,
    0,
    'INDIVIDUAL creator → creatorSalesTax = 0',
  )
  // No platform-fee tax rule for SG today
  assertEq(
    computePlatformFeeTax({}, 'BUYER', 'MY', 250).amountUsd,
    0,
    'empty rules map → buyer-side platform tax = 0',
  )

  console.log('\n=== Cleaning up ===')
  for (const c of cleanup.reverse()) {
    console.log(`  ${c.description}`)
    await c.run()
  }

  console.log('\n=== Done ===')
}

main()
  .catch(async (e) => {
    console.error('FAIL:', e)
    process.exitCode = 1
    for (const c of cleanup.reverse()) {
      try {
        await c.run()
      } catch (err) {
        console.error(`cleanup ${c.description} failed:`, err)
      }
    }
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
