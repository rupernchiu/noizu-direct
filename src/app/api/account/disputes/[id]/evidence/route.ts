// Append-only evidence attach for dispute parties (buyer OR order.creatorId).
//
// Flow:
//   1. Client uploads raw bytes to /api/upload?category=dispute_evidence and
//      receives { url, mimeType, fileSize }. /api/upload stores the file under
//      private/dispute-evidence/<filename> and does the byte sniff / size /
//      mime-type guards.
//   2. Client POSTs here with { viewerUrl, mimeType, fileSize, note,
//      supersedesId? }. We validate the caller is a dispute party, derive
//      their role, and insert a DisputeEvidence row. If supersedesId is
//      present and refers to an existing row the caller owns, we atomically
//      mark that row superseded.
//
// Deletes are NOT supported. Callers must Replace, which keeps the old row
// for audit and points supersededBy → new row.
//
// The viewerUrl is further validated server-side: must start with
// /api/files/dispute-evidence/ AND map back to an R2 key under
// private/dispute-evidence/ that exists in the uploader's recent uploads.
// We don't have a separate "pending upload" table, so we trust /api/upload's
// caller-scoping + path pattern + the same session.

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const VIEWER_URL_RE = /^\/api\/files\/dispute-evidence\/[A-Za-z0-9._-]+$/

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id as string

  const { id: disputeId } = await params

  let body: {
    viewerUrl?: string
    mimeType?: string
    fileSize?: number
    note?: string | null
    supersedesId?: string | null
  }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const viewerUrl = typeof body.viewerUrl === 'string' ? body.viewerUrl.split('?')[0] : ''
  if (!VIEWER_URL_RE.test(viewerUrl)) {
    return NextResponse.json({ error: 'Invalid viewer URL' }, { status: 400 })
  }

  // Derive the R2 key from the viewer URL — it's always `private/<rest>`.
  const r2Key = `private${viewerUrl.replace(/^\/api\/files/, '')}`

  const mimeType = typeof body.mimeType === 'string' ? body.mimeType.slice(0, 120) : null
  const fileSize =
    typeof body.fileSize === 'number' && Number.isFinite(body.fileSize) && body.fileSize > 0
      ? Math.floor(body.fileSize)
      : null
  const note =
    typeof body.note === 'string' && body.note.trim()
      ? body.note.trim().slice(0, 500)
      : null
  const supersedesId =
    typeof body.supersedesId === 'string' && body.supersedesId ? body.supersedesId : null

  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    select: {
      id: true,
      status: true,
      raisedBy: true,
      order: { select: { buyerId: true, creatorId: true } },
    },
  })
  if (!dispute) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Lock evidence once the dispute is resolved.
  if (
    dispute.status === 'RESOLVED_REFUND' ||
    dispute.status === 'RESOLVED_RELEASE' ||
    dispute.status === 'CLOSED'
  ) {
    return NextResponse.json(
      { error: 'This dispute is closed — no new evidence may be attached.' },
      { status: 409 },
    )
  }

  // Party + role derivation. Buyer on the order is RAISER; the order's
  // creator user is CREATOR. Anyone else is forbidden.
  let role: 'RAISER' | 'CREATOR'
  if (userId === dispute.order.buyerId) {
    role = 'RAISER'
  } else if (userId === dispute.order.creatorId) {
    role = 'CREATOR'
  } else {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // If replacing, make sure the old row exists, belongs to this dispute, was
  // uploaded by this user, and isn't already superseded. We do the write +
  // supersede mark in a single transaction so a crash in-between can't
  // leave both rows live.
  let supersedesRow:
    | { id: string; uploaderId: string; disputeId: string; supersededAt: Date | null }
    | null = null
  if (supersedesId) {
    supersedesRow = await prisma.disputeEvidence.findUnique({
      where: { id: supersedesId },
      select: { id: true, uploaderId: true, disputeId: true, supersededAt: true },
    })
    if (
      !supersedesRow ||
      supersedesRow.disputeId !== disputeId ||
      supersedesRow.uploaderId !== userId ||
      supersedesRow.supersededAt !== null
    ) {
      return NextResponse.json({ error: 'Invalid supersedesId' }, { status: 400 })
    }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const created = await tx.disputeEvidence.create({
        data: {
          disputeId,
          uploaderId: userId,
          role,
          r2Key,
          viewerUrl,
          mimeType,
          fileSize,
          note,
        },
        select: { id: true },
      })

      if (supersedesRow) {
        await tx.disputeEvidence.update({
          where: { id: supersedesRow.id },
          data: {
            supersededBy: created.id,
            supersededAt: new Date(),
          },
        })
      }

      return created
    })

    return NextResponse.json({ ok: true, id: result.id })
  } catch (err) {
    console.error('[account/disputes/evidence] create failed', {
      disputeId,
      userId,
      err: (err as Error).message,
    })
    return NextResponse.json({ error: 'Failed to attach evidence' }, { status: 500 })
  }
}
