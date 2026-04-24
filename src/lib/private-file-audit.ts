// Server-only audit helpers for private R2 objects.
//
// Every read of a private R2 object (KYC image, dispute evidence, message
// attachment) by a staff member MUST log one PrivateFileAccess row. Owner
// self-views (a creator looking at their own submitted ID) also log so we
// have a full picture if anything is disputed later.
//
// Every admin-initiated deletion of a private R2 object MUST log one
// PrivateFileDeletion row *before* the R2 delete runs — no row, no delete.
//
// NOTE: Pure constants/types live in `./private-file-audit-types` so client
// components (reason modal, view buttons) can import them without dragging
// the prisma → pg → dns chain into the browser bundle.

import { prisma } from './prisma'
import type {
  PrivateFileCategory,
  ActorType,
  AccessReasonCode,
  DeletionReasonCode,
} from './private-file-audit-types'

export type {
  PrivateFileCategory,
  ActorType,
  AccessReasonCode,
  DeletionReasonCode,
} from './private-file-audit-types'
export {
  ACCESS_REASON_CODES,
  ACCESS_REASON_LABELS,
  DELETION_REASON_CODES,
  DELETION_REASON_LABELS,
  isAccessReasonCode,
  isDeletionReasonCode,
  categoryFromPath,
} from './private-file-audit-types'

export interface AccessLogArgs {
  actorType: ActorType
  actorId: string | null
  actorName: string
  targetUserId: string | null
  category: PrivateFileCategory
  r2Key: string
  reasonCode: AccessReasonCode
  reasonNote?: string | null
  ipAddress?: string | null
  userAgent?: string | null
}

export async function logPrivateFileAccess(args: AccessLogArgs) {
  try {
    await prisma.privateFileAccess.create({
      data: {
        actorType: args.actorType,
        actorId: args.actorId,
        actorName: args.actorName,
        targetUserId: args.targetUserId,
        category: args.category,
        r2Key: args.r2Key,
        reasonCode: args.reasonCode,
        reasonNote: args.reasonNote ?? null,
        ipAddress: args.ipAddress ?? null,
        userAgent: args.userAgent ?? null,
      },
    })
  } catch (err) {
    // Audit logging must never block serving bytes, but a failure is
    // suspicious — surface it loudly so ops sees it.
    console.error('[private-file-audit] access log failed', {
      category: args.category,
      r2Key: args.r2Key.slice(0, 64),
      err: (err as Error).message,
    })
  }
}

export interface DeletionLogArgs {
  actorType: ActorType
  actorId: string | null
  actorName: string
  targetUserId: string | null
  category: PrivateFileCategory
  r2Key: string
  reasonCode: DeletionReasonCode
  reasonNote?: string | null
  policyApplied?: string | null
  ipAddress?: string | null
}

export async function logPrivateFileDeletion(args: DeletionLogArgs) {
  return prisma.privateFileDeletion.create({
    data: {
      actorType: args.actorType,
      actorId: args.actorId,
      actorName: args.actorName,
      targetUserId: args.targetUserId,
      category: args.category,
      r2Key: args.r2Key,
      reasonCode: args.reasonCode,
      reasonNote: args.reasonNote ?? null,
      policyApplied: args.policyApplied ?? null,
      ipAddress: args.ipAddress ?? null,
    },
  })
}

// Deletion writes the audit row first (throws if it fails) then runs the R2
// delete. This is the ONE code path admin UIs should call when removing
// private bucket objects. Crons that purge orphans use it too.
// The CI guard (scripts/check-r2-delete-guard.mjs) blocks any other call
// site from importing deleteFromR2 directly.
export async function auditedDeletePrivate(args: DeletionLogArgs) {
  await logPrivateFileDeletion(args)
  const { deleteFromR2 } = await import('./r2')
  await deleteFromR2(args.r2Key)
}
