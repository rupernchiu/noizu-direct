/**
 * Seed: Staff users, roles, and permission grants.
 * Run: npx tsx prisma/seeds/staffUsers.ts
 * Safe to re-run — uses upsert on email / name.
 */

import bcrypt from 'bcryptjs'
import { PrismaClient } from '../../src/generated/prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db' })
const prisma = new PrismaClient({ adapter } as any)

async function upsertUser(data: {
  email: string; name: string; password: string
  isSuperAdmin: boolean; isActive: boolean; department?: string
}) {
  const passwordHash = await bcrypt.hash(data.password, 12)
  return prisma.staffUser.upsert({
    where: { email: data.email },
    create: {
      email: data.email, name: data.name, passwordHash,
      isSuperAdmin: data.isSuperAdmin, isActive: data.isActive,
      department: data.department ?? null,
    },
    update: {
      name: data.name, passwordHash,
      isSuperAdmin: data.isSuperAdmin, isActive: data.isActive,
      department: data.department ?? null,
    },
  })
}

async function grantPermissions(userId: string, shortcodes: string[]) {
  for (const shortcode of shortcodes) {
    const perm = await prisma.staffPermission.findUnique({ where: { shortcode } })
    if (!perm) { console.warn(`  ⚠ Permission not found: ${shortcode}`); continue }
    await prisma.staffUserPermission.upsert({
      where: { staffUserId_staffPermissionId: { staffUserId: userId, staffPermissionId: perm.id } },
      create: { staffUserId: userId, staffPermissionId: perm.id },
      update: {},
    })
  }
}

async function main() {
  // ── Roles ──────────────────────────────────────────────────────────────
  const roles = [
    { name: 'super_admin',        description: 'Super Administrator — full access' },
    { name: 'content_moderator',  description: 'Manages CMS, blog, announcements and product moderation' },
    { name: 'finance_staff',      description: 'Handles payouts, transactions and dispute resolution' },
  ]
  for (const r of roles) {
    await prisma.staffRole.upsert({
      where: { name: r.name },
      create: r,
      update: { description: r.description },
    })
  }
  console.log(`Seeded ${roles.length} roles.`)

  // ── Staff Users ────────────────────────────────────────────────────────
  const rupern = await upsertUser({
    email: 'rupern@noizu.direct', name: 'Rupern',
    password: 'admin123', isSuperAdmin: true, isActive: true,
  })
  console.log(`Upserted: ${rupern.name} (${rupern.email}) — Super Admin`)

  const mod = await upsertUser({
    email: 'mod@noizu.direct', name: 'Content Mod',
    password: 'password123', isSuperAdmin: false, isActive: true,
    department: 'Content',
  })
  await grantPermissions(mod.id, [
    'cms.view', 'cms.edit',
    'announcements.view', 'announcements.create', 'announcements.edit', 'announcements.delete',
    'products.view',
  ])
  console.log(`Upserted: ${mod.name} (${mod.email}) — Content Mod`)

  const finance = await upsertUser({
    email: 'finance@noizu.direct', name: 'Finance Staff',
    password: 'password123', isSuperAdmin: false, isActive: true,
    department: 'Finance',
  })
  await grantPermissions(finance.id, [
    'payouts.view', 'payouts.approve',
    'transactions.view', 'transactions.export',
    'disputes.view', 'disputes.resolve',
  ])
  console.log(`Upserted: ${finance.name} (${finance.email}) — Finance Staff`)

  console.log('Staff seed complete.')
}

main().finally(() => prisma.$disconnect())
