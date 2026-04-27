/**
 * Seed: Tax Architecture demo creators (Phase 9a).
 *
 * Creates four isolated creator scenarios so the new tax pages have realistic
 * data to render against:
 *
 *   A) MY individual         — 90% case, no tax fields populated (control)
 *   B) ID individual         — PPh-active, 0.5% creatorTaxAmountUsd withheld
 *   C) SG REQUESTED          — sales-tax pending review (no collection yet)
 *   D) SG APPROVED           — sales-tax active, GST 9% collected on orders
 *
 * Plus a buyer User (`tax-buyer-1@noizu.test`) shared by all scenarios.
 *
 * Run:  npm run seed:tax
 *
 * Idempotent — re-running upserts users by email, products/orders by stable
 * IDs derived from the scenario keys (e.g. `tax-seed-A-product`,
 * `tax-seed-A-order-1`). All test rows share the `tax-seed-` ID prefix and
 * `tax-*@noizu.test` email prefix to stay isolated from real seed data.
 *
 * Phase 9b will add Playwright tests that drive the tax pages against these
 * fixtures.
 */

import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '../../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { serializeShippingMap } from '../../src/lib/shipping'

const dbUrl = process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL!
const pool = new Pool({ connectionString: dbUrl })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter } as any)

// ─── Helpers ────────────────────────────────────────────────────────────────

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

function round(n: number): number {
  return Math.round(n)
}

const TOS_VERSION = '2026-04-27'

// Shipping rates for PHYSICAL test products: covers MY (domestic) + SEA Tier-1
// + a ROW fallback so any buyer country resolves successfully.
const TEST_SHIPPING = serializeShippingMap({
  MY: 250,   // RM~10
  SG: 700,
  PH: 800,
  ID: 800,
  TH: 800,
  BN: 900,
  ROW: 2500,
})

async function upsertUser(opts: {
  email: string
  name: string
  role: 'BUYER' | 'CREATOR' | 'ADMIN'
}) {
  const password = await bcrypt.hash('tax-seed-password', 10)
  return prisma.user.upsert({
    where: { email: opts.email },
    update: { name: opts.name, role: opts.role, password },
    create: {
      email: opts.email,
      name: opts.name,
      role: opts.role,
      password,
    },
  })
}

interface ProfileOpts {
  userId: string
  username: string
  displayName: string
  classification: 'INDIVIDUAL' | 'REGISTERED_BUSINESS'
  payoutCountry: string
  payoutRail?: 'LOCAL' | 'SWIFT' | 'PAYPAL'
  taxId?: string | null
  taxJurisdiction?: string | null
  collectsSalesTax?: boolean
  salesTaxRate?: number | null
  salesTaxLabel?: string | null
  salesTaxStatus?: 'NONE' | 'REQUESTED' | 'APPROVED' | 'REJECTED'
  salesTaxApprovedAt?: Date | null
  salesTaxApprovedBy?: string | null
  salesTaxCertificateUrl?: string | null
}

async function upsertCreatorProfile(opts: ProfileOpts) {
  const data = {
    userId: opts.userId,
    username: opts.username,
    displayName: opts.displayName,
    creatorClassification: opts.classification,
    taxOnboardingAcknowledgedAt: new Date(),
    taxOnboardingTosVersion: TOS_VERSION,
    onboardingCompleted: true,
    payoutCountry: opts.payoutCountry,
    payoutRail: opts.payoutRail ?? 'LOCAL',
    taxId: opts.taxId ?? null,
    taxJurisdiction: opts.taxJurisdiction ?? null,
    collectsSalesTax: opts.collectsSalesTax ?? false,
    salesTaxRate: opts.salesTaxRate ?? null,
    salesTaxLabel: opts.salesTaxLabel ?? null,
    salesTaxStatus: opts.salesTaxStatus ?? 'NONE',
    salesTaxApprovedAt: opts.salesTaxApprovedAt ?? null,
    salesTaxApprovedBy: opts.salesTaxApprovedBy ?? null,
    salesTaxCertificateUrl: opts.salesTaxCertificateUrl ?? null,
  }
  return prisma.creatorProfile.upsert({
    where: { userId: opts.userId },
    update: data,
    create: data,
  })
}

async function upsertProduct(opts: {
  id: string
  creatorProfileId: string
  title: string
  description: string
  priceUsdCents: number
}) {
  const data = {
    id: opts.id,
    creatorId: opts.creatorProfileId,
    title: opts.title,
    description: opts.description,
    price: opts.priceUsdCents,
    category: 'PHYSICAL_MERCH',
    type: 'PHYSICAL',
    images: JSON.stringify([`https://picsum.photos/seed/${opts.id}/600/600`]),
    isActive: true,
    shippingByCountry: TEST_SHIPPING,
  }
  return prisma.product.upsert({
    where: { id: opts.id },
    update: data,
    create: data,
  })
}

interface OrderOpts {
  id: string
  buyerId: string
  creatorUserId: string
  productId: string
  subtotalUsd: number
  shippingCostUsd: number
  buyerCountry: string
  creatorCountry: string
  daysAgo: number
  // Tax fields (default 0)
  creatorTaxAmountUsd?: number
  creatorTaxRatePercent?: number | null
  creatorSalesTaxAmountUsd?: number
  creatorSalesTaxRatePercent?: number | null
  creatorSalesTaxLabel?: string | null
  // Escrow status — RELEASED for past months, HELD for the most recent.
  escrowStatus?: 'HELD' | 'RELEASED' | 'TRACKING_ADDED' | 'PARTIALLY_REFUNDED'
}

async function upsertOrder(opts: OrderOpts) {
  const created = daysAgo(opts.daysAgo)
  const escrowStatus = opts.escrowStatus ?? 'RELEASED'
  // amountUsd is the full charge (subtotal + buyer fee + tax + shipping). For
  // the tax pages we only need the snapshot fields used by tax-statement.ts —
  // but amountUsd must be coherent for non-tax UI that reads it (admin views).
  // 5.5% buyer fee on a CARD-rail-aware order matches Phase F snapshots.
  const buyerFeeUsd = round(opts.subtotalUsd * 0.055)
  const creatorCommissionUsd = round(opts.subtotalUsd * 0.05) // 5% creator commission
  const amountUsd =
    opts.subtotalUsd +
    opts.shippingCostUsd +
    buyerFeeUsd +
    (opts.creatorSalesTaxAmountUsd ?? 0)

  const data = {
    id: opts.id,
    buyerId: opts.buyerId,
    creatorId: opts.creatorUserId,
    productId: opts.productId,
    status: escrowStatus === 'RELEASED' ? 'COMPLETED' : 'PAID',
    amountUsd,
    paymentRail: 'CARD',
    subtotalUsd: opts.subtotalUsd,
    shippingCostUsd: opts.shippingCostUsd,
    shippingDestinationCountry: opts.buyerCountry,
    buyerFeeUsd,
    creatorCommissionUsd,
    buyerCountry: opts.buyerCountry,
    creatorCountry: opts.creatorCountry,
    creatorTaxAmountUsd: opts.creatorTaxAmountUsd ?? 0,
    creatorTaxRatePercent: opts.creatorTaxRatePercent ?? null,
    creatorSalesTaxAmountUsd: opts.creatorSalesTaxAmountUsd ?? 0,
    creatorSalesTaxRatePercent: opts.creatorSalesTaxRatePercent ?? null,
    creatorSalesTaxLabel: opts.creatorSalesTaxLabel ?? null,
    escrowStatus,
    escrowHeldAt: created,
    escrowReleasedAt: escrowStatus === 'RELEASED' ? daysAgo(opts.daysAgo - 7) : null,
    createdAt: created,
    updatedAt: created,
  }
  return prisma.order.upsert({
    where: { id: opts.id },
    update: data,
    create: data,
  })
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('Seeding tax architecture fixtures...')

  // ── Buyer ──
  const buyer = await upsertUser({
    email: 'tax-buyer-1@noizu.test',
    name: 'Tax Test Buyer',
    role: 'BUYER',
  })
  console.log(`  buyer: ${buyer.email}`)

  // ── Find an existing admin to use as approver for Scenario D ──
  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
    select: { id: true, email: true },
  })
  if (!admin) {
    console.warn('  no ADMIN user found — Scenario D salesTaxApprovedBy will be null')
  }

  // ── Scenario A — MY individual (90% case) ──
  {
    const userA = await upsertUser({
      email: 'tax-my-individual@noizu.test',
      name: 'MY Individual Test',
      role: 'CREATOR',
    })
    const profileA = await upsertCreatorProfile({
      userId: userA.id,
      username: 'tax_my_individual',
      displayName: 'MY Individual Test',
      classification: 'INDIVIDUAL',
      payoutCountry: 'MY',
      payoutRail: 'LOCAL',
    })
    const productA = await upsertProduct({
      id: 'tax-seed-A-product',
      creatorProfileId: profileA.id,
      title: 'MY Test Sticker Pack',
      description: 'Tax fixture product (Scenario A — MY individual).',
      priceUsdCents: 2500,
    })
    // 3 orders across 3 months, no tax fields populated.
    const subtotals = [2500, 2200, 3000]
    for (let i = 0; i < 3; i++) {
      const days = 75 - i * 30 // ~2.5mo, ~1.5mo, ~0.5mo ago
      await upsertOrder({
        id: `tax-seed-A-order-${i + 1}`,
        buyerId: buyer.id,
        creatorUserId: userA.id,
        productId: productA.id,
        subtotalUsd: subtotals[i],
        shippingCostUsd: 500,
        buyerCountry: 'MY',
        creatorCountry: 'MY',
        daysAgo: days,
        escrowStatus: i === 2 ? 'HELD' : 'RELEASED',
      })
    }
    console.log(`  Scenario A (MY individual): ${userA.email} + 1 product + 3 orders`)
  }

  // ── Scenario B — ID individual (PPh-active) ──
  {
    const userB = await upsertUser({
      email: 'tax-id-individual@noizu.test',
      name: 'ID Individual Test',
      role: 'CREATOR',
    })
    const profileB = await upsertCreatorProfile({
      userId: userB.id,
      username: 'tax_id_individual',
      displayName: 'ID Individual Test',
      classification: 'INDIVIDUAL',
      payoutCountry: 'ID',
      payoutRail: 'LOCAL',
    })
    const productB = await upsertProduct({
      id: 'tax-seed-B-product',
      creatorProfileId: profileB.id,
      title: 'ID Test Art Print',
      description: 'Tax fixture product (Scenario B — ID individual w/ PPh).',
      priceUsdCents: 3000,
    })
    const subtotals = [3000, 3500, 2800]
    for (let i = 0; i < 3; i++) {
      const days = 75 - i * 30
      const subtotal = subtotals[i]
      await upsertOrder({
        id: `tax-seed-B-order-${i + 1}`,
        buyerId: buyer.id,
        creatorUserId: userB.id,
        productId: productB.id,
        subtotalUsd: subtotal,
        shippingCostUsd: 600,
        buyerCountry: 'MY', // mixed buyer country to exercise sales-by-country
        creatorCountry: 'ID',
        daysAgo: days,
        creatorTaxAmountUsd: round(subtotal * 0.005), // 0.5% PPh
        creatorTaxRatePercent: 0.5,
        escrowStatus: i === 2 ? 'HELD' : 'RELEASED',
      })
    }
    console.log(`  Scenario B (ID individual / PPh): ${userB.email} + 1 product + 3 orders`)
  }

  // ── Scenario C — SG REQUESTED (sales-tax pending review) ──
  {
    const userC = await upsertUser({
      email: 'tax-sg-pending@noizu.test',
      name: 'SG Pending Test',
      role: 'CREATOR',
    })
    const profileC = await upsertCreatorProfile({
      userId: userC.id,
      username: 'tax_sg_pending',
      displayName: 'SG Pending Test',
      classification: 'REGISTERED_BUSINESS',
      taxId: 'SG-GST-12345-X',
      taxJurisdiction: 'SG',
      payoutCountry: 'SG',
      payoutRail: 'LOCAL',
      collectsSalesTax: false,
      salesTaxStatus: 'REQUESTED',
      salesTaxRate: 0.09,
      salesTaxLabel: 'GST',
      salesTaxCertificateUrl: 'mock://test-cert.pdf',
    })
    const productC = await upsertProduct({
      id: 'tax-seed-C-product',
      creatorProfileId: profileC.id,
      title: 'SG Test Enamel Pin',
      description: 'Tax fixture product (Scenario C — SG REQUESTED).',
      priceUsdCents: 4000,
    })
    // 2 orders, no sales-tax populated (still pending).
    const subtotals = [4000, 4500]
    for (let i = 0; i < 2; i++) {
      const days = 60 - i * 30
      await upsertOrder({
        id: `tax-seed-C-order-${i + 1}`,
        buyerId: buyer.id,
        creatorUserId: userC.id,
        productId: productC.id,
        subtotalUsd: subtotals[i],
        shippingCostUsd: 700,
        buyerCountry: 'SG',
        creatorCountry: 'SG',
        daysAgo: days,
        // creatorSalesTax* all default to 0 — pending approval, no collection.
        escrowStatus: i === 1 ? 'HELD' : 'RELEASED',
      })
    }
    console.log(`  Scenario C (SG REQUESTED): ${userC.email} + 1 product + 2 orders`)
  }

  // ── Scenario D — SG APPROVED (sales-tax active) ──
  {
    const userD = await upsertUser({
      email: 'tax-sg-approved@noizu.test',
      name: 'SG Approved Test',
      role: 'CREATOR',
    })
    const profileD = await upsertCreatorProfile({
      userId: userD.id,
      username: 'tax_sg_approved',
      displayName: 'SG Approved Test',
      classification: 'REGISTERED_BUSINESS',
      taxId: 'SG-GST-67890-Y',
      taxJurisdiction: 'SG',
      payoutCountry: 'SG',
      payoutRail: 'LOCAL',
      collectsSalesTax: true,
      salesTaxStatus: 'APPROVED',
      salesTaxRate: 0.09,
      salesTaxLabel: 'GST',
      salesTaxApprovedAt: daysAgo(7),
      salesTaxApprovedBy: admin?.id ?? null,
      salesTaxCertificateUrl: 'mock://approved-cert.pdf',
    })
    const productD = await upsertProduct({
      id: 'tax-seed-D-product',
      creatorProfileId: profileD.id,
      title: 'SG Test Acrylic Stand',
      description: 'Tax fixture product (Scenario D — SG APPROVED).',
      priceUsdCents: 5000,
    })
    const subtotals = [5000, 4800, 5500]
    for (let i = 0; i < 3; i++) {
      const days = 75 - i * 30
      const subtotal = subtotals[i]
      const shipping = 700
      const salesTax = round((subtotal + shipping) * 0.09)
      await upsertOrder({
        id: `tax-seed-D-order-${i + 1}`,
        buyerId: buyer.id,
        creatorUserId: userD.id,
        productId: productD.id,
        subtotalUsd: subtotal,
        shippingCostUsd: shipping,
        buyerCountry: 'SG',
        creatorCountry: 'SG',
        daysAgo: days,
        creatorSalesTaxAmountUsd: salesTax,
        creatorSalesTaxRatePercent: 0.09,
        creatorSalesTaxLabel: 'GST',
        escrowStatus: i === 2 ? 'HELD' : 'RELEASED',
      })
    }
    console.log(`  Scenario D (SG APPROVED): ${userD.email} + 1 product + 3 orders`)
  }

  // ── Verification counts ──
  const creatorCount = await prisma.user.count({
    where: { email: { startsWith: 'tax-' }, role: 'CREATOR' },
  })
  const orderCount = await prisma.order.count({
    where: { id: { startsWith: 'tax-seed-' } },
  })
  const productCount = await prisma.product.count({
    where: { id: { startsWith: 'tax-seed-' } },
  })
  console.log(
    `\nDone. tax-seed creators=${creatorCount} products=${productCount} orders=${orderCount}`,
  )
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
