import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isCronAuthorized } from '@/lib/cron-auth'
import { deleteFromR2 } from '@/lib/r2'
import { RETENTION_DAYS, PER_RECIPIENT_CAP } from '@/lib/broadcasts'

// ── Broadcast retention cron ──────────────────────────────────────────────────
//
// Three sweeps per run:
//
//   1. EXPIRE: Broadcasts older than RETENTION_DAYS (30d) are hard-deleted.
//      Cascade drops their BroadcastNotification rows; we remove the R2 image
//      separately, best-effort.
//   2. PRUNE HIDDEN: BroadcastNotification rows with deletedAt set are hard
//      deleted. Keeps the per-recipient table bounded.
//   3. FIFO TRIM: Any recipient over PER_RECIPIENT_CAP (500) gets their oldest
//      notifications deleted until they're back under. Backstop for the
//      opportunistic trim we do during fan-out.
//
// GET returns a dry-run preview (no mutations). POST performs the sweep.

type RunResult = {
  expiredBroadcasts: number
  orphanImagesDeleted: number
  prunedHidden: number
  fifoTrimmed: number
  dryRun: boolean
}

async function runSweep(dryRun: boolean): Promise<RunResult> {
  const now = new Date()
  const expiryCutoff = new Date(now.getTime() - RETENTION_DAYS * 24 * 60 * 60 * 1000)

  // ── 1. Expire old broadcasts ──────────────────────────────────────────────
  const expired = await prisma.broadcast.findMany({
    where: { createdAt: { lt: expiryCutoff } },
    select: { id: true, imageKey: true },
  })

  let expiredBroadcasts = 0
  let orphanImagesDeleted = 0
  if (!dryRun) {
    for (const b of expired) {
      await prisma.broadcast.delete({ where: { id: b.id } })
      expiredBroadcasts++
      if (b.imageKey) {
        try {
          await deleteFromR2(b.imageKey)
          orphanImagesDeleted++
        } catch (err) {
          console.warn('[cron/broadcast-retention] r2 delete failed', {
            broadcastId: b.id,
            imageKey: b.imageKey,
            err: err instanceof Error ? err.message : String(err),
          })
        }
      }
    }
  } else {
    expiredBroadcasts = expired.length
    orphanImagesDeleted = expired.filter(b => b.imageKey).length
  }

  // ── 2. Prune hidden (buyer soft-deleted) rows ────────────────────────────
  const prunedHiddenResult = dryRun
    ? await prisma.broadcastNotification.count({ where: { deletedAt: { not: null } } })
    : (await prisma.broadcastNotification.deleteMany({ where: { deletedAt: { not: null } } })).count

  // ── 3. FIFO trim any recipient above the cap ─────────────────────────────
  // Most recipients won't be over the cap on any given run, so we check via
  // groupBy first and only trim the heavy hitters. `having` isn't portable in
  // Prisma groupBy, so we pull the counts and filter in JS.
  const counts = await prisma.broadcastNotification.groupBy({
    by: ['recipientId'],
    _count: { _all: true },
    where: { deletedAt: null },
  })
  const overCap = counts.filter(c => c._count._all > PER_RECIPIENT_CAP)

  let fifoTrimmed = 0
  if (!dryRun) {
    for (const row of overCap) {
      const overflow = row._count._all - PER_RECIPIENT_CAP
      const oldest = await prisma.broadcastNotification.findMany({
        where: { recipientId: row.recipientId, deletedAt: null },
        orderBy: { createdAt: 'asc' },
        take: overflow,
        select: { id: true },
      })
      if (oldest.length === 0) continue
      const res = await prisma.broadcastNotification.deleteMany({
        where: { id: { in: oldest.map(r => r.id) } },
      })
      fifoTrimmed += res.count
    }
  } else {
    fifoTrimmed = overCap.reduce((s, r) => s + (r._count._all - PER_RECIPIENT_CAP), 0)
  }

  return { expiredBroadcasts, orphanImagesDeleted, prunedHidden: prunedHiddenResult, fifoTrimmed, dryRun }
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
    console.error('[cron/broadcast-retention]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export const POST = handle
export const GET = handle
