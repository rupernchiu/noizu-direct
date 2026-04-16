/**
 * Seed script: populates StaffPermission catalog.
 * Run with: npx tsx prisma/seeds/staffPermissions.ts
 * Safe to re-run — uses upsert on shortcode.
 */

import { PrismaClient } from '../../src/generated/prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db' })
const prisma = new PrismaClient({ adapter } as any)

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const PERMISSIONS: Array<{ component: string; action: string; description?: string }> = [
  // creators
  { component: 'creators', action: 'view',    description: 'View creator profiles and applications' },
  { component: 'creators', action: 'verify',  description: 'Approve or reject creator applications' },
  { component: 'creators', action: 'suspend', description: 'Suspend or restrict a creator account' },
  { component: 'creators', action: 'delete',  description: 'Permanently delete a creator account' },
  // products
  { component: 'products', action: 'view',   description: 'View all products on the platform' },
  { component: 'products', action: 'edit',   description: 'Edit or hide products' },
  { component: 'products', action: 'delete', description: 'Delete products' },
  // orders
  { component: 'orders', action: 'view', description: 'View all orders' },
  { component: 'orders', action: 'edit', description: 'Update order status or details' },
  // disputes
  { component: 'disputes', action: 'view',    description: 'View all disputes' },
  { component: 'disputes', action: 'resolve', description: 'Resolve disputes and issue refunds' },
  // payouts
  { component: 'payouts', action: 'view',    description: 'View payout requests' },
  { component: 'payouts', action: 'approve', description: 'Approve or reject payout requests' },
  // transactions
  { component: 'transactions', action: 'view',   description: 'View all transactions' },
  { component: 'transactions', action: 'export', description: 'Export transaction data to CSV' },
  // cms
  { component: 'cms', action: 'view', description: 'View CMS pages and posts' },
  { component: 'cms', action: 'edit', description: 'Create and edit CMS content' },
  // announcements
  { component: 'announcements', action: 'view',   description: 'View announcements' },
  { component: 'announcements', action: 'create', description: 'Create new announcements' },
  { component: 'announcements', action: 'edit',   description: 'Edit existing announcements' },
  { component: 'announcements', action: 'delete', description: 'Delete announcements' },
  // storage
  { component: 'storage', action: 'view',   description: 'View storage usage and quotas' },
  { component: 'storage', action: 'adjust', description: 'Manually adjust creator storage limits' },
  // settings
  { component: 'settings', action: 'view', description: 'View platform settings' },
  { component: 'settings', action: 'edit', description: 'Edit platform settings' },
  // staff management
  { component: 'staff', action: 'view',        description: 'View staff users' },
  { component: 'staff', action: 'create',      description: 'Create new staff accounts' },
  { component: 'staff', action: 'edit',        description: 'Edit staff account details' },
  { component: 'staff', action: 'delete',      description: 'Deactivate staff accounts' },
  { component: 'staff', action: 'permissions', description: 'Assign permissions to staff users' },
]

async function main() {
  let upserted = 0
  for (const p of PERMISSIONS) {
    const shortcode = `${p.component}.${p.action}`
    await prisma.staffPermission.upsert({
      where: { shortcode },
      create: {
        shortcode,
        displayName: `${cap(p.action)} ${cap(p.component)}`,
        description: p.description ?? null,
        component: p.component,
        action: p.action,
        isActive: true,
      },
      update: {
        displayName: `${cap(p.action)} ${cap(p.component)}`,
        description: p.description ?? null,
        isActive: true,
      },
    })
    upserted++
  }
  console.log(`Seeded ${upserted} staff permissions.`)
}

main().finally(() => prisma.$disconnect())
