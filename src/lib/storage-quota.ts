import { prisma } from '@/lib/prisma'

export const MB = 1024 * 1024
export const GB = 1024 * 1024 * 1024

export interface QuotaInfo {
  plan: string            // FREE | CREATOR | PRO
  baseBytes: number       // plan's base quota
  bonusBytes: number      // admin-granted
  quotaBytes: number      // base + bonus
  usedBytes: number
  hardLimitBytes: number  // quota * (1 + grace/100)
  overagePercent: number  // grace band
  isOverSoft: boolean     // usedBytes > quotaBytes
  isOverHard: boolean     // usedBytes > hardLimitBytes
}

const DEFAULT_FREE_MB = 2048
const DEFAULT_CREATOR_GB = 25
const DEFAULT_PRO_GB = 100
const DEFAULT_GRACE_PERCENT = 10

export async function getUserStorageUsageBytes(userId: string): Promise<number> {
  const r = await prisma.media.aggregate({
    where: { uploadedBy: userId },
    _sum: { fileSize: true },
  })
  return Number(r._sum.fileSize ?? 0)
}

export async function getUserQuota(userId: string): Promise<QuotaInfo> {
  const [user, config, usedBytes] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { storagePlan: true, storageBonusMb: true },
    }),
    prisma.storagePricingConfig.findUnique({ where: { id: 'config' } }),
    getUserStorageUsageBytes(userId),
  ])
  if (!user) throw new Error('User not found')

  const plan = user.storagePlan ?? 'FREE'
  const baseBytes = planBytes(plan, config)
  const bonusBytes = (user.storageBonusMb ?? 0) * MB
  const quotaBytes = baseBytes + bonusBytes
  const gracePercent = config?.overageGracePercent ?? DEFAULT_GRACE_PERCENT
  const hardLimitBytes = Math.floor(quotaBytes * (1 + gracePercent / 100))

  return {
    plan,
    baseBytes,
    bonusBytes,
    quotaBytes,
    usedBytes,
    hardLimitBytes,
    overagePercent: gracePercent,
    isOverSoft: usedBytes > quotaBytes,
    isOverHard: usedBytes > hardLimitBytes,
  }
}

function planBytes(plan: string, config: { freePlanMb: number; creatorPlanGb: number; proPlanGb: number } | null): number {
  if (plan === 'CREATOR') return (config?.creatorPlanGb ?? DEFAULT_CREATOR_GB) * GB
  if (plan === 'PRO') return (config?.proPlanGb ?? DEFAULT_PRO_GB) * GB
  return (config?.freePlanMb ?? DEFAULT_FREE_MB) * MB
}

/**
 * Pre-check: given a new file size, decide allow/reject.
 * Returns null if OK to proceed, or an error message if rejected.
 */
export async function checkUploadAllowed(userId: string, newFileBytes: number): Promise<{ allow: boolean; reason?: string; quota: QuotaInfo; projectedBytes: number }> {
  const quota = await getUserQuota(userId)
  const projectedBytes = quota.usedBytes + newFileBytes
  if (projectedBytes > quota.hardLimitBytes) {
    return {
      allow: false,
      reason: `Storage quota exceeded. You're using ${bytesLabel(quota.usedBytes)} of ${bytesLabel(quota.quotaBytes)} (${quota.overagePercent}% grace exhausted). Upgrade your plan or remove files.`,
      quota,
      projectedBytes,
    }
  }
  return { allow: true, quota, projectedBytes }
}

export function bytesLabel(bytes: number): string {
  if (bytes >= GB) return `${(bytes / GB).toFixed(2)} GB`
  if (bytes >= MB) return `${(bytes / MB).toFixed(1)} MB`
  return `${(bytes / 1024).toFixed(0)} KB`
}

export interface StoragePlanOption {
  plan: 'CREATOR' | 'PRO'
  label: string
  gb: number
  priceCents: number
}

export async function getAvailablePlans(): Promise<StoragePlanOption[]> {
  const config = await prisma.storagePricingConfig.findUnique({ where: { id: 'config' } })
  return [
    { plan: 'CREATOR', label: 'Creator', gb: config?.creatorPlanGb ?? DEFAULT_CREATOR_GB, priceCents: config?.creatorPlanPriceCents ?? 690 },
    { plan: 'PRO',     label: 'Pro',     gb: config?.proPlanGb ?? DEFAULT_PRO_GB,         priceCents: config?.proPlanPriceCents ?? 1490 },
  ]
}

export function priceCentsForPlan(plan: string, config: { creatorPlanPriceCents: number; proPlanPriceCents: number } | null): number {
  if (plan === 'CREATOR') return config?.creatorPlanPriceCents ?? 690
  if (plan === 'PRO') return config?.proPlanPriceCents ?? 1490
  throw new Error(`Unknown paid storage plan: ${plan}`)
}
