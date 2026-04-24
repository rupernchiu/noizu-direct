// Private file serving — auth + audit gate.
//
// All bytes under R2 `private/` prefix flow through this route so we can:
//   1. Check authorization per category.
//   2. Write a PrivateFileAccess row for every successful read (STAFF or OWNER).
//   3. Enforce "what's your reason?" for staff (X-Access-Reason header).
//
// Authorization matrix:
//   identity           → StaffUser with kyc.review perm  OR  owner (userId in path)
//   dispute-evidence   → StaffUser with disputes.review  OR  dispute party (raiser/creator)
//   message-attachment → Ticket buyer or creator          OR  StaffUser w/ disputes.review
//
// H5 — we stream bytes through Next; NEVER 307-redirect to a presigned R2 URL
// (signed URLs leak via browser history, Referer, and R2 access logs).

import { auth } from '@/lib/auth'
import { getR2Object } from '@/lib/r2'
import { prisma } from '@/lib/prisma'
import { Readable } from 'stream'
import { loadStaffActor, can, type StaffActor } from '@/lib/staffPolicy'
import {
  logPrivateFileAccess,
  isAccessReasonCode,
  categoryFromPath,
  type AccessReasonCode,
  type PrivateFileCategory,
} from '@/lib/private-file-audit'

// NextAuth's `auth()` is overloaded (middleware + handler + zero-arg); the
// zero-arg call returns `Session | null`. TypeScript's ReturnType picks the
// middleware overload, so we narrow manually.
type AuthSession = {
  user?: {
    id?: string
    name?: string | null
    email?: string | null
    role?: 'BUYER' | 'CREATOR' | 'ADMIN'
  }
} | null

const STREAMED_PRIVATE_CATEGORIES = new Set<PrivateFileCategory>([
  'identity',
  'dispute-evidence',
  'message-attachment',
  'kyc',
])

// identity + dispute-evidence require a reason from staff.
const STAFF_REASON_REQUIRED: Record<PrivateFileCategory, boolean> = {
  identity:            true,
  'dispute-evidence':  true,
  'message-attachment': false, // routine CS work; reason optional
  kyc:                 true,
}

// Map category → permission shortcode required of staff.
const STAFF_PERM: Record<PrivateFileCategory, string> = {
  identity:            'kyc.review',
  kyc:                 'kyc.review',
  'dispute-evidence':  'disputes.review',
  'message-attachment': 'disputes.review',
}

type AuthDecision =
  | { allow: true; actor: AccessActor; targetUserId: string | null }
  | { allow: false; status: 401 | 403 | 404; reason: string }

type AccessActor =
  | { type: 'STAFF'; id: string; name: string; reasonCode: AccessReasonCode; reasonNote: string | null }
  | { type: 'OWNER'; id: string; name: string }

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params

  // ── Path traversal guard ───────────────────────────────────────────────────
  if (!segments.length || segments.some((s) => s === '..' || s === '.' || s === '')) {
    return new Response('Bad Request', { status: 400 })
  }

  const category = categoryFromPath(segments)
  if (!category) return new Response('Forbidden', { status: 403 })

  const filePath = segments.join('/')
  const r2Key = `private/${filePath}`
  const viewerUrl = `/api/files/${filePath}`

  // ── Identify caller (staff vs. owner vs. unauthenticated) ─────────────────
  const staffActor = await loadStaffActor()
  const userSession = (await auth()) as AuthSession

  const decision = await decide({
    category,
    segments,
    viewerUrl,
    staffActor,
    userSession,
    request,
  })

  if (!decision.allow) {
    return new Response(decision.reason, { status: decision.status })
  }

  // ── Fetch bytes ────────────────────────────────────────────────────────────
  if (!STREAMED_PRIVATE_CATEGORIES.has(category)) {
    return new Response('Not Found', { status: 404 })
  }

  let obj
  try {
    obj = await getR2Object(r2Key, 'private')
  } catch (err) {
    console.warn('[files] object fetch failed', {
      category,
      keyPreview: r2Key.slice(0, 64),
      err: (err as Error).message,
    })
    return new Response('Not Found', { status: 404 })
  }

  const body = obj.Body as Readable | undefined
  if (!body) return new Response('Not Found', { status: 404 })

  // ── Write access audit row (fire-and-forget; do not block bytes) ──────────
  const actor = decision.actor
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    null
  const ua = request.headers.get('user-agent') ?? null

  void logPrivateFileAccess({
    actorType: actor.type,
    actorId: actor.id,
    actorName: actor.name,
    targetUserId: decision.targetUserId,
    category,
    r2Key,
    reasonCode: actor.type === 'STAFF' ? actor.reasonCode : 'OWNER_SELF_VIEW',
    reasonNote: actor.type === 'STAFF' ? actor.reasonNote : null,
    ipAddress: ip,
    userAgent: ua,
  })

  // Cast Node Readable → Web ReadableStream. AWS SDK types this as a
  // SdkStream which is compatible with `Readable.toWeb` at runtime.
  const web = Readable.toWeb(body as Readable) as unknown as ReadableStream<Uint8Array>

  // Dispute evidence forced to attachment so admins reviewing don't
  // accidentally inline a PDF with active JS.
  const disposition = category === 'dispute-evidence' ? 'attachment' : 'inline'

  const headers = new Headers({
    'Content-Type': obj.ContentType ?? 'application/octet-stream',
    'Content-Disposition': disposition,
    'Cache-Control': 'no-store',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
  })
  if (obj.ContentLength) headers.set('Content-Length', String(obj.ContentLength))

  return new Response(web, { headers })
}

// ── Authorization decision ───────────────────────────────────────────────────
// Staff path first: if a staff session exists, require the per-category perm
// and an access reason. Fall back to user-session checks (owner self-view,
// dispute-party view, message sender/receiver).

async function decide(args: {
  category: PrivateFileCategory
  segments: string[]
  viewerUrl: string
  staffActor: StaffActor | null
  userSession: AuthSession
  request: Request
}): Promise<AuthDecision> {
  const { category, segments, viewerUrl, staffActor, userSession, request } = args

  // ── Staff short-circuit ────────────────────────────────────────────────────
  if (staffActor) {
    const perm = STAFF_PERM[category]
    if (!can(staffActor, perm)) {
      return { allow: false, status: 403, reason: 'Forbidden (missing permission)' }
    }

    let reasonCode: AccessReasonCode | null = null
    let reasonNote: string | null = null

    const rawReason = request.headers.get('x-access-reason')
    const rawNote = request.headers.get('x-access-reason-note')

    if (rawReason && isAccessReasonCode(rawReason)) {
      reasonCode = rawReason
      reasonNote = rawNote && rawNote.trim() ? rawNote.slice(0, 1000) : null
      if (reasonCode === 'OTHER' && !reasonNote) {
        return { allow: false, status: 403, reason: 'Reason note required when reasonCode=OTHER' }
      }
    } else if (STAFF_REASON_REQUIRED[category]) {
      return { allow: false, status: 403, reason: 'X-Access-Reason header required' }
    } else {
      reasonCode = 'CS_TICKET'
    }

    const targetUserId = await inferTargetUserId(category, segments, viewerUrl)

    return {
      allow: true,
      actor: {
        type: 'STAFF',
        id: staffActor.id,
        name: `${staffActor.name} <${staffActor.email}>`,
        reasonCode,
        reasonNote,
      },
      targetUserId,
    }
  }

  // ── Main-admin (User.role === 'ADMIN') bypass ─────────────────────────────
  // The primary admin account isn't a StaffUser row but still needs access
  // for review flows. Treat them like a super-admin staff actor: reason
  // header required per STAFF_REASON_REQUIRED, audit row written as STAFF.
  if (userSession?.user?.role === 'ADMIN' && userSession.user.id) {
    let reasonCode: AccessReasonCode | null = null
    let reasonNote: string | null = null

    const rawReason = request.headers.get('x-access-reason')
    const rawNote = request.headers.get('x-access-reason-note')

    if (rawReason && isAccessReasonCode(rawReason)) {
      reasonCode = rawReason
      reasonNote = rawNote && rawNote.trim() ? rawNote.slice(0, 1000) : null
      if (reasonCode === 'OTHER' && !reasonNote) {
        return { allow: false, status: 403, reason: 'Reason note required when reasonCode=OTHER' }
      }
    } else if (STAFF_REASON_REQUIRED[category]) {
      return { allow: false, status: 403, reason: 'X-Access-Reason header required' }
    } else {
      reasonCode = 'CS_TICKET'
    }

    const targetUserId = await inferTargetUserId(category, segments, viewerUrl)
    const adminName =
      userSession.user.name ??
      userSession.user.email ??
      userSession.user.id
    const adminEmail = userSession.user.email ?? ''

    return {
      allow: true,
      actor: {
        type: 'STAFF',
        id: userSession.user.id,
        name: adminEmail ? `${adminName} <${adminEmail}>` : adminName,
        reasonCode,
        reasonNote,
      },
      targetUserId,
    }
  }

  // ── User (non-staff) path ──────────────────────────────────────────────────
  const userId = userSession?.user?.id as string | undefined
  if (!userId) {
    return { allow: false, status: 401, reason: 'Unauthorized' }
  }
  const userName =
    (userSession?.user?.name as string | undefined) ??
    (userSession?.user?.email as string | undefined) ??
    userId

  if (category === 'identity' || category === 'kyc') {
    // Path is /api/files/identity/<userId>/<filename> — owner self-view only.
    // Legacy KycUpload rows written before H6 may not have user-scoped paths;
    // fall back to a DB lookup by viewerUrl.
    const pathUserId = segments[1]
    if (pathUserId && pathUserId === userId) {
      return {
        allow: true,
        actor: { type: 'OWNER', id: userId, name: userName },
        targetUserId: userId,
      }
    }
    const row = await prisma.kycUpload.findFirst({
      where: { viewerUrl, userId },
      select: { userId: true },
    })
    if (row) {
      return {
        allow: true,
        actor: { type: 'OWNER', id: userId, name: userName },
        targetUserId: userId,
      }
    }
    return { allow: false, status: 403, reason: 'Forbidden' }
  }

  if (category === 'dispute-evidence') {
    const ev = await prisma.disputeEvidence.findFirst({
      where: { viewerUrl },
      select: {
        uploaderId: true,
        dispute: { select: { raisedBy: true, order: { select: { creatorId: true } } } },
      },
    })
    if (!ev) {
      // Legacy evidence stored only in Dispute.evidence JSON arrays — fall
      // back to checking Dispute.evidence / creatorEvidence string contains
      // the viewerUrl, then match by raiser/creator.
      const legacy = await prisma.dispute.findFirst({
        where: {
          OR: [
            { evidence: { contains: viewerUrl } },
            { creatorEvidence: { contains: viewerUrl } },
          ],
        },
        select: { raisedBy: true, order: { select: { creatorId: true } } },
      })
      if (!legacy) return { allow: false, status: 404, reason: 'Not Found' }
      const creatorUserId = legacy.order?.creatorId
      if (legacy.raisedBy === userId || creatorUserId === userId) {
        return {
          allow: true,
          actor: { type: 'OWNER', id: userId, name: userName },
          targetUserId: userId,
        }
      }
      return { allow: false, status: 403, reason: 'Forbidden' }
    }

    const creatorUserId = ev.dispute?.order?.creatorId
    const isParty =
      ev.uploaderId === userId ||
      ev.dispute?.raisedBy === userId ||
      creatorUserId === userId
    if (!isParty) return { allow: false, status: 403, reason: 'Forbidden' }
    return {
      allow: true,
      actor: { type: 'OWNER', id: userId, name: userName },
      targetUserId: ev.uploaderId,
    }
  }

  if (category === 'message-attachment') {
    const attachment = await prisma.ticketAttachment.findFirst({
      where: { viewerUrl },
      select: {
        uploaderId: true,
        ticket: { select: { buyerId: true, creatorId: true } },
      },
    })
    if (!attachment) return { allow: false, status: 404, reason: 'Not Found' }
    const { buyerId, creatorId } = attachment.ticket
    if (buyerId !== userId && creatorId !== userId) {
      return { allow: false, status: 403, reason: 'Forbidden' }
    }
    return {
      allow: true,
      actor: { type: 'OWNER', id: userId, name: userName },
      targetUserId: attachment.uploaderId,
    }
  }

  return { allow: false, status: 403, reason: 'Forbidden' }
}

// Best-effort lookup of the file's owning user, used only for audit tagging.
// Failures here MUST NOT block access; they just mean targetUserId is null.
async function inferTargetUserId(
  category: PrivateFileCategory,
  segments: string[],
  viewerUrl: string,
): Promise<string | null> {
  try {
    if (category === 'identity' || category === 'kyc') {
      // Preferred: userId is path segment 1. Fall back to DB lookup.
      if (segments[1]) return segments[1]
      const row = await prisma.kycUpload.findFirst({
        where: { viewerUrl },
        select: { userId: true },
      })
      return row?.userId ?? null
    }
    if (category === 'dispute-evidence') {
      const ev = await prisma.disputeEvidence.findFirst({
        where: { viewerUrl },
        select: { uploaderId: true },
      })
      return ev?.uploaderId ?? null
    }
    if (category === 'message-attachment') {
      const att = await prisma.ticketAttachment.findFirst({
        where: { viewerUrl },
        select: { uploaderId: true },
      })
      return att?.uploaderId ?? null
    }
  } catch {
    return null
  }
  return null
}
