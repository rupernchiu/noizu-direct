/**
 * Creator health monitoring logic.
 * Called by both the public cron endpoint (CRON_SECRET) and the admin panel endpoint.
 */

import { prisma } from './prisma'
import {
  sendCreatorNudge30,
  sendCreatorReengagement,
  sendCreatorFulfillmentWarning,
  sendCreatorPreSuspension,
} from './emails/creatorHealth'

const DAY_MS = 24 * 60 * 60 * 1000

function daysSince(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / DAY_MS)
}

function parseEmails(raw: string | null): Record<string, string> {
  if (!raw) return {}
  try { return JSON.parse(raw) } catch { return {} }
}

export interface HealthCheckResult {
  processed: number
  idled: number
  hiatus: number
  flagged: number
  emailsSent: number
}

export async function runCreatorHealthCheck(): Promise<HealthCheckResult> {
  let processed = 0, idled = 0, hiatus = 0, flagged = 0, emailsSent = 0
  const now = new Date()

  const creators = await prisma.creatorProfile.findMany({
    where: { isSuspended: false },
    include: {
      user: { select: { id: true, email: true, name: true, createdAt: true } },
      _count: { select: { products: true } },
    },
  })

  // Overdue orders per creator (Order.creatorId = User.id)
  const creatorUserIds = creators.map((c) => c.userId)
  const overdueGroups = await prisma.order.groupBy({
    by: ['creatorId'],
    where: {
      creatorId: { in: creatorUserIds },
      status: { in: ['PENDING', 'PROCESSING'] },
      fulfillmentDeadline: { not: null, lt: now },
    },
    _count: { id: true },
  })
  const overdueMap = new Map(overdueGroups.map((o) => [o.creatorId, o._count.id]))

  for (const creator of creators) {
    processed++
    const emails = parseEmails(creator.healthEmailSentAt)
    const signupDays = daysSince(creator.createdAt)
    const lastLoginDays = creator.lastLoginAt ? daysSince(creator.lastLoginAt) : null
    const productCount = creator._count.products
    const overdueCount = overdueMap.get(creator.userId) ?? 0

    const updates: Record<string, unknown> = {}
    let newEmails = { ...emails }
    let statusChanged = false

    function setStatus(status: string, reason: string) {
      updates.storeStatus = status
      updates.storeStatusReason = reason
      updates.storeStatusUpdatedAt = now
      statusChanged = true
    }

    // ── New creator checks (never had any products) ──────────────────────────
    if (productCount === 0) {
      if (signupDays >= 90 && creator.storeStatus !== 'HIATUS' && creator.storeStatus !== 'FLAGGED') {
        setStatus('HIATUS', 'No products after 90 days')
        hiatus++
      } else if (signupDays >= 60 && creator.storeStatus === 'ACTIVE') {
        setStatus('IDLE', 'No products after 60 days')
        idled++
      } else if (signupDays >= 30 && !emails.nudge30) {
        try {
          await sendCreatorNudge30(creator.user.email, creator.user.name ?? creator.displayName)
          newEmails = { ...newEmails, nudge30: now.toISOString() }
          emailsSent++
        } catch (e) { console.error('[health] nudge30 email error:', e) }
      }
    }

    // ── Existing creator checks (has products) ───────────────────────────────
    else if (lastLoginDays !== null) {
      if (lastLoginDays >= 180 && creator.storeStatus !== 'FLAGGED') {
        setStatus('FLAGGED', 'Inactive for 180 days')
        flagged++
      } else if (lastLoginDays >= 120 && creator.storeStatus === 'ACTIVE') {
        setStatus('HIATUS', 'Inactive for 120 days')
        hiatus++
      } else if (lastLoginDays >= 90 && !emails.reengagement) {
        try {
          await sendCreatorReengagement(creator.user.email, creator.user.name ?? creator.displayName)
          newEmails = { ...newEmails, reengagement: now.toISOString() }
          emailsSent++
        } catch (e) { console.error('[health] reengagement email error:', e) }
      }
    }

    // ── Fulfillment checks (any creator with overdue orders) ─────────────────
    if (overdueCount > 0) {
      const newWarnings = Math.max(creator.fulfillmentWarnings, overdueCount)
      if (newWarnings !== creator.fulfillmentWarnings) {
        updates.fulfillmentWarnings = newWarnings
      }

      if (newWarnings >= 3 && creator.storeStatus !== 'FLAGGED') {
        setStatus('FLAGGED', '3 missed fulfillment deadlines')
        flagged++
      } else if (newWarnings >= 2 && !emails.preSuspension) {
        try {
          await sendCreatorPreSuspension(creator.user.email, creator.user.name ?? creator.displayName)
          newEmails = { ...newEmails, preSuspension: now.toISOString() }
          emailsSent++
        } catch (e) { console.error('[health] preSuspension email error:', e) }
      } else if (newWarnings >= 1 && !emails.fulfillmentWarn) {
        try {
          await sendCreatorFulfillmentWarning(creator.user.email, creator.user.name ?? creator.displayName)
          newEmails = { ...newEmails, fulfillmentWarn: now.toISOString() }
          emailsSent++
        } catch (e) { console.error('[health] fulfillmentWarn email error:', e) }
      }
    }

    // ── Persist changes ──────────────────────────────────────────────────────
    const emailsChanged = JSON.stringify(newEmails) !== JSON.stringify(emails)
    if (Object.keys(updates).length > 0 || emailsChanged) {
      if (emailsChanged) updates.healthEmailSentAt = JSON.stringify(newEmails)
      await prisma.creatorProfile.update({
        where: { id: creator.id },
        data: updates as Parameters<typeof prisma.creatorProfile.update>[0]['data'],
      })
    }

    // ── Audit log for status changes ─────────────────────────────────────────
    if (statusChanged) {
      await prisma.auditEvent.create({
        data: {
          actorId: null,
          actorName: 'System (health cron)',
          action: 'creator.health_status_change',
          entityType: 'Creator',
          entityId: creator.id,
          entityLabel: `@${creator.username}`,
          reason: updates.storeStatusReason as string,
        },
      }).catch((e: unknown) => console.error('[health] audit log error:', e))
    }
  }

  return { processed, idled, hiatus, flagged, emailsSent }
}
