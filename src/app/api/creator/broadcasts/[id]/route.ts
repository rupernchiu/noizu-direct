import { NextResponse } from 'next/server'
import { requireCreatorProfile } from '@/lib/guards'
import { prisma } from '@/lib/prisma'
import { deleteFromR2 } from '@/lib/r2'

// DELETE /api/creator/broadcasts/[id] — creator-initiated hard delete.
// Cascades through to BroadcastNotification via the FK, and frees the R2
// hero image if one was attached. Matches the "your page, your view" model:
// the broadcast disappears for everyone, not just the creator.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireCreatorProfile()
  if (!guard) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params

  const broadcast = await prisma.broadcast.findUnique({
    where: { id },
    select: { id: true, creatorId: true, imageKey: true },
  })
  if (!broadcast) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (broadcast.creatorId !== guard.profile.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.broadcast.delete({ where: { id } })

  if (broadcast.imageKey) {
    // Best-effort: if R2 delete fails we still return 200 — the DB row is gone,
    // and the retention cron will pick up orphan keys on its next pass.
    try {
      await deleteFromR2(broadcast.imageKey)
    } catch (err) {
      console.warn('[broadcast-delete] r2 cleanup failed', {
        broadcastId: id,
        imageKey: broadcast.imageKey,
        err: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return NextResponse.json({ ok: true })
}
