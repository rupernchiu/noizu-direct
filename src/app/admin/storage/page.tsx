import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { AdminStorageClient } from './AdminStorageClient'

export const metadata = { title: 'Storage Monitor | Admin' }

const MB = 1024 * 1024
const GB = 1024 * 1024 * 1024

export default async function AdminStoragePage() {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/')

  const [allMedia, creators, config] = await Promise.all([
    prisma.media.findMany({ select: { uploadedBy: true, fileSize: true } }),
    prisma.user.findMany({
      where: { role: 'CREATOR' },
      select: {
        id: true, name: true, email: true,
        storagePlan: true, storageBonusMb: true,
      },
      orderBy: { name: 'asc' },
    }),
    prisma.storagePricingConfig.findUnique({ where: { id: 'config' } }),
  ])

  const freePlanMb    = config?.freePlanMb ?? 2048
  const creatorPlanGb = config?.creatorPlanGb ?? 25
  const proPlanGb     = config?.proPlanGb ?? 100

  const planBaseBytes = (plan: string): number => {
    if (plan === 'CREATOR') return creatorPlanGb * GB
    if (plan === 'PRO')     return proPlanGb * GB
    return freePlanMb * MB
  }

  const storageMap = new Map<string, number>()
  for (const m of allMedia) {
    storageMap.set(m.uploadedBy, (storageMap.get(m.uploadedBy) ?? 0) + (m.fileSize ?? 0))
  }

  let totalUsed  = 0
  let totalAlloc = 0

  const creatorRows = creators.map(u => {
    const plan       = (u.storagePlan ?? 'FREE') as 'FREE' | 'CREATOR' | 'PRO'
    const baseBytes  = planBaseBytes(plan)
    const bonusBytes = (u.storageBonusMb ?? 0) * MB
    const quotaBytes = baseBytes + bonusBytes
    const usedBytes  = storageMap.get(u.id) ?? 0
    const pct        = quotaBytes > 0 ? Math.min(100, Math.round((usedBytes / quotaBytes) * 100)) : 0

    let status: 'healthy' | 'warning' | 'high' | 'full' = 'healthy'
    if (pct >= 100)      status = 'full'
    else if (pct >= 95)  status = 'high'
    else if (pct >= 80)  status = 'warning'

    totalUsed  += usedBytes
    totalAlloc += quotaBytes

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      plan,
      usedBytes,
      quotaBytes,
      bonusBytes,
      pct,
      status,
    }
  })

  const overQuota = creatorRows.filter(c => c.pct >= 100).length

  return (
    <AdminStorageClient
      creatorRows={creatorRows}
      totalUsed={totalUsed}
      totalAllocated={totalAlloc}
      overQuota={overQuota}
    />
  )
}
