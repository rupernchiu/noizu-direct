/**
 * Seed test data for the KYC + disputes + private-file housekeeping flow.
 *
 * Creates 4 test users (all emails `test+kyc-*@noizu.direct`, all password
 * `TestKyc!2026`), uploads real 1200x800 PNGs to the R2 private bucket under
 * clearly-identifiable `test-kyc-*` keys, writes matching KycUpload +
 * CreatorApplication + DisputeEvidence rows, and materialises two disputes
 * (one OPEN, one UNDER_REVIEW with the supersede/append evidence pattern).
 *
 * Idempotent — runs the cleanup() pass first so re-running the script can't
 * produce duplicates. Cleanup removes the matching R2 objects too.
 *
 * Usage:  npx tsx scripts/seed-kyc-disputes.ts
 *
 * IMPORTANT: This script is the ONLY sanctioned caller of deleteFromR2 on
 * private prefixes outside of auditedDeletePrivate. The deletes below are
 * part of idempotent cleanup, not production operations — whitelisted in
 * scripts/check-r2-delete-guard.mjs.
 */

import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import bcrypt from 'bcryptjs'
import sharp from 'sharp'
import { uploadToR2, deleteFromR2 } from '../src/lib/r2'

// ── Prisma client (mirror src/lib/prisma.ts pattern) ──────────────────────
const dbUrl = process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL!
const pool = new Pool({ connectionString: dbUrl })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter } as any)

// ── Constants ─────────────────────────────────────────────────────────────
const TEST_PASSWORD = 'TestKyc!2026'
const TEST_PASSWORD_HASH = bcrypt.hashSync(TEST_PASSWORD, 10)

type Handle = 'ayu' | 'budi' | 'citra' | 'dinda'

const TEST_USERS: Record<Handle, { email: string; name: string; role: 'BUYER' | 'CREATOR' }> = {
  ayu:   { email: 'test+kyc-ayu@noizu.direct',   name: 'Ayu TEST',   role: 'BUYER' },
  budi:  { email: 'test+kyc-budi@noizu.direct',  name: 'Budi TEST',  role: 'BUYER' },
  citra: { email: 'test+kyc-citra@noizu.direct', name: 'Citra TEST', role: 'CREATOR' },
  dinda: { email: 'test+kyc-dinda@noizu.direct', name: 'Dinda TEST', role: 'CREATOR' },
}

const TEST_EMAILS = Object.values(TEST_USERS).map(u => u.email)

const TEST_PRODUCT_TITLE = 'TEST-KYC Citra Print A4'

// ── Helpers: time offsets ─────────────────────────────────────────────────
const now = () => new Date()
const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000)

// ── Helpers: test image generation ────────────────────────────────────────
async function makeTestImage(label: string): Promise<Buffer> {
  const escaped = label.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const svg = `<svg width="1200" height="800" xmlns="http://www.w3.org/2000/svg"><text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-size="60" fill="#333">TEST — ${escaped}</text></svg>`
  return await sharp({
    create: { width: 1200, height: 800, channels: 3, background: '#cccccc' },
  })
    .composite([{ input: Buffer.from(svg) }])
    .png()
    .toBuffer()
}

async function uploadTestImage(key: string, label: string): Promise<{ r2Key: string; viewerUrl: string; fileSize: number }> {
  const buffer = await makeTestImage(label)
  await uploadToR2({ key, body: buffer, contentType: 'image/png', visibility: 'private' })
  // Build a viewer URL by stripping the `private/` prefix the same way
  // /api/upload does for private identity uploads.
  const viewerPath = key.startsWith('private/') ? key.slice('private/'.length) : key
  const viewerUrl = `/api/files/${viewerPath}`
  return { r2Key: key, viewerUrl, fileSize: buffer.length }
}

// ── Cleanup ───────────────────────────────────────────────────────────────
async function safeDeleteR2(key: string) {
  try {
    await deleteFromR2(key)
  } catch (err) {
    console.warn(`  [cleanup] deleteFromR2(${key}) failed: ${(err as Error).message}`)
  }
}

async function cleanup() {
  console.log('🧹 Cleanup — purging any prior test rows + R2 objects')

  // 1. Find test users up-front (by email) so we can scope everything by id.
  const users = await prisma.user.findMany({
    where: { email: { in: TEST_EMAILS } },
    select: { id: true, email: true },
  })
  const userIds = users.map(u => u.id)
  console.log(`  Found ${users.length} prior test user(s)`)

  if (userIds.length > 0) {
    // 2. Disputes where the order buyer OR creator is a test user.
    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { buyerId: { in: userIds } },
          { creatorId: { in: userIds } },
        ],
      },
      select: { id: true },
    })
    const orderIds = orders.map(o => o.id)

    const disputes = await prisma.dispute.findMany({
      where: { orderId: { in: orderIds } },
      select: { id: true, evidenceFiles: { select: { id: true, r2Key: true } } },
    })

    for (const d of disputes) {
      for (const ev of d.evidenceFiles) {
        await safeDeleteR2(ev.r2Key)
      }
      // DisputeEvidence rows have a self-unique supersededBy FK to another
      // row in the same table. Nulling first avoids FK complaints on delete.
      await prisma.disputeEvidence.updateMany({
        where: { disputeId: d.id },
        data: { supersededBy: null, supersededAt: null },
      })
      await prisma.disputeEvidence.deleteMany({ where: { disputeId: d.id } })
      await prisma.dispute.delete({ where: { id: d.id } })
    }
    if (disputes.length > 0) console.log(`  Deleted ${disputes.length} dispute(s) + evidence`)

    // 3. Order-attached rows (Transactions, EscrowTransactions, Messages),
    //    then the Orders themselves.
    if (orderIds.length > 0) {
      await prisma.transaction.deleteMany({ where: { orderId: { in: orderIds } } })
      await prisma.escrowTransaction.deleteMany({ where: { orderId: { in: orderIds } } })
      await prisma.message.deleteMany({ where: { orderId: { in: orderIds } } })
      await prisma.invoice.deleteMany({ where: { orderId: { in: orderIds } } })
      await prisma.order.deleteMany({ where: { id: { in: orderIds } } })
      console.log(`  Deleted ${orderIds.length} order(s) + attached rows`)
    }

    // 4. KycUpload rows + R2 objects.
    const kycRows = await prisma.kycUpload.findMany({
      where: { userId: { in: userIds } },
      select: { id: true, r2Key: true },
    })
    for (const k of kycRows) {
      await safeDeleteR2(k.r2Key)
    }
    if (kycRows.length > 0) {
      await prisma.kycUpload.updateMany({
        where: { userId: { in: userIds } },
        data: { supersededBy: null, supersededAt: null },
      })
      await prisma.kycUpload.deleteMany({ where: { userId: { in: userIds } } })
      console.log(`  Deleted ${kycRows.length} KycUpload row(s) + R2 objects`)
    }

    // 5. CreatorApplications.
    await prisma.creatorApplication.deleteMany({ where: { userId: { in: userIds } } })

    // 6. CreatorProfiles + dependent rows (products + related).
    const profiles = await prisma.creatorProfile.findMany({
      where: { userId: { in: userIds } },
      select: { id: true },
    })
    const profileIds = profiles.map(p => p.id)
    if (profileIds.length > 0) {
      // Products owned by these creator profiles (+ dependents).
      const prodRows = await prisma.product.findMany({
        where: { creatorId: { in: profileIds } },
        select: { id: true },
      })
      const prodIds = prodRows.map(p => p.id)
      if (prodIds.length > 0) {
        await prisma.cartItem.deleteMany({ where: { productId: { in: prodIds } } })
        await prisma.wishlistItem.deleteMany({ where: { productId: { in: prodIds } } })
        await prisma.productView.deleteMany({ where: { productId: { in: prodIds } } })
        await prisma.productReview.deleteMany({ where: { productId: { in: prodIds } } })
        await prisma.product.deleteMany({ where: { id: { in: prodIds } } })
      }
      await prisma.creatorProfile.deleteMany({ where: { id: { in: profileIds } } })
    }

    // 7. Any stray TEST-KYC-titled products (belt-and-braces for older runs).
    const strayProducts = await prisma.product.findMany({
      where: { title: { startsWith: 'TEST-KYC' } },
      select: { id: true },
    })
    if (strayProducts.length > 0) {
      const ids = strayProducts.map(p => p.id)
      await prisma.cartItem.deleteMany({ where: { productId: { in: ids } } })
      await prisma.wishlistItem.deleteMany({ where: { productId: { in: ids } } })
      await prisma.productView.deleteMany({ where: { productId: { in: ids } } })
      await prisma.productReview.deleteMany({ where: { productId: { in: ids } } })
      await prisma.product.deleteMany({ where: { id: { in: ids } } })
    }

    // 8. Finally, the users.
    await prisma.user.deleteMany({ where: { id: { in: userIds } } })
    console.log(`  Deleted ${userIds.length} test user(s)`)
  }

  console.log('🧹 Cleanup complete')
}

// ── Creation helpers ──────────────────────────────────────────────────────
async function createUser(handle: Handle) {
  const u = TEST_USERS[handle]
  const user = await prisma.user.create({
    data: {
      email: u.email,
      password: TEST_PASSWORD_HASH,
      name: u.name,
      role: u.role,
      emailVerified: now(),
    },
  })
  console.log(`  ✅ User: ${handle} (${u.email}) role=${u.role}`)
  return user
}

/** Budi — ORPHAN candidate: DRAFT application 10 days stale, 3 live uploads, reminder NULL. */
async function createOrphanApplication(userId: string, handle: Handle) {
  const categories: Array<'id_front' | 'id_back' | 'selfie'> = ['id_front', 'id_back', 'selfie']
  const stamp = daysAgo(10)
  const uploads: Record<string, { r2Key: string; viewerUrl: string }> = {}

  for (const cat of categories) {
    const key = `private/identity/${userId}/test-kyc-${handle}-${cat}.png`
    const label = `${handle} — ${cat}`
    const { r2Key, viewerUrl, fileSize } = await uploadTestImage(key, label)
    await prisma.kycUpload.create({
      data: {
        userId,
        category: cat,
        r2Key,
        viewerUrl,
        mimeType: 'image/png',
        fileSize,
        createdAt: stamp,
      },
    })
    uploads[cat] = { r2Key, viewerUrl }
  }

  await prisma.creatorApplication.create({
    data: {
      userId,
      status: 'DRAFT',
      displayName: 'Budi TEST Draft',
      username: `test-${handle}`,
      bio: 'TEST — orphan DRAFT application (10d stale).',
      legalFullName: 'Budi TEST',
      dateOfBirth: new Date('1995-05-15'),
      nationality: 'MY',
      country: 'MY',
      phone: '+60123000000',
      idType: 'IC',
      idNumber: '950515-10-0000',
      idFrontImage: uploads.id_front.viewerUrl,
      idBackImage:  uploads.id_back.viewerUrl,
      selfieImage:  uploads.selfie.viewerUrl,
      kycCompleted: true,
      bankCountryCode: 'MY',
      bankCurrency: 'MYR',
      kycReminderSentAt: null,
      orphanedAt: null,
      createdAt: stamp,
      updatedAt: stamp,
    },
  })
  console.log(`  ✅ Orphan DRAFT application for ${handle} (updated ${stamp.toISOString()})`)
}

/** Citra — CREATOR, SUBMITTED, 3 live uploads, CreatorProfile exists. */
async function createSubmittedApplication(userId: string, handle: Handle) {
  const categories: Array<'id_front' | 'id_back' | 'selfie'> = ['id_front', 'id_back', 'selfie']
  const submittedAt = daysAgo(2)
  const uploads: Record<string, { r2Key: string; viewerUrl: string }> = {}

  for (const cat of categories) {
    const key = `private/identity/${userId}/test-kyc-${handle}-${cat}.png`
    const label = `${handle} — ${cat}`
    const { r2Key, viewerUrl, fileSize } = await uploadTestImage(key, label)
    await prisma.kycUpload.create({
      data: {
        userId,
        category: cat,
        r2Key,
        viewerUrl,
        mimeType: 'image/png',
        fileSize,
      },
    })
    uploads[cat] = { r2Key, viewerUrl }
  }

  await prisma.creatorApplication.create({
    data: {
      userId,
      status: 'SUBMITTED',
      displayName: 'Citra TEST',
      username: `test-${handle}`,
      bio: 'TEST — submitted CreatorApplication awaiting review.',
      legalFullName: 'Citra TEST',
      dateOfBirth: new Date('1992-03-10'),
      nationality: 'ID',
      country: 'ID',
      phone: '+62811000000',
      idType: 'PASSPORT',
      idNumber: 'A1234567',
      idFrontImage: uploads.id_front.viewerUrl,
      idBackImage:  uploads.id_back.viewerUrl,
      selfieImage:  uploads.selfie.viewerUrl,
      kycCompleted: true,
      bankCountryCode: 'ID',
      bankCurrency: 'IDR',
      bankAccountName: 'Citra TEST',
      bankName: 'TEST Bank',
      bankAccountNumber: '1234567890',
      submittedAt,
    },
  })

  await prisma.creatorProfile.create({
    data: {
      userId,
      username: `test-${handle}`,
      displayName: 'Citra TEST',
      bio: 'TEST creator profile for KYC/disputes seed. Safe to purge.',
      categoryTags: JSON.stringify(['COSPLAY_PRINT']),
      commissionStatus: 'OPEN',
    },
  })
  console.log(`  ✅ SUBMITTED application + profile for ${handle}`)
}

/** Dinda — CREATOR, SUBMITTED, demonstrates supersede chain on `selfie`. */
async function createReuploadedApplication(userId: string, handle: Handle) {
  const categories: Array<'id_front' | 'id_back'> = ['id_front', 'id_back']
  const submittedAt = daysAgo(1)
  const uploads: Record<string, { r2Key: string; viewerUrl: string }> = {}

  // Normal live uploads for the non-superseded categories.
  for (const cat of categories) {
    const key = `private/identity/${userId}/test-kyc-${handle}-${cat}.png`
    const label = `${handle} — ${cat}`
    const { r2Key, viewerUrl, fileSize } = await uploadTestImage(key, label)
    await prisma.kycUpload.create({
      data: {
        userId,
        category: cat,
        r2Key,
        viewerUrl,
        mimeType: 'image/png',
        fileSize,
      },
    })
    uploads[cat] = { r2Key, viewerUrl }
  }

  // Supersede chain for selfie: v1 (older, superseded) + v2 (newer, live).
  const v1Key = `private/identity/${userId}/test-kyc-${handle}-selfie-v1.png`
  const v2Key = `private/identity/${userId}/test-kyc-${handle}-selfie-v2.png`
  const v1 = await uploadTestImage(v1Key, `${handle} — selfie v1 (rejected)`)
  const v2 = await uploadTestImage(v2Key, `${handle} — selfie v2 (reupload)`)

  // Write the newer row first so we have a stable id to point supersededBy at.
  const newerRow = await prisma.kycUpload.create({
    data: {
      userId,
      category: 'selfie',
      r2Key: v2.r2Key,
      viewerUrl: v2.viewerUrl,
      mimeType: 'image/png',
      fileSize: v2.fileSize,
      createdAt: daysAgo(1),
    },
  })
  await prisma.kycUpload.create({
    data: {
      userId,
      category: 'selfie',
      r2Key: v1.r2Key,
      viewerUrl: v1.viewerUrl,
      mimeType: 'image/png',
      fileSize: v1.fileSize,
      createdAt: daysAgo(5),
      supersededBy: newerRow.id,
      supersededAt: daysAgo(1),
    },
  })
  uploads.selfie = { r2Key: v2.r2Key, viewerUrl: v2.viewerUrl }

  await prisma.creatorApplication.create({
    data: {
      userId,
      status: 'SUBMITTED',
      displayName: 'Dinda TEST',
      username: `test-${handle}`,
      bio: 'TEST — re-submitted after rejection; selfie has supersede chain.',
      legalFullName: 'Dinda TEST',
      dateOfBirth: new Date('1998-07-22'),
      nationality: 'MY',
      country: 'MY',
      phone: '+60139000000',
      idType: 'IC',
      idNumber: '980722-14-0000',
      idFrontImage: uploads.id_front.viewerUrl,
      idBackImage:  uploads.id_back.viewerUrl,
      selfieImage:  uploads.selfie.viewerUrl,
      kycCompleted: true,
      bankCountryCode: 'MY',
      bankCurrency: 'MYR',
      bankAccountName: 'Dinda TEST',
      bankName: 'TEST Bank',
      bankAccountNumber: '9999999999',
      rejectionReason: 'TEST — prior rejection cleared by re-upload.',
      submittedAt,
    },
  })
  console.log(`  ✅ SUBMITTED application with selfie supersede chain for ${handle}`)
}

/** Citra needs a CreatorProfile + a test product. */
async function ensureProduct(citraUserId: string): Promise<string> {
  const profile = await prisma.creatorProfile.findUnique({
    where: { userId: citraUserId },
    select: { id: true },
  })
  if (!profile) throw new Error('Citra CreatorProfile missing — createSubmittedApplication must run first')

  // Reuse an existing test product if one still lingers.
  const existing = await prisma.product.findFirst({
    where: { title: { startsWith: 'TEST-KYC' }, creatorId: profile.id },
    select: { id: true },
  })
  if (existing) return existing.id

  const product = await prisma.product.create({
    data: {
      creatorId: profile.id,
      title: TEST_PRODUCT_TITLE,
      description: 'TEST product for KYC/disputes seed. Safe to purge.',
      price: 5000, // $50
      category: 'COSPLAY_PRINT',
      type: 'PHYSICAL',
      stock: 100,
      isActive: true,
      images: JSON.stringify([]),
    },
  })
  console.log(`  ✅ Test product ${product.id} for Citra`)
  return product.id
}

/** Dispute D1 — OPEN, raised by Ayu against Citra, 2 RAISER evidences. */
async function createOpenDispute(buyerId: string, creatorId: string, productId: string) {
  const createdAt = daysAgo(3)
  const order = await prisma.order.create({
    data: {
      buyerId,
      creatorId,
      productId,
      status: 'DISPUTED',
      amountUsd: 5000,
      displayCurrency: 'USD',
      displayAmount: 5000,
      escrowStatus: 'HELD',
      escrowHeldAt: createdAt,
      createdAt,
      updatedAt: createdAt,
    },
  })

  const dispute = await prisma.dispute.create({
    data: {
      orderId: order.id,
      raisedBy: buyerId,
      reason: 'NEVER_ARRIVED',
      description: 'TEST — buyer says package arrived empty.',
      status: 'OPEN',
      createdAt,
      updatedAt: createdAt,
    },
  })

  const evidenceNotes = ['Box arrived empty', 'Courier receipt']
  for (let i = 0; i < evidenceNotes.length; i++) {
    const key = `private/dispute-evidence/test-kyc-${dispute.id}-${i + 1}.png`
    const label = `dispute ${dispute.id.slice(-6)} ev${i + 1}`
    const { r2Key, viewerUrl, fileSize } = await uploadTestImage(key, label)
    await prisma.disputeEvidence.create({
      data: {
        disputeId: dispute.id,
        uploaderId: buyerId,
        role: 'RAISER',
        r2Key,
        viewerUrl,
        mimeType: 'image/png',
        fileSize,
        note: evidenceNotes[i],
        uploadedAt: createdAt,
      },
    })
  }
  console.log(`  ✅ Dispute D1 OPEN — ${dispute.id} with 2 RAISER evidences`)
}

/** Dispute D2 — UNDER_REVIEW, supersede + creator-response + append pattern. */
async function createReviewDispute(buyerId: string, creatorId: string, productId: string) {
  const orderCreated = daysAgo(10)
  const order = await prisma.order.create({
    data: {
      buyerId,
      creatorId,
      productId,
      status: 'DISPUTED',
      amountUsd: 5000,
      displayCurrency: 'USD',
      displayAmount: 5000,
      escrowStatus: 'DISPUTED',
      escrowHeldAt: orderCreated,
      createdAt: orderCreated,
      updatedAt: orderCreated,
    },
  })

  const dispute = await prisma.dispute.create({
    data: {
      orderId: order.id,
      raisedBy: buyerId,
      reason: 'DAMAGED',
      description: 'TEST — buyer reports damaged print on arrival.',
      status: 'UNDER_REVIEW',
      creatorResponse: 'Packaging intact when sent; see photo',
      creatorRespondedAt: daysAgo(5),
      createdAt: daysAgo(9),
      updatedAt: daysAgo(3),
    },
  })

  // v1 raiser evidence (8 days ago) — will be superseded by v2.
  const v1Up = await uploadTestImage(
    `private/dispute-evidence/test-kyc-${dispute.id}-1-v1.png`,
    `dispute ${dispute.id.slice(-6)} ev1 v1`,
  )
  // v2 raiser evidence (6 days ago) — live.
  const v2Up = await uploadTestImage(
    `private/dispute-evidence/test-kyc-${dispute.id}-1-v2.png`,
    `dispute ${dispute.id.slice(-6)} ev1 v2`,
  )

  // Create newer row first so we can set supersededBy on the older row.
  const v2Row = await prisma.disputeEvidence.create({
    data: {
      disputeId: dispute.id,
      uploaderId: buyerId,
      role: 'RAISER',
      r2Key: v2Up.r2Key,
      viewerUrl: v2Up.viewerUrl,
      mimeType: 'image/png',
      fileSize: v2Up.fileSize,
      note: 'Better lit photo of crack',
      uploadedAt: daysAgo(6),
    },
  })
  await prisma.disputeEvidence.create({
    data: {
      disputeId: dispute.id,
      uploaderId: buyerId,
      role: 'RAISER',
      r2Key: v1Up.r2Key,
      viewerUrl: v1Up.viewerUrl,
      mimeType: 'image/png',
      fileSize: v1Up.fileSize,
      note: 'Crack in corner',
      uploadedAt: daysAgo(8),
      supersededBy: v2Row.id,
      supersededAt: daysAgo(6),
    },
  })

  // Creator response (5 days ago).
  const creatorUp = await uploadTestImage(
    `private/dispute-evidence/test-kyc-${dispute.id}-2.png`,
    `dispute ${dispute.id.slice(-6)} creator`,
  )
  await prisma.disputeEvidence.create({
    data: {
      disputeId: dispute.id,
      uploaderId: creatorId,
      role: 'CREATOR',
      r2Key: creatorUp.r2Key,
      viewerUrl: creatorUp.viewerUrl,
      mimeType: 'image/png',
      fileSize: creatorUp.fileSize,
      note: 'Packaging intact when sent; see photo',
      uploadedAt: daysAgo(5),
    },
  })

  // Buyer append (3 days ago).
  const appendUp = await uploadTestImage(
    `private/dispute-evidence/test-kyc-${dispute.id}-3.png`,
    `dispute ${dispute.id.slice(-6)} ev3`,
  )
  await prisma.disputeEvidence.create({
    data: {
      disputeId: dispute.id,
      uploaderId: buyerId,
      role: 'RAISER',
      r2Key: appendUp.r2Key,
      viewerUrl: appendUp.viewerUrl,
      mimeType: 'image/png',
      fileSize: appendUp.fileSize,
      note: 'Not the same packaging',
      uploadedAt: daysAgo(3),
    },
  })

  console.log(`  ✅ Dispute D2 UNDER_REVIEW — ${dispute.id} with supersede + creator response + append`)
}

// ── Main ──────────────────────────────────────────────────────────────────
async function main() {
  console.log('🌱 KYC/disputes seed starting…')
  console.log(`    Target DB: ${dbUrl?.replace(/:[^:@/]+@/, ':***@')}`)

  await cleanup()

  const ayu   = await createUser('ayu')
  const budi  = await createUser('budi')
  const citra = await createUser('citra')
  const dinda = await createUser('dinda')

  await createOrphanApplication(budi.id, 'budi')
  await createSubmittedApplication(citra.id, 'citra')
  await createReuploadedApplication(dinda.id, 'dinda')

  const productId = await ensureProduct(citra.id)

  await createOpenDispute(ayu.id, citra.id, productId)
  await createReviewDispute(budi.id, citra.id, productId)

  console.log('\n🎉 Seed complete!')
  console.log('    Test password for all users: TestKyc!2026')
  console.log('    Users:')
  for (const [handle, u] of Object.entries(TEST_USERS)) {
    console.log(`      - ${handle.padEnd(6)} ${u.email.padEnd(34)} ${u.role}`)
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
