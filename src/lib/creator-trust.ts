import { prisma } from '@/lib/prisma'

/**
 * Returns extra escrow hold days for a creator who hasn't yet graduated:
 * KYC verified (creatorVerificationStatus=VERIFIED) AND 10+ completed orders.
 * Once both conditions are met, returns 0.
 */
export async function getNewCreatorExtraDays(creatorUserId: string): Promise<number> {
  const settings = await prisma.platformSettings.findFirst()
  const extraDays = settings?.newCreatorEscrowExtraDays ?? 7
  const threshold = settings?.newCreatorTransactionThreshold ?? 10

  const user = await prisma.user.findUnique({
    where: { id: creatorUserId },
    select: { creatorVerificationStatus: true },
  })

  const kycVerified = user?.creatorVerificationStatus === 'VERIFIED'

  if (kycVerified) {
    const completedCount = await prisma.order.count({
      where: { creatorId: creatorUserId, status: 'COMPLETED' },
    })
    if (completedCount >= threshold) return 0
  }

  return extraDays
}

/**
 * Returns true if a creator has completed KYC AND has 10+ completed orders.
 */
export async function isGraduatedCreator(creatorUserId: string): Promise<boolean> {
  return (await getNewCreatorExtraDays(creatorUserId)) === 0
}
