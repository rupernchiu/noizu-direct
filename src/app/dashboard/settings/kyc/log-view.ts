'use server'

// Fire-and-forget server action to record an OWNER_SELF_VIEW audit row when
// a creator's KYC settings page thumbnails render. Called from the client
// component on mount. Never blocks rendering, never throws user-visible
// errors — audit log writes are best-effort.

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logPrivateFileAccess } from '@/lib/private-file-audit'

const ALLOWED = new Set(['id_front', 'id_back', 'selfie'])

export async function logKycSelfView(category: string): Promise<void> {
  try {
    if (!ALLOWED.has(category)) return
    const session = (await auth()) as {
      user?: { id?: string; name?: string | null; email?: string | null }
    } | null
    const userId = session?.user?.id
    if (!userId) return

    const upload = await prisma.kycUpload.findFirst({
      where: { userId, category, supersededAt: null },
      select: { r2Key: true },
      orderBy: { createdAt: 'desc' },
    })
    if (!upload) return

    await logPrivateFileAccess({
      actorType: 'OWNER',
      actorId: userId,
      actorName:
        session?.user?.name ??
        session?.user?.email ??
        userId,
      targetUserId: userId,
      category: 'kyc',
      r2Key: upload.r2Key,
      reasonCode: 'OWNER_SELF_VIEW',
      reasonNote: null,
    })
  } catch (err) {
    // Silent failure — surfaces only in server logs.
    console.warn('[kyc/log-view] failed', { err: (err as Error).message })
  }
}
