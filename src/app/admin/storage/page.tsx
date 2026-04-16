import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { AdminStorageClient } from './AdminStorageClient'

export const metadata = { title: 'Storage Monitor | Admin' }

export default async function AdminStoragePage() {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/')

  const [allMedia, creators] = await Promise.all([
    prisma.media.findMany({ select: { uploadedBy: true, fileSize: true } }),
    prisma.user.findMany({
      where: { role: 'CREATOR' },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    }),
  ])

  const storageMap = new Map<string, number>()
  for (const m of allMedia) {
    storageMap.set(m.uploadedBy, (storageMap.get(m.uploadedBy) ?? 0) + (m.fileSize ?? 0))
  }

  const quotaBytes  = 500 * 1024 * 1024
  const totalUsed   = [...storageMap.values()].reduce((s, b) => s + b, 0)
  const totalAlloc  = creators.length * quotaBytes

  const creatorRows = creators.map(u => {
    const usedBytes = storageMap.get(u.id) ?? 0
    const pct = quotaBytes > 0 ? Math.min(100, Math.round((usedBytes / quotaBytes) * 100)) : 0
    let status: 'healthy' | 'warning' | 'high' | 'full' = 'healthy'
    if (pct >= 100) status = 'full'
    else if (pct >= 95) status = 'high'
    else if (pct >= 80) status = 'warning'
    return { id: u.id, name: u.name, email: u.email, usedBytes, quotaBytes, pct, status }
  })

  const overQuota = creatorRows.filter(c => c.pct >= 100).length

  return (
    <AdminStorageClient
      creatorRows={creatorRows}
      totalUsed={totalUsed}
      totalAllocated={totalAlloc}
      overQuota={overQuota}
      quotaBytes={quotaBytes}
      freePlanMb={500}
    />
  )
}
