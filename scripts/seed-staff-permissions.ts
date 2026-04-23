/**
 * Seed the four staff permissions required by the KYC / disputes / private-file
 * housekeeping system. Idempotent — safe to run any number of times.
 *
 *   kyc.review           — view KYC images, run admin ApplicationReview flow
 *   disputes.review      — view dispute evidence + resolve disputes
 *   files.audit          — view PrivateFileAccess log
 *   files.housekeeping   — delete private files via /admin/private-files/housekeeping
 *
 * Usage:  npx tsx scripts/seed-staff-permissions.ts
 */

import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter } as any)

const perms = [
  {
    shortcode:   'kyc.review',
    displayName: 'Review KYC applications',
    description: 'View applicant ID documents and approve/reject submissions.',
    component:   'kyc',
    action:      'review',
  },
  {
    shortcode:   'disputes.review',
    displayName: 'Review disputes',
    description: 'View dispute evidence and issue refund/release decisions.',
    component:   'disputes',
    action:      'review',
  },
  {
    shortcode:   'files.audit',
    displayName: 'Audit private file access',
    description: 'View PrivateFileAccess log (who looked at which private file).',
    component:   'files',
    action:      'audit',
  },
  {
    shortcode:   'files.housekeeping',
    displayName: 'Delete private files (housekeeping)',
    description: 'Permanently remove private R2 objects (KYC, dispute evidence) under retention policy.',
    component:   'files',
    action:      'housekeeping',
  },
]

async function main() {
  for (const p of perms) {
    await prisma.staffPermission.upsert({
      where:  { shortcode: p.shortcode },
      create: { ...p, isActive: true },
      update: {
        displayName: p.displayName,
        description: p.description,
        component:   p.component,
        action:      p.action,
        isActive:    true,
      },
    })
    console.log(`[ok] ${p.shortcode}`)
  }
  console.log(`Seeded ${perms.length} staff permissions.`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
