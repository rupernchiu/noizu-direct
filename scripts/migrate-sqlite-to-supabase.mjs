/**
 * migrate-sqlite-to-supabase.mjs
 * Reads all tables from prisma/dev.db (SQLite) and inserts into Supabase (PostgreSQL)
 * via the generated PrismaClient.
 *
 * Run: node scripts/migrate-sqlite-to-supabase.mjs
 */

import { createRequire } from "module";
import { fileURLToPath } from "url";
import path from "path";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

// Load env vars
const dotenv = require("dotenv");
dotenv.config({ path: path.join(rootDir, ".env") });

// SQLite reader
const Database = require("better-sqlite3");
const sqliteDb = new Database(path.join(rootDir, "prisma", "dev.db"), { readonly: true });

// Prisma client pointing at Supabase via pg driver adapter (direct connection bypasses PgBouncer)
const pgUrl = process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL;
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require(path.join(rootDir, "src", "generated", "prisma", "client.ts"));
const pool = new Pool({ connectionString: pgUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ── Helpers ──────────────────────────────────────────────────────────────────

function readTable(tableName) {
  try {
    return sqliteDb.prepare(`SELECT * FROM "${tableName}"`).all();
  } catch (e) {
    console.warn(`  [warn] Could not read table ${tableName}: ${e.message}`);
    return [];
  }
}

/**
 * Parse datetime strings from SQLite into JS Date objects (or null).
 * SQLite stores datetimes as ISO strings; Prisma/PG needs Date objects.
 */
function parseDate(val) {
  if (val == null) return null;
  if (val instanceof Date) return val;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Convert boolean integers (0/1) from SQLite to JS booleans.
 */
function parseBool(val) {
  if (typeof val === "boolean") return val;
  return val === 1 || val === "1" || val === "true";
}

async function migrateTable(tableName, rows, insertFn) {
  if (rows.length === 0) {
    console.log(`  ${tableName}: 0 rows in SQLite — skipped`);
    return { table: tableName, sqlite: 0, inserted: 0, errors: 0 };
  }

  console.log(`  ${tableName}: ${rows.length} rows to migrate...`);
  const BATCH = 50;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    for (const row of batch) {
      try {
        await insertFn(row);
        inserted++;
      } catch (e) {
        errors++;
        console.error(`    [error] ${tableName} id=${row.id ?? "?"}: ${e.message}`);
      }
    }
  }

  console.log(`  ${tableName}: inserted ${inserted}, errors ${errors}`);
  return { table: tableName, sqlite: rows.length, inserted, errors };
}

// ── Table migration definitions ───────────────────────────────────────────────

async function run() {
  console.log("=== SQLite → Supabase Migration ===\n");
  const results = [];

  // 1. User
  results.push(await migrateTable("User", readTable("User"), (r) =>
    prisma.user.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        email: r.email,
        password: r.password,
        name: r.name,
        role: r.role ?? "BUYER",
        avatar: r.avatar ?? null,
        phone: r.phone ?? null,
        warningCount: r.warningCount ?? 0,
        isFlaggedForReview: parseBool(r.isFlaggedForReview),
        createdAt: parseDate(r.createdAt) ?? new Date(),
        updatedAt: parseDate(r.updatedAt) ?? new Date(),
        creatorVerificationStatus: r.creatorVerificationStatus ?? "UNVERIFIED",
        creatorVerificationNote: r.creatorVerificationNote ?? null,
        accountStatus: r.accountStatus ?? "ACTIVE",
        restrictedAt: parseDate(r.restrictedAt),
        restrictionReason: r.restrictionReason ?? null,
        closureRequestedAt: parseDate(r.closureRequestedAt),
        agreementsLastCheckedAt: parseDate(r.agreementsLastCheckedAt),
      },
    })
  ));

  // 2. CreatorProfile
  results.push(await migrateTable("CreatorProfile", readTable("CreatorProfile"), (r) =>
    prisma.creatorProfile.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        userId: r.userId,
        username: r.username,
        displayName: r.displayName,
        bio: r.bio ?? null,
        bannerImage: r.bannerImage ?? null,
        avatar: r.avatar ?? null,
        socialLinks: r.socialLinks ?? "{}",
        categoryTags: r.categoryTags ?? "[]",
        commissionStatus: r.commissionStatus ?? "OPEN",
        announcementText: r.announcementText ?? null,
        announcementActive: parseBool(r.announcementActive),
        featuredProductIds: r.featuredProductIds ?? "[]",
        isVerified: parseBool(r.isVerified),
        isTopCreator: parseBool(r.isTopCreator),
        totalSales: r.totalSales ?? 0,
        absorbProcessingFee: parseBool(r.absorbProcessingFee),
        portfolioItems: r.portfolioItems ?? "[]",
        isSuspended: parseBool(r.isSuspended),
        badges: r.badges ?? "[]",
        commissionSlots: r.commissionSlots ?? null,
        commissionTerms: r.commissionTerms ?? null,
        commissionPricing: r.commissionPricing ?? "[]",
        commissionDescription: r.commissionDescription ?? null,
        logoImage: r.logoImage ?? null,
        popupEnabled: parseBool(r.popupEnabled),
        popupTitle: r.popupTitle ?? null,
        popupDescription: r.popupDescription ?? null,
        popupCtaText: r.popupCtaText ?? null,
        popupCtaLink: r.popupCtaLink ?? null,
        popupBadgeText: r.popupBadgeText ?? null,
        popupImageUrl: r.popupImageUrl ?? null,
        notifPrefs: r.notifPrefs ?? "{}",
        themeColor: r.themeColor ?? null,
        sectionOrder: r.sectionOrder ?? "[]",
        storeStatus: r.storeStatus ?? "ACTIVE",
        storeStatusReason: r.storeStatusReason ?? null,
        storeStatusUpdatedAt: parseDate(r.storeStatusUpdatedAt),
        lastLoginAt: parseDate(r.lastLoginAt),
        fulfillmentWarnings: r.fulfillmentWarnings ?? 0,
        healthEmailSentAt: r.healthEmailSentAt ?? null,
        onboardingCompleted: parseBool(r.onboardingCompleted),
        onboardingDismissed: parseBool(r.onboardingDismissed),
        airwallexBeneficiaryId: r.airwallexBeneficiaryId ?? null,
        payoutMethod: r.payoutMethod ?? "bank_transfer",
        payoutDetails: r.payoutDetails ?? null,
        payoutCountry: r.payoutCountry ?? null,
        payoutCurrency: r.payoutCurrency ?? null,
        createdAt: parseDate(r.createdAt) ?? new Date(),
      },
    })
  ));

  // 3. CreatorPodProvider
  results.push(await migrateTable("CreatorPodProvider", readTable("CreatorPodProvider"), (r) =>
    prisma.creatorPodProvider.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        creatorId: r.creatorId,
        name: r.name,
        customName: r.customName ?? null,
        storeUrl: r.storeUrl ?? null,
        notes: r.notes ?? null,
        isDefault: parseBool(r.isDefault),
        defaultProductionDays: r.defaultProductionDays ?? 5,
        shippingMY: r.shippingMY ?? 5,
        shippingSG: r.shippingSG ?? 7,
        shippingPH: r.shippingPH ?? 10,
        shippingIntl: r.shippingIntl ?? 14,
        createdAt: parseDate(r.createdAt) ?? new Date(),
        updatedAt: parseDate(r.updatedAt) ?? new Date(),
      },
    })
  ));

  // 4. Product
  results.push(await migrateTable("Product", readTable("Product"), (r) =>
    prisma.product.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        creatorId: r.creatorId,
        title: r.title,
        description: r.description,
        price: r.price,
        category: r.category,
        type: r.type,
        images: r.images ?? "[]",
        digitalFile: r.digitalFile ?? null,
        stock: r.stock ?? null,
        isActive: parseBool(r.isActive),
        isPinned: parseBool(r.isPinned),
        order: r.order ?? 0,
        podProviderId: r.podProviderId ?? null,
        baseCost: r.baseCost ?? null,
        productionDays: r.productionDays ?? null,
        shippingMY: r.shippingMY ?? null,
        shippingSG: r.shippingSG ?? null,
        shippingPH: r.shippingPH ?? null,
        shippingIntl: r.shippingIntl ?? null,
        showProviderPublic: parseBool(r.showProviderPublic),
        podExternalUrl: r.podExternalUrl ?? null,
        sizeVariants: r.sizeVariants ?? null,
        colorVariants: r.colorVariants ?? null,
        trendingScore: r.trendingScore ?? 0,
        trendingVersion: r.trendingVersion ?? 1,
        trendingUpdatedAt: parseDate(r.trendingUpdatedAt),
        manualBoost: r.manualBoost ?? 0,
        isTrendingSuppressed: parseBool(r.isTrendingSuppressed),
        reviewCount: r.reviewCount ?? 0,
        averageRating: r.averageRating ?? 0,
        createdAt: parseDate(r.createdAt) ?? new Date(),
        updatedAt: parseDate(r.updatedAt) ?? new Date(),
      },
    })
  ));

  // 5. PlatformSettings
  results.push(await migrateTable("PlatformSettings", readTable("PlatformSettings"), (r) =>
    prisma.platformSettings.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        processingFeePercent: r.processingFeePercent ?? 2.5,
        platformFeePercent: r.platformFeePercent ?? 0.0,
        withdrawalFeePercent: r.withdrawalFeePercent ?? 4.0,
        topCreatorThreshold: r.topCreatorThreshold ?? 100,
      },
    })
  ));

  // 6. Announcement
  results.push(await migrateTable("Announcement", readTable("Announcement"), (r) =>
    prisma.announcement.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        text: r.text,
        link: r.link ?? null,
        color: r.color ?? "#7c3aed",
        isActive: parseBool(r.isActive),
        createdAt: parseDate(r.createdAt) ?? new Date(),
      },
    })
  ));

  // 7. NavItem
  results.push(await migrateTable("NavItem", readTable("NavItem"), (r) =>
    prisma.navItem.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        label: r.label,
        url: r.url ?? "#",
        navType: r.navType ?? "SECONDARY",
        position: r.position ?? "LEFT",
        order: r.order ?? 0,
        dropdownType: r.dropdownType ?? "NONE",
        dropdownContent: r.dropdownContent ?? "{}",
        openInNewTab: parseBool(r.openInNewTab),
        isActive: parseBool(r.isActive),
        createdAt: parseDate(r.createdAt) ?? new Date(),
        updatedAt: parseDate(r.updatedAt) ?? new Date(),
      },
    })
  ));

  // 8. Page
  results.push(await migrateTable("Page", readTable("Page"), (r) =>
    prisma.page.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        slug: r.slug,
        title: r.title,
        content: r.content ?? null,
        status: r.status ?? "DRAFT",
        showInFooter: parseBool(r.showInFooter),
        footerColumn: r.footerColumn ?? null,
        footerOrder: r.footerOrder ?? null,
        seoTitle: r.seoTitle ?? null,
        seoDescription: r.seoDescription ?? null,
        createdAt: parseDate(r.createdAt) ?? new Date(),
        updatedAt: parseDate(r.updatedAt) ?? new Date(),
      },
    })
  ));

  // 9. Section
  results.push(await migrateTable("Section", readTable("Section"), (r) =>
    prisma.section.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        pageSlug: r.pageSlug,
        type: r.type,
        order: r.order ?? 0,
        isActive: parseBool(r.isActive),
        content: r.content ?? "{}",
        updatedAt: parseDate(r.updatedAt) ?? new Date(),
      },
    })
  ));

  // 10. AgreementTemplate
  results.push(await migrateTable("AgreementTemplate", readTable("AgreementTemplate"), (r) =>
    prisma.agreementTemplate.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        type: r.type,
        version: r.version,
        title: r.title,
        content: r.content,
        summary: r.summary,
        changeLog: r.changeLog ?? null,
        effectiveDate: parseDate(r.effectiveDate) ?? new Date(),
        isActive: parseBool(r.isActive),
        createdBy: r.createdBy,
        createdAt: parseDate(r.createdAt) ?? new Date(),
        publishedAt: parseDate(r.publishedAt),
      },
    })
  ));

  // 11. CreatorApplication
  results.push(await migrateTable("CreatorApplication", readTable("CreatorApplication"), (r) =>
    prisma.creatorApplication.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        userId: r.userId,
        status: r.status ?? "DRAFT",
        displayName: r.displayName ?? "",
        username: r.username ?? "",
        bio: r.bio ?? "",
        categoryTags: r.categoryTags ?? "[]",
        legalFullName: r.legalFullName ?? "",
        dateOfBirth: parseDate(r.dateOfBirth),
        nationality: r.nationality ?? "",
        country: r.country ?? "",
        phone: r.phone ?? "",
        idType: r.idType ?? "IC",
        idNumber: r.idNumber ?? "",
        idFrontImage: r.idFrontImage ?? null,
        idBackImage: r.idBackImage ?? null,
        selfieImage: r.selfieImage ?? null,
        bankName: r.bankName ?? "",
        bankAccountNumber: r.bankAccountNumber ?? "",
        bankAccountName: r.bankAccountName ?? "",
        paypalEmail: r.paypalEmail ?? null,
        adminNote: r.adminNote ?? null,
        rejectionReason: r.rejectionReason ?? null,
        submittedAt: parseDate(r.submittedAt),
        reviewedAt: parseDate(r.reviewedAt),
        reviewedBy: r.reviewedBy ?? null,
        createdAt: parseDate(r.createdAt) ?? new Date(),
        updatedAt: parseDate(r.updatedAt) ?? new Date(),
      },
    })
  ));

  // 12. CreatorAgreement
  results.push(await migrateTable("CreatorAgreement", readTable("CreatorAgreement"), (r) =>
    prisma.creatorAgreement.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        userId: r.userId,
        templateId: r.templateId,
        agreementType: r.agreementType,
        agreementVersion: r.agreementVersion,
        agreedAt: parseDate(r.agreedAt) ?? new Date(),
        ipAddress: r.ipAddress,
        userAgent: r.userAgent,
        signedName: r.signedName,
        agreementSnapshot: r.agreementSnapshot,
        isActive: parseBool(r.isActive),
        createdAt: parseDate(r.createdAt) ?? new Date(),
      },
    })
  ));

  // 13. CreatorFollow
  results.push(await migrateTable("CreatorFollow", readTable("CreatorFollow"), (r) =>
    prisma.creatorFollow.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        buyerId: r.buyerId,
        creatorId: r.creatorId,
        notifyNewProduct: parseBool(r.notifyNewProduct),
        notifyCommissionOpen: parseBool(r.notifyCommissionOpen),
        notifyNewPost: parseBool(r.notifyNewPost),
        followedAt: parseDate(r.followedAt) ?? new Date(),
      },
    })
  ));

  // 14. CartItem
  results.push(await migrateTable("CartItem", readTable("CartItem"), (r) =>
    prisma.cartItem.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        buyerId: r.buyerId,
        productId: r.productId,
        quantity: r.quantity ?? 1,
        selectedSize: r.selectedSize ?? null,
        selectedColor: r.selectedColor ?? null,
        addedAt: parseDate(r.addedAt) ?? new Date(),
      },
    })
  ));

  // 15. WishlistItem
  results.push(await migrateTable("WishlistItem", readTable("WishlistItem"), (r) =>
    prisma.wishlistItem.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        buyerId: r.buyerId,
        productId: r.productId,
        notifyPriceChange: parseBool(r.notifyPriceChange),
        notifyRestock: parseBool(r.notifyRestock),
        notifyNewDrop: parseBool(r.notifyNewDrop),
        addedAt: parseDate(r.addedAt) ?? new Date(),
      },
    })
  ));

  // 16. Video
  results.push(await migrateTable("Video", readTable("Video"), (r) =>
    prisma.video.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        creatorId: r.creatorId,
        title: r.title,
        description: r.description ?? null,
        platform: r.platform ?? "YOUTUBE",
        url: r.url,
        embedId: r.embedId,
        order: r.order ?? 0,
        isActive: parseBool(r.isActive),
        createdAt: parseDate(r.createdAt) ?? new Date(),
      },
    })
  ));

  // 17. SupportTier
  results.push(await migrateTable("SupportTier", readTable("SupportTier"), (r) =>
    prisma.supportTier.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        creatorId: r.creatorId,
        name: r.name,
        description: r.description ?? null,
        priceUsd: r.priceUsd,
        perks: r.perks ?? "[]",
        isActive: parseBool(r.isActive),
        subscriberCount: r.subscriberCount ?? 0,
        order: r.order ?? 0,
        createdAt: parseDate(r.createdAt) ?? new Date(),
      },
    })
  ));

  // 18. SupportGoal
  results.push(await migrateTable("SupportGoal", readTable("SupportGoal"), (r) =>
    prisma.supportGoal.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        creatorId: r.creatorId,
        title: r.title,
        description: r.description ?? null,
        targetAmountUsd: r.targetAmountUsd,
        currentAmountUsd: r.currentAmountUsd ?? 0,
        deadline: parseDate(r.deadline),
        status: r.status ?? "ACTIVE",
        coverImage: r.coverImage ?? null,
        createdAt: parseDate(r.createdAt) ?? new Date(),
        updatedAt: parseDate(r.updatedAt) ?? new Date(),
      },
    })
  ));

  // 19. SupportGift
  results.push(await migrateTable("SupportGift", readTable("SupportGift"), (r) =>
    prisma.supportGift.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        creatorId: r.creatorId,
        isActive: parseBool(r.isActive),
        presetAmounts: r.presetAmounts ?? "[3,5,10,25]",
        thankYouMessage: r.thankYouMessage ?? "Thank you for your support!",
        totalReceived: r.totalReceived ?? 0,
        giftCount: r.giftCount ?? 0,
        monthlyGiftCount: r.monthlyGiftCount ?? 0,
        monthlyGifterCount: r.monthlyGifterCount ?? 0,
      },
    })
  ));

  // 20. SupportTransaction
  results.push(await migrateTable("SupportTransaction", readTable("SupportTransaction"), (r) =>
    prisma.supportTransaction.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        creatorId: r.creatorId,
        supporterId: r.supporterId ?? null,
        type: r.type,
        amountUsd: r.amountUsd,
        tierId: r.tierId ?? null,
        goalId: r.goalId ?? null,
        message: r.message ?? null,
        isAnonymous: parseBool(r.isAnonymous),
        isMonthly: parseBool(r.isMonthly),
        createdAt: parseDate(r.createdAt) ?? new Date(),
      },
    })
  ));

  // 21. StaffUser
  results.push(await migrateTable("StaffUser", readTable("StaffUser"), (r) =>
    prisma.staffUser.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        email: r.email,
        name: r.name,
        department: r.department ?? null,
        passwordHash: r.passwordHash,
        isSuperAdmin: parseBool(r.isSuperAdmin),
        isActive: parseBool(r.isActive),
        failedAttempts: r.failedAttempts ?? 0,
        lockedUntil: parseDate(r.lockedUntil),
        lastLogin: parseDate(r.lastLogin),
        createdAt: parseDate(r.createdAt) ?? new Date(),
        updatedAt: parseDate(r.updatedAt) ?? new Date(),
      },
    })
  ));

  // 22. StaffPermission
  results.push(await migrateTable("StaffPermission", readTable("StaffPermission"), (r) =>
    prisma.staffPermission.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        shortcode: r.shortcode,
        displayName: r.displayName,
        description: r.description ?? null,
        component: r.component,
        action: r.action,
        isActive: parseBool(r.isActive),
        createdAt: parseDate(r.createdAt) ?? new Date(),
      },
    })
  ));

  // 23. StaffUserPermission
  results.push(await migrateTable("StaffUserPermission", readTable("StaffUserPermission"), (r) =>
    prisma.staffUserPermission.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        staffUserId: r.staffUserId,
        staffPermissionId: r.staffPermissionId,
        assignedAt: parseDate(r.assignedAt) ?? new Date(),
        assignedById: r.assignedById ?? null,
        expiresAt: parseDate(r.expiresAt),
      },
    })
  ));

  // 24. StaffRole
  results.push(await migrateTable("StaffRole", readTable("StaffRole"), (r) =>
    prisma.staffRole.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        name: r.name,
        description: r.description ?? null,
        createdAt: parseDate(r.createdAt) ?? new Date(),
        updatedAt: parseDate(r.updatedAt) ?? new Date(),
      },
    })
  ));

  // 25. Order
  results.push(await migrateTable("Order", readTable("Order"), (r) =>
    prisma.order.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        buyerId: r.buyerId,
        creatorId: r.creatorId,
        productId: r.productId,
        status: r.status ?? "PENDING",
        amountUsd: r.amountUsd,
        displayCurrency: r.displayCurrency ?? "USD",
        displayAmount: r.displayAmount ?? 0,
        exchangeRate: r.exchangeRate ?? 1.0,
        exchangeRateAt: parseDate(r.exchangeRateAt),
        cartSessionId: r.cartSessionId ?? null,
        airwallexIntentId: r.airwallexIntentId ?? null,
        trackingNumber: r.trackingNumber ?? null,
        courierName: r.courierName ?? null,
        courierCode: r.courierCode ?? null,
        trackingAddedAt: parseDate(r.trackingAddedAt),
        estimatedDelivery: parseDate(r.estimatedDelivery),
        shippingAddress: r.shippingAddress ?? null,
        downloadToken: r.downloadToken ?? null,
        downloadExpiry: parseDate(r.downloadExpiry),
        escrowStatus: r.escrowStatus ?? "HELD",
        escrowHeldAt: parseDate(r.escrowHeldAt),
        escrowReleasedAt: parseDate(r.escrowReleasedAt),
        escrowAutoReleaseAt: parseDate(r.escrowAutoReleaseAt),
        fulfillmentDeadline: parseDate(r.fulfillmentDeadline),
        fulfillmentWarningsSent: r.fulfillmentWarningsSent ?? 0,
        buyerConfirmedAt: parseDate(r.buyerConfirmedAt),
        createdAt: parseDate(r.createdAt) ?? new Date(),
        updatedAt: parseDate(r.updatedAt) ?? new Date(),
      },
    })
  ));

  // 26. Transaction
  results.push(await migrateTable("Transaction", readTable("Transaction"), (r) =>
    prisma.transaction.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        orderId: r.orderId,
        buyerId: r.buyerId,
        creatorId: r.creatorId,
        grossAmountUsd: r.grossAmountUsd,
        processingFee: r.processingFee,
        platformFee: r.platformFee ?? 0,
        withdrawalFee: r.withdrawalFee ?? 0,
        creatorAmount: r.creatorAmount,
        currency: r.currency ?? "USD",
        airwallexReference: r.airwallexReference ?? null,
        status: r.status ?? "PENDING",
        createdAt: parseDate(r.createdAt) ?? new Date(),
      },
    })
  ));

  // 27. Payout
  results.push(await migrateTable("Payout", readTable("Payout"), (r) =>
    prisma.payout.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        creatorId: r.creatorId,
        amountUsd: r.amountUsd,
        currency: r.currency ?? "USD",
        status: r.status ?? "PENDING",
        airwallexPayoutId: r.airwallexPayoutId ?? null,
        requestedAt: parseDate(r.requestedAt) ?? new Date(),
        completedAt: parseDate(r.completedAt),
        processedAt: parseDate(r.processedAt),
        rejectedAt: parseDate(r.rejectedAt),
        rejectionReason: r.rejectionReason ?? null,
        adminNote: r.adminNote ?? null,
        payoutMethod: r.payoutMethod ?? "bank_transfer",
        accountDetails: r.accountDetails ?? null,
        airwallexTransferId: r.airwallexTransferId ?? null,
        failureReason: r.failureReason ?? null,
      },
    })
  ));

  // 28. Invoice
  results.push(await migrateTable("Invoice", readTable("Invoice"), (r) =>
    prisma.invoice.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        type: r.type,
        referenceNumber: r.referenceNumber,
        issuedToId: r.issuedToId,
        issuedToType: r.issuedToType,
        amountUsd: r.amountUsd,
        items: r.items ?? "[]",
        pdfPath: r.pdfPath ?? null,
        orderId: r.orderId ?? null,
        createdAt: parseDate(r.createdAt) ?? new Date(),
      },
    })
  ));

  // 29. Dispute
  results.push(await migrateTable("Dispute", readTable("Dispute"), (r) =>
    prisma.dispute.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        orderId: r.orderId,
        raisedBy: r.raisedBy,
        reason: r.reason,
        description: r.description,
        evidence: r.evidence ?? "[]",
        creatorResponse: r.creatorResponse ?? null,
        creatorEvidence: r.creatorEvidence ?? null,
        creatorRespondedAt: parseDate(r.creatorRespondedAt),
        status: r.status ?? "OPEN",
        adminNote: r.adminNote ?? null,
        resolvedBy: r.resolvedBy ?? null,
        resolvedAt: parseDate(r.resolvedAt),
        refundAmount: r.refundAmount ?? null,
        createdAt: parseDate(r.createdAt) ?? new Date(),
        updatedAt: parseDate(r.updatedAt) ?? new Date(),
      },
    })
  ));

  // 30. EscrowTransaction
  results.push(await migrateTable("EscrowTransaction", readTable("EscrowTransaction"), (r) =>
    prisma.escrowTransaction.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        orderId: r.orderId,
        type: r.type,
        amount: r.amount,
        note: r.note ?? null,
        performedBy: r.performedBy ?? null,
        createdAt: parseDate(r.createdAt) ?? new Date(),
      },
    })
  ));

  // 31. Message
  results.push(await migrateTable("Message", readTable("Message"), (r) =>
    prisma.message.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        senderId: r.senderId,
        receiverId: r.receiverId,
        orderId: r.orderId ?? null,
        content: r.content,
        imageUrl: r.imageUrl ?? null,
        attachments: r.attachments ?? "[]",
        isRead: parseBool(r.isRead),
        createdAt: parseDate(r.createdAt) ?? new Date(),
      },
    })
  ));

  // 32. Conversation
  results.push(await migrateTable("Conversation", readTable("Conversation"), (r) =>
    prisma.conversation.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        buyerId: r.buyerId,
        creatorId: r.creatorId,
        lastMessageAt: parseDate(r.lastMessageAt) ?? new Date(),
        createdAt: parseDate(r.createdAt) ?? new Date(),
      },
    })
  ));

  // 33. Notification
  results.push(await migrateTable("Notification", readTable("Notification"), (r) =>
    prisma.notification.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        userId: r.userId,
        type: r.type,
        title: r.title,
        message: r.message,
        orderId: r.orderId ?? null,
        isRead: parseBool(r.isRead),
        actionUrl: r.actionUrl ?? null,
        createdAt: parseDate(r.createdAt) ?? new Date(),
      },
    })
  ));

  // 34. Post
  results.push(await migrateTable("Post", readTable("Post"), (r) =>
    prisma.post.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        slug: r.slug,
        title: r.title,
        excerpt: r.excerpt ?? null,
        content: r.content ?? null,
        coverImage: r.coverImage ?? null,
        authorId: r.authorId,
        status: r.status ?? "DRAFT",
        publishedAt: parseDate(r.publishedAt),
        scheduledAt: parseDate(r.scheduledAt),
        tags: r.tags ?? "[]",
        seoTitle: r.seoTitle ?? null,
        seoDescription: r.seoDescription ?? null,
        viewCount: r.viewCount ?? 0,
        createdAt: parseDate(r.createdAt) ?? new Date(),
        updatedAt: parseDate(r.updatedAt) ?? new Date(),
      },
    })
  ));

  // 35. Media
  results.push(await migrateTable("Media", readTable("Media"), (r) =>
    prisma.media.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        filename: r.filename,
        url: r.url,
        uploadedBy: r.uploadedBy,
        fileSize: r.fileSize ?? null,
        width: r.width ?? null,
        height: r.height ?? null,
        mimeType: r.mimeType ?? null,
        createdAt: parseDate(r.createdAt) ?? new Date(),
      },
    })
  ));

  // 36. BuyerTag
  results.push(await migrateTable("BuyerTag", readTable("BuyerTag"), (r) =>
    prisma.buyerTag.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        creatorId: r.creatorId,
        buyerId: r.buyerId,
        tags: r.tags ?? "[]",
        notes: r.notes ?? null,
        updatedAt: parseDate(r.updatedAt) ?? new Date(),
      },
    })
  ));

  // 37. EmailLog
  results.push(await migrateTable("EmailLog", readTable("EmailLog"), (r) =>
    prisma.emailLog.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        to: r.to,
        subject: r.subject,
        type: r.type,
        status: r.status ?? "sent",
        resendId: r.resendId ?? null,
        error: r.error ?? null,
        createdAt: parseDate(r.createdAt) ?? new Date(),
      },
    })
  ));

  // 38. PasswordResetToken
  results.push(await migrateTable("PasswordResetToken", readTable("PasswordResetToken"), (r) =>
    prisma.passwordResetToken.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        token: r.token,
        email: r.email,
        expiresAt: parseDate(r.expiresAt) ?? new Date(),
        usedAt: parseDate(r.usedAt),
        createdAt: parseDate(r.createdAt) ?? new Date(),
      },
    })
  ));

  // 39. ProductView
  results.push(await migrateTable("ProductView", readTable("ProductView"), (r) =>
    prisma.productView.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        productId: r.productId,
        sessionId: r.sessionId,
        userId: r.userId ?? null,
        ipAddress: r.ipAddress ?? null,
        createdAt: parseDate(r.createdAt) ?? new Date(),
      },
    })
  ));

  // 40. ProductTrendingScore
  results.push(await migrateTable("ProductTrendingScore", readTable("ProductTrendingScore"), (r) =>
    prisma.productTrendingScore.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        productId: r.productId,
        version: r.version,
        score: r.score,
        breakdown: r.breakdown,
        calculatedAt: parseDate(r.calculatedAt) ?? new Date(),
      },
    })
  ));

  // 41. ProductRecommendation
  results.push(await migrateTable("ProductRecommendation", readTable("ProductRecommendation"), (r) =>
    prisma.productRecommendation.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        sourceProductId: r.sourceProductId,
        recommendedProductId: r.recommendedProductId,
        score: r.score,
        sharedBuyers: r.sharedBuyers,
        computedAt: parseDate(r.computedAt) ?? new Date(),
      },
    })
  ));

  // 42. ProductReview
  results.push(await migrateTable("ProductReview", readTable("ProductReview"), (r) =>
    prisma.productReview.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        productId: r.productId,
        orderId: r.orderId,
        buyerId: r.buyerId,
        rating: r.rating,
        title: r.title ?? null,
        body: r.body ?? null,
        isVerified: parseBool(r.isVerified),
        isVisible: parseBool(r.isVisible),
        createdAt: parseDate(r.createdAt) ?? new Date(),
        updatedAt: parseDate(r.updatedAt) ?? new Date(),
      },
    })
  ));

  // 43. PopupAd
  results.push(await migrateTable("PopupAd", readTable("PopupAd"), (r) =>
    prisma.popupAd.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        title: r.title,
        description: r.description ?? null,
        imageUrl: r.imageUrl ?? null,
        ctaText: r.ctaText,
        ctaLink: r.ctaLink,
        isActive: parseBool(r.isActive),
        startsAt: parseDate(r.startsAt),
        endsAt: parseDate(r.endsAt),
        createdAt: parseDate(r.createdAt) ?? new Date(),
        updatedAt: parseDate(r.updatedAt) ?? new Date(),
      },
    })
  ));

  // 44. StoragePricingConfig
  results.push(await migrateTable("StoragePricingConfig", readTable("StoragePricingConfig"), (r) =>
    prisma.storagePricingConfig.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        freePlanMb: r.freePlanMb ?? 500,
        proPlanGb: r.proPlanGb ?? 5,
        proPlanPriceCents: r.proPlanPriceCents ?? 999,
        studioPlanGb: r.studioPlanGb ?? 20,
        studioPlanPriceCents: r.studioPlanPriceCents ?? 1999,
        topup1gbCents: r.topup1gbCents ?? 299,
        topup5gbCents: r.topup5gbCents ?? 999,
        topup10gbCents: r.topup10gbCents ?? 1799,
        warningThreshold1: r.warningThreshold1 ?? 80,
        warningThreshold2: r.warningThreshold2 ?? 95,
        gracePeriodDays: r.gracePeriodDays ?? 7,
        orphanAgeDays: r.orphanAgeDays ?? 30,
        deleteWarningHours: r.deleteWarningHours ?? 48,
        feeGraceDays: r.feeGraceDays ?? 7,
        feePayoutBlockDays: r.feePayoutBlockDays ?? 14,
        feeSuspendDays: r.feeSuspendDays ?? 30,
        updatedAt: parseDate(r.updatedAt) ?? new Date(),
      },
    })
  ));

  // 45. StoragePurchase
  results.push(await migrateTable("StoragePurchase", readTable("StoragePurchase"), (r) =>
    prisma.storagePurchase.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        userId: r.userId,
        planType: r.planType,
        amountCents: r.amountCents,
        status: r.status ?? "INTEREST",
        createdAt: parseDate(r.createdAt) ?? new Date(),
      },
    })
  ));

  // 46. AuditEvent
  results.push(await migrateTable("AuditEvent", readTable("AuditEvent"), (r) =>
    prisma.auditEvent.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        actorId: r.actorId ?? null,
        actorName: r.actorName,
        action: r.action,
        entityType: r.entityType,
        entityId: r.entityId,
        entityLabel: r.entityLabel ?? null,
        reason: r.reason ?? null,
        beforeJson: r.beforeJson ?? null,
        afterJson: r.afterJson ?? null,
        ipAddress: r.ipAddress ?? null,
        createdAt: parseDate(r.createdAt) ?? new Date(),
      },
    })
  ));

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log("\n=== Migration Summary ===");
  console.log(
    `${"Table".padEnd(30)} ${"SQLite".padStart(8)} ${"Inserted".padStart(10)} ${"Errors".padStart(8)}`
  );
  console.log("─".repeat(60));
  let totalSqlite = 0, totalInserted = 0, totalErrors = 0;
  for (const r of results) {
    console.log(
      `${r.table.padEnd(30)} ${String(r.sqlite).padStart(8)} ${String(r.inserted).padStart(10)} ${String(r.errors).padStart(8)}`
    );
    totalSqlite += r.sqlite;
    totalInserted += r.inserted;
    totalErrors += r.errors;
  }
  console.log("─".repeat(60));
  console.log(
    `${"TOTAL".padEnd(30)} ${String(totalSqlite).padStart(8)} ${String(totalInserted).padStart(10)} ${String(totalErrors).padStart(8)}`
  );

  await prisma.$disconnect();
  sqliteDb.close();
  console.log("\nDone.");
}

run().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
