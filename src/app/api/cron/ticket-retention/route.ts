import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isCronAuthorized } from '@/lib/cron-auth'
import { isAutoCloseBlocked } from '@/lib/tickets'

// ── Ticket retention cron ────────────────────────────────────────────────────
//
// Two sweeps run every time this endpoint fires:
//
//   1. AUTO-CLOSE: GENERAL tickets with 30-day two-sided silence and no
//      linked work in progress. Tickets with a money-attached flow (order,
//      quote, commission request) are skipped — those close only when the
//      underlying work settles.
//
//   2. PURGE: tickets whose purgeAt < now AND whose linked order has no
//      active dispute. Cascades through TicketMessage / TicketAttachment /
//      TicketReadMarker via schema-defined onDelete.
//
// POST triggers a normal run; GET returns a dry-run preview for admins.

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000

type RunResult = {
  autoClosed: number
  autoCloseSkipped: number
  purged: number
  purgePaused: number
  dryRun: boolean
}

async function runSweep(dryRun: boolean): Promise<RunResult> {
  const now = new Date()
  const idleCutoff = new Date(now.getTime() - THIRTY_DAYS_MS)

  // ── 1. Auto-close candidates ──────────────────────────────────────────────
  const staleOpen = await prisma.ticket.findMany({
    where: {
      status: 'OPEN',
      kind: 'GENERAL',
      lastMessageAt: { lt: idleCutoff },
    },
    select: {
      id: true,
      buyerId: true,
      creatorId: true,
      lastBuyerMessageAt: true,
      lastCreatorMessageAt: true,
    },
  })

  let autoClosed = 0
  let autoCloseSkipped = 0
  for (const t of staleOpen) {
    // Two-sided silence requires both sides (or the missing side, which reads
    // as "never posted") to be before cutoff.
    const buyerIdle = !t.lastBuyerMessageAt || t.lastBuyerMessageAt < idleCutoff
    const creatorIdle = !t.lastCreatorMessageAt || t.lastCreatorMessageAt < idleCutoff
    if (!buyerIdle || !creatorIdle) continue

    const blocker = await isAutoCloseBlocked(t.id)
    if (blocker) {
      autoCloseSkipped++
      continue
    }

    if (!dryRun) {
      await prisma.$transaction(async (tx) => {
        await tx.ticket.update({
          where: { id: t.id },
          data: {
            status: 'CLOSED',
            closedAt: now,
            closedById: null,
            closeReason: 'AUTO_INACTIVITY',
            purgeAt: new Date(now.getTime() + NINETY_DAYS_MS),
            lastMessageAt: now,
          },
        })
        await tx.ticketMessage.create({
          data: {
            ticketId: t.id,
            // System messages need a valid senderId; the creator owns the
            // thread, so credit them as author of the system event row.
            senderId: t.creatorId,
            body: 'Ticket auto-closed after 30 days of silence on both sides.',
            systemKind: 'AUTO_CLOSED',
            createdAt: now,
          },
        })
      })
    }
    autoClosed++
  }

  // ── 2. Purge candidates ───────────────────────────────────────────────────
  const duePurge = await prisma.ticket.findMany({
    where: {
      status: 'CLOSED',
      purgeAt: { lt: now },
    },
    select: {
      id: true,
      orderId: true,
      order: { select: { dispute: { select: { status: true } } } },
    },
  })

  let purged = 0
  let purgePaused = 0
  for (const t of duePurge) {
    const disputeStatus = t.order?.dispute?.status
    if (disputeStatus && ['OPEN', 'UNDER_REVIEW'].includes(disputeStatus)) {
      purgePaused++
      continue
    }
    if (!dryRun) {
      // Cascade handles TicketMessage / TicketAttachment / TicketReadMarker.
      // R2 blob cleanup is intentionally separate — private-bucket-reconcile
      // handles the object deletion so this cron never calls deleteFromR2.
      await prisma.ticket.delete({ where: { id: t.id } })
    }
    purged++
  }

  return { autoClosed, autoCloseSkipped, purged, purgePaused, dryRun }
}

async function handle(req: NextRequest) {
  if (!(await isCronAuthorized(req))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const dryRun = new URL(req.url).searchParams.get('dryRun') === '1'
  try {
    const result = await runSweep(dryRun)
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    console.error('[cron/ticket-retention]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export const POST = handle
export const GET = handle
