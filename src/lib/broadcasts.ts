import { prisma } from '@/lib/prisma'
import type { Prisma, Broadcast, BroadcastAudience, BroadcastTemplate } from '@/generated/prisma/client'

// ── In-app creator broadcasts ────────────────────────────────────────────────
//
// One-to-many announcements from creators to their followers (and optionally
// only their subscribers). Read-only — replies go through the existing ticket
// flow, not here. See plan: docs/superpowers/plans/2026-04-24-in-app-broadcasts.md

export const TITLE_MAX = 60
export const BODY_MAX = 500
export const CTA_TEXT_MAX = 30
export const RATE_LIMIT_PER_DAY = 3
export const RATE_LIMIT_PER_MONTH = 30
export const RETENTION_DAYS = 30
export const PER_RECIPIENT_CAP = 500
export const SUBSCRIBER_WINDOW_DAYS = 90
export const SUBSCRIBER_MIN_CENTS = 100 // $1

// ── Rate-limit / eligibility ─────────────────────────────────────────────────

export type BroadcastEligibility =
  | { ok: true }
  | { ok: false; reason: 'daily_cap' | 'monthly_cap'; sentToday: number; sentThisMonth: number }

export async function canCreatorBroadcast(
  creatorProfileId: string,
): Promise<BroadcastEligibility> {
  const now = new Date()
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const [sentToday, sentThisMonth] = await Promise.all([
    prisma.broadcast.count({
      where: { creatorId: creatorProfileId, createdAt: { gte: dayAgo } },
    }),
    prisma.broadcast.count({
      where: { creatorId: creatorProfileId, createdAt: { gte: monthAgo } },
    }),
  ])

  if (sentToday >= RATE_LIMIT_PER_DAY) {
    return { ok: false, reason: 'daily_cap', sentToday, sentThisMonth }
  }
  if (sentThisMonth >= RATE_LIMIT_PER_MONTH) {
    return { ok: false, reason: 'monthly_cap', sentToday, sentThisMonth }
  }
  return { ok: true }
}

// ── Subscriber resolution ────────────────────────────────────────────────────
//
// A user counts as a subscriber of a creator if EITHER:
//   - they have an ACTIVE SupportSubscription to that creator, OR
//   - they have a PAID SupportTransaction ≥ $1 within the last 90 days.
// This is computed on demand — never stored as a flag.

export async function isSubscriber(
  buyerUserId: string,
  creatorProfileId: string,
): Promise<boolean> {
  const cutoff = new Date(Date.now() - SUBSCRIBER_WINDOW_DAYS * 24 * 60 * 60 * 1000)

  const [activeSub, recentTx] = await Promise.all([
    prisma.supportSubscription.findFirst({
      where: {
        supporterId: buyerUserId,
        creatorId: creatorProfileId,
        status: 'ACTIVE',
      },
      select: { id: true },
    }),
    prisma.supportTransaction.findFirst({
      where: {
        supporterId: buyerUserId,
        creatorId: creatorProfileId,
        status: 'PAID',
        amountUsd: { gte: SUBSCRIBER_MIN_CENTS },
        createdAt: { gte: cutoff },
      },
      select: { id: true },
    }),
  ])

  return Boolean(activeSub || recentTx)
}

// ── Audience resolution ──────────────────────────────────────────────────────
//
// Returns the list of User.id values that should receive a given broadcast.
// Respects the buyer's per-creator `notifyBroadcast` mute. For SUBSCRIBERS_ONLY,
// filters the follower set by the donation-based subscriber check.

export async function resolveAudience(
  creatorProfileId: string,
  audience: BroadcastAudience,
): Promise<string[]> {
  const follows = await prisma.creatorFollow.findMany({
    where: { creatorId: creatorProfileId, notifyBroadcast: true },
    select: { buyerId: true },
  })
  const followerIds = follows.map(f => f.buyerId)
  if (followerIds.length === 0) return []

  if (audience === 'ALL_FOLLOWERS') return followerIds

  // SUBSCRIBERS_ONLY — filter by subscriber status. Two cheap queries beat
  // N parallel isSubscriber() calls.
  const cutoff = new Date(Date.now() - SUBSCRIBER_WINDOW_DAYS * 24 * 60 * 60 * 1000)
  const [activeSubs, recentTxs] = await Promise.all([
    prisma.supportSubscription.findMany({
      where: {
        supporterId: { in: followerIds },
        creatorId: creatorProfileId,
        status: 'ACTIVE',
      },
      select: { supporterId: true },
    }),
    prisma.supportTransaction.findMany({
      where: {
        supporterId: { in: followerIds },
        creatorId: creatorProfileId,
        status: 'PAID',
        amountUsd: { gte: SUBSCRIBER_MIN_CENTS },
        createdAt: { gte: cutoff },
      },
      select: { supporterId: true },
    }),
  ])

  const subscriberIds = new Set<string>()
  for (const s of activeSubs) subscriberIds.add(s.supporterId)
  for (const t of recentTxs) if (t.supporterId) subscriberIds.add(t.supporterId)
  return followerIds.filter(id => subscriberIds.has(id))
}

export async function getAudienceCount(
  creatorProfileId: string,
  audience: BroadcastAudience,
): Promise<number> {
  const ids = await resolveAudience(creatorProfileId, audience)
  return ids.length
}

// ── Fan-out create ───────────────────────────────────────────────────────────
//
// Creates the Broadcast row + one BroadcastNotification per recipient in a
// single transaction. createMany is used for the fan-out — per the plan, we
// inline batch up to 10k recipients; past that an async queue is needed.

export const INLINE_FANOUT_LIMIT = 10_000

export type CreateBroadcastInput = {
  creatorId: string // CreatorProfile.id
  title: string
  body: string
  template: BroadcastTemplate
  audience: BroadcastAudience
  imageKey?: string | null
  ctaText?: string | null
  ctaUrl?: string | null
}

export type CreateBroadcastResult = {
  broadcast: Broadcast
  recipientCount: number
  deferred: boolean // true if recipient set exceeded INLINE_FANOUT_LIMIT
}

export async function createBroadcast(
  input: CreateBroadcastInput,
): Promise<CreateBroadcastResult> {
  const recipientIds = await resolveAudience(input.creatorId, input.audience)
  const deferred = recipientIds.length > INLINE_FANOUT_LIMIT

  return prisma.$transaction(async tx => {
    const broadcast = await tx.broadcast.create({
      data: {
        creatorId: input.creatorId,
        title: input.title,
        body: input.body,
        template: input.template,
        audience: input.audience,
        imageKey: input.imageKey ?? null,
        ctaText: input.ctaText ?? null,
        ctaUrl: input.ctaUrl ?? null,
      },
    })

    if (!deferred && recipientIds.length > 0) {
      const rows: Prisma.BroadcastNotificationCreateManyInput[] = recipientIds.map(rid => ({
        broadcastId: broadcast.id,
        recipientId: rid,
      }))
      await tx.broadcastNotification.createMany({ data: rows, skipDuplicates: true })
    }

    return { broadcast, recipientCount: recipientIds.length, deferred }
  })
}

// ── FIFO cap enforcement ─────────────────────────────────────────────────────
//
// After a recipient receives a new notification, trim their oldest if they now
// exceed PER_RECIPIENT_CAP. Called opportunistically; retention cron is the
// belt-and-braces backstop. Operates on a single recipient at a time so it
// can run per-row without holding large transactions.

export async function enforceFifoCap(recipientId: string): Promise<number> {
  const count = await prisma.broadcastNotification.count({
    where: { recipientId },
  })
  if (count <= PER_RECIPIENT_CAP) return 0

  const overflow = count - PER_RECIPIENT_CAP
  const oldest = await prisma.broadcastNotification.findMany({
    where: { recipientId },
    orderBy: { createdAt: 'asc' },
    take: overflow,
    select: { id: true },
  })
  if (oldest.length === 0) return 0

  const res = await prisma.broadcastNotification.deleteMany({
    where: { id: { in: oldest.map(r => r.id) } },
  })
  return res.count
}
