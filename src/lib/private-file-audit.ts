// Private-file access audit helpers.
//
// Every read of a private R2 object (KYC image, dispute evidence, message
// attachment) by a staff member MUST log one PrivateFileAccess row. Owner
// self-views (a creator looking at their own submitted ID) also log so we
// have a full picture if anything is disputed later.
//
// Every admin-initiated deletion of a private R2 object MUST log one
// PrivateFileDeletion row *before* the R2 delete runs — no row, no delete.

import { prisma } from './prisma'

export type PrivateFileCategory =
  | 'identity'
  | 'dispute-evidence'
  | 'message-attachment'
  | 'kyc'

export type ActorType = 'STAFF' | 'OWNER' | 'SYSTEM'

export const ACCESS_REASON_CODES = [
  'KYC_REVIEW',
  'DISPUTE_REVIEW',
  'COMPLIANCE_AUDIT',
  'CS_TICKET',
  'OWNER_SELF_VIEW',
  'LEGAL_REQUEST',
  'OTHER',
] as const
export type AccessReasonCode = typeof ACCESS_REASON_CODES[number]

export const DELETION_REASON_CODES = [
  'ORPHAN_PURGE',
  'KYC_RETENTION_EXPIRED',
  'DISPUTE_RETENTION_EXPIRED',
  'LEGAL_REQUEST',
  'GDPR_ERASURE',
  'DUPLICATE',
  'TEST_DATA',
  'OTHER',
] as const
export type DeletionReasonCode = typeof DELETION_REASON_CODES[number]

export const ACCESS_REASON_LABELS: Record<AccessReasonCode, string> = {
  KYC_REVIEW:       'Reviewing a KYC application',
  DISPUTE_REVIEW:   'Investigating a dispute',
  COMPLIANCE_AUDIT: 'Compliance / anti-fraud audit',
  CS_TICKET:        'Customer support ticket',
  OWNER_SELF_VIEW:  'Owner self-view (automatic)',
  LEGAL_REQUEST:    'Responding to a legal request',
  OTHER:            'Other (explain in notes)',
}

export const DELETION_REASON_LABELS: Record<DeletionReasonCode, string> = {
  ORPHAN_PURGE:              'Orphan purge (draft inactive 7+ days)',
  KYC_RETENTION_EXPIRED:     'KYC retention expired (rejected 90+ days)',
  DISPUTE_RETENTION_EXPIRED: 'Dispute evidence retention expired (closed 540+ days)',
  LEGAL_REQUEST:             'Legal / subpoena-driven removal',
  GDPR_ERASURE:              'GDPR / DPA right-to-erasure',
  DUPLICATE:                 'Duplicate / corrupt upload',
  TEST_DATA:                 'Test-data cleanup',
  OTHER:                     'Other (explain in notes)',
}

export function isAccessReasonCode(v: string): v is AccessReasonCode {
  return (ACCESS_REASON_CODES as readonly string[]).includes(v)
}

export function isDeletionReasonCode(v: string): v is DeletionReasonCode {
  return (DELETION_REASON_CODES as readonly string[]).includes(v)
}

export function categoryFromPath(segments: string[]): PrivateFileCategory | null {
  const first = segments[0]
  if (first === 'identity') return 'identity'
  if (first === 'dispute-evidence' || first === 'dispute_evidence') return 'dispute-evidence'
  if (first === 'message-attachment' || first === 'message_attachment') return 'message-attachment'
  if (first === 'kyc') return 'kyc'
  return null
}

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

// Shared minimum: deletion writes the audit row first (throws if it fails)
// then runs the R2 delete. This is the ONE code path admin UIs should call
// when removing private bucket objects. Crons that purge orphans use it too.
// The CI guard check (see scripts/check-r2-delete-guard.mjs) blocks any
// other call site from importing deleteFromR2 directly.
export async function auditedDeletePrivate(args: DeletionLogArgs) {
  await logPrivateFileDeletion(args)
  const { deleteFromR2 } = await import('./r2')
  await deleteFromR2(args.r2Key)
}
