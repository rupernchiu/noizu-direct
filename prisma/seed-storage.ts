import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const dbUrl = process.env.DATABASE_URL ?? 'file:./dev.db';
const adapter = new PrismaBetterSqlite3({ url: dbUrl });
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  await prisma.storagePricingConfig.upsert({
    where: { id: 'config' },
    create: { id: 'config' },
    update: {},
  });
  console.log('✅ StoragePricingConfig seeded');

  await prisma.page.upsert({
    where: { slug: 'storage-policy' },
    create: {
      slug: 'storage-policy',
      title: 'Storage Policy',
      status: 'PUBLISHED',
      showInFooter: true,
      footerColumn: 'Support',
      footerOrder: 99,
      content: `# NOIZU-DIRECT STORAGE POLICY\n\nLast updated: April 2026\n\n## 1. Storage Allocations\n\nEvery creator account includes 500MB free storage.\n\n- **Free Plan**: 500MB\n- **Pro Plan**: 5GB — USD 9.99/month\n- **Studio Plan**: 20GB — USD 19.99/month\n\nOne-time top-ups: +1GB (USD 2.99), +5GB (USD 9.99), +10GB (USD 17.99)\n\n## 2. What Counts Toward Storage\n\nProduct images, portfolio images, profile assets (avatar/banner/logo), message attachments, PDF uploads.\n\nDoes NOT count: video embeds, digital product files sold to members, external URLs.\n\n## 3. Warnings & Enforcement\n\nYou are notified at 80%, 95%, and 100% usage. At 100%, new uploads are blocked.\n\n## 4. Grace Period\n\nA 7-day grace period begins if storage remains over quota. Orphaned files may be auto-deleted after a 48-hour final warning.\n\nNOIZU-DIRECT will NEVER auto-delete active product images, portfolio images, avatar, banner, or logo, or files attached to active orders or messages.\n\n## 5. Outstanding Fees\n\n- Day 1–7: Grace period, daily reminders\n- Day 7+: Payout requests blocked\n- Day 14+: New product listings blocked\n- Day 30+: Account suspended pending review\n\n## 6. Plan Changes\n\nUpgrading takes effect immediately. Downgrading takes effect at end of billing period.\n\n## 7. Refunds\n\nStorage plan fees and one-time top-ups are non-refundable.\n\n## 8. Contact\n\nhello@noizu.direct`,
    },
    update: {},
  });
  console.log('✅ Storage policy page seeded');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
