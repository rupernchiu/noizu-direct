// Pure constants and types shared between server audit code and client
// components (reason-picker UIs). Split out of private-file-audit.ts so
// client bundles don't pull in prisma → pg → dns/tls.

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
