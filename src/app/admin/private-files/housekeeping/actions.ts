'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireStaffActor } from '@/lib/staffPolicy'
import {
  auditedDeletePrivate,
  categoryFromPath,
  isDeletionReasonCode,
  type DeletionReasonCode,
  type PrivateFileCategory,
} from '@/lib/private-file-audit'

const HOUSEKEEPING_PATH = '/admin/private-files/housekeeping'

function stripPrivatePrefix(r2Key: string): string {
  return r2Key.startsWith('private/') ? r2Key.slice('private/'.length) : r2Key
}

function categoryFromR2Key(r2Key: string, fallback: PrivateFileCategory): PrivateFileCategory {
  const without = stripPrivatePrefix(r2Key)
  const segments = without.split('/').filter(Boolean)
  return categoryFromPath(segments) ?? fallback
}

export interface PurgeDraftResult {
  ok: boolean
  error?: string
  deletedFiles?: number
}

/**
 * Purge an orphaned DRAFT creator application. Deletes every KycUpload
 * row for the user (writing audit rows + removing the R2 objects) and
 * then removes the CreatorApplication itself.
 *
 * Paranoid: we re-check that the application is still DRAFT inside the
 * transaction window — it would be dangerous to purge a recently-
 * submitted application.
 */
export async function purgeOrphanDraftAction(
  applicationId: string,
): Promise<PurgeDraftResult> {
  const actor = await requireStaffActor('files.housekeeping')

  const app = await prisma.creatorApplication.findUnique({
    where: { id: applicationId },
    select: { id: true, userId: true, status: true },
  })
  if (!app) return { ok: false, error: 'Application not found.' }
  if (app.status !== 'DRAFT') {
    return { ok: false, error: `Refusing to purge: status is ${app.status}, not DRAFT.` }
  }

  const uploads = await prisma.kycUpload.findMany({
    where: { userId: app.userId },
    select: { id: true, r2Key: true },
  })

  let deletedFiles = 0
  for (const upload of uploads) {
    try {
      await auditedDeletePrivate({
        actorType: 'STAFF',
        actorId: actor.id,
        actorName: actor.name,
        targetUserId: app.userId,
        category: categoryFromR2Key(upload.r2Key, 'kyc'),
        r2Key: upload.r2Key,
        reasonCode: 'ORPHAN_PURGE',
        reasonNote: `Orphan purge for application ${app.id}`,
        policyApplied: 'ORPHAN_7D',
      })
      deletedFiles += 1
    } catch (err) {
      console.error('[housekeeping] R2 delete failed for orphan purge', {
        r2Key: upload.r2Key.slice(0, 64),
        err: (err as Error).message,
      })
    }
  }

  // Remove DB rows. Order: kycUpload first, then application.
  await prisma.kycUpload.deleteMany({ where: { userId: app.userId } })
  await prisma.creatorApplication.delete({ where: { id: app.id } })

  revalidatePath(HOUSEKEEPING_PATH)
  return { ok: true, deletedFiles }
}

export interface DeleteKycRetentionInput {
  uploadId: string
  reasonCode: string
  reasonNote?: string
}

export interface DeleteKycRetentionResult {
  ok: boolean
  error?: string
}

/**
 * Delete a single rejected KYC upload whose retention window has
 * expired. Writes the deletion audit row before the R2 delete runs.
 */
export async function deleteKycRetentionAction(
  input: DeleteKycRetentionInput,
): Promise<DeleteKycRetentionResult> {
  const actor = await requireStaffActor('files.housekeeping')

  if (!isDeletionReasonCode(input.reasonCode)) {
    return { ok: false, error: 'Invalid reason code.' }
  }
  const reasonCode = input.reasonCode as DeletionReasonCode
  const reasonNote = (input.reasonNote ?? '').trim()
  if (reasonCode === 'OTHER' && reasonNote.length === 0) {
    return { ok: false, error: 'A note is required when the reason is "Other".' }
  }

  const upload = await prisma.kycUpload.findUnique({
    where: { id: input.uploadId },
    select: { id: true, userId: true, r2Key: true, supersededAt: true },
  })
  if (!upload) return { ok: false, error: 'Upload not found.' }
  if (upload.supersededAt) {
    return { ok: false, error: 'Upload already superseded; use a different workflow.' }
  }

  try {
    await auditedDeletePrivate({
      actorType: 'STAFF',
      actorId: actor.id,
      actorName: actor.name,
      targetUserId: upload.userId,
      category: categoryFromR2Key(upload.r2Key, 'kyc'),
      r2Key: upload.r2Key,
      reasonCode,
      reasonNote: reasonNote || null,
      policyApplied: 'KYC_REJECTED_90D',
    })
  } catch (err) {
    console.error('[housekeeping] KYC retention delete failed', {
      uploadId: upload.id,
      err: (err as Error).message,
    })
    return { ok: false, error: 'R2 delete failed. Audit row was still written.' }
  }

  await prisma.kycUpload.delete({ where: { id: upload.id } })
  revalidatePath(HOUSEKEEPING_PATH)
  return { ok: true }
}

export interface DeleteDisputeEvidenceInput {
  evidenceId: string
  reasonCode: string
  reasonNote?: string
}

export interface DeleteDisputeEvidenceResult {
  ok: boolean
  error?: string
}

/**
 * Delete a single dispute evidence file whose retention window has
 * expired (dispute closed 540+ days ago).
 */
export async function deleteDisputeEvidenceAction(
  input: DeleteDisputeEvidenceInput,
): Promise<DeleteDisputeEvidenceResult> {
  const actor = await requireStaffActor('files.housekeeping')

  if (!isDeletionReasonCode(input.reasonCode)) {
    return { ok: false, error: 'Invalid reason code.' }
  }
  const reasonCode = input.reasonCode as DeletionReasonCode
  const reasonNote = (input.reasonNote ?? '').trim()
  if (reasonCode === 'OTHER' && reasonNote.length === 0) {
    return { ok: false, error: 'A note is required when the reason is "Other".' }
  }

  const evidence = await prisma.disputeEvidence.findUnique({
    where: { id: input.evidenceId },
    select: { id: true, uploaderId: true, r2Key: true, supersededAt: true },
  })
  if (!evidence) return { ok: false, error: 'Evidence not found.' }
  if (evidence.supersededAt) {
    return { ok: false, error: 'Evidence already superseded.' }
  }

  try {
    await auditedDeletePrivate({
      actorType: 'STAFF',
      actorId: actor.id,
      actorName: actor.name,
      targetUserId: evidence.uploaderId,
      category: categoryFromR2Key(evidence.r2Key, 'dispute-evidence'),
      r2Key: evidence.r2Key,
      reasonCode,
      reasonNote: reasonNote || null,
      policyApplied: 'DISPUTE_CLOSED_540D',
    })
  } catch (err) {
    console.error('[housekeeping] dispute evidence delete failed', {
      evidenceId: evidence.id,
      err: (err as Error).message,
    })
    return { ok: false, error: 'R2 delete failed. Audit row was still written.' }
  }

  await prisma.disputeEvidence.delete({ where: { id: evidence.id } })
  revalidatePath(HOUSEKEEPING_PATH)
  return { ok: true }
}
