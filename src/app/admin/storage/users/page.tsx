import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { HardDrive, Gift } from 'lucide-react'
import { GrantBonusForm } from './GrantBonusForm'

export const metadata = { title: 'Storage users | noizu.direct admin' }

function gb(bytes: bigint | number) {
  const n = typeof bytes === 'bigint' ? Number(bytes) : bytes
  if (n >= 1024 * 1024 * 1024) return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
  return `${(n / 1024).toFixed(0)} KB`
}

export default async function AdminStorageUsersPage({ searchParams }: { searchParams: Promise<{ q?: string; plan?: string }> }) {
  const session = await auth()
  const user = session?.user as { role?: string } | undefined
  if (user?.role !== 'ADMIN') redirect('/login')

  const { q, plan } = await searchParams

  const users = await prisma.user.findMany({
    where: {
      ...(plan ? { storagePlan: plan } : {}),
      ...(q ? {
        OR: [
          { email: { contains: q, mode: 'insensitive' } },
          { name: { contains: q, mode: 'insensitive' } },
        ],
      } : {}),
    },
    select: {
      id: true, email: true, name: true,
      storagePlan: true, storageBonusMb: true,
      storagePlanRenewsAt: true, storageOverageBytes: true,
      storageSubscription: { select: { status: true, currentPeriodEnd: true, cancelAtPeriodEnd: true, failedChargeCount: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  const ids = users.map(u => u.id)
  const mediaAgg = ids.length > 0 ? await prisma.media.groupBy({
    by: ['uploadedBy'],
    where: { uploadedBy: { in: ids } },
    _sum: { fileSize: true },
  }) : []
  const usageMap = new Map<string, number>()
  for (const row of mediaAgg) usageMap.set(row.uploadedBy, Number(row._sum.fileSize ?? 0))

  const config = await prisma.storagePricingConfig.findUnique({ where: { id: 'config' } })
  function baseBytesFor(plan: string | null): number {
    if (plan === 'CREATOR') return (config?.creatorPlanGb ?? 25) * 1024 * 1024 * 1024
    if (plan === 'PRO') return (config?.proPlanGb ?? 100) * 1024 * 1024 * 1024
    return (config?.freePlanMb ?? 2048) * 1024 * 1024
  }

  const totalActive = users.filter(u => u.storageSubscription?.status === 'ACTIVE').length
  const totalPastDue = users.filter(u => u.storageSubscription?.status === 'PAST_DUE').length

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center gap-3">
        <HardDrive className="size-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Storage users</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Users shown</p>
          <p className="text-2xl font-bold text-foreground">{users.length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Active paid plans</p>
          <p className="text-2xl font-bold text-foreground">{totalActive}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Past-due</p>
          <p className="text-2xl font-bold text-orange-400">{totalPastDue}</p>
        </div>
      </div>

      <form className="flex flex-wrap gap-2">
        <input name="q" defaultValue={q ?? ''} placeholder="Search email or name"
          className="flex-1 min-w-[200px] text-sm p-2.5 rounded-lg bg-card border border-border text-foreground" />
        <select name="plan" defaultValue={plan ?? ''}
          className="text-sm p-2.5 rounded-lg bg-card border border-border text-foreground">
          <option value="">All plans</option>
          <option value="FREE">FREE</option>
          <option value="CREATOR">CREATOR</option>
          <option value="PRO">PRO</option>
        </select>
        <button className="text-sm px-4 py-2.5 rounded-lg bg-primary text-white hover:bg-primary/90">Filter</button>
      </form>

      <div className="overflow-x-auto bg-card border border-border rounded-xl">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/20 text-muted-foreground text-left">
            <tr>
              <th className="px-3 py-2 font-medium">User</th>
              <th className="px-3 py-2 font-medium">Plan</th>
              <th className="px-3 py-2 font-medium">Usage</th>
              <th className="px-3 py-2 font-medium">Bonus</th>
              <th className="px-3 py-2 font-medium">Overage</th>
              <th className="px-3 py-2 font-medium">Sub status</th>
              <th className="px-3 py-2 font-medium">Bonus grant</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => {
              const used = usageMap.get(u.id) ?? 0
              const base = baseBytesFor(u.storagePlan)
              const quota = base + u.storageBonusMb * 1024 * 1024
              const pct = quota > 0 ? Math.round((used / quota) * 100) : 0
              return (
                <tr key={u.id} className="border-t border-border">
                  <td className="px-3 py-3">
                    <p className="text-foreground font-medium">{u.name ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded ${u.storagePlan === 'FREE' ? 'bg-muted text-foreground' : 'bg-primary/10 text-primary'}`}>
                      {u.storagePlan}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <p className="text-foreground">{gb(used)} / {gb(quota)}</p>
                    <p className={`text-xs ${pct >= 100 ? 'text-red-400' : pct >= 80 ? 'text-orange-400' : 'text-muted-foreground'}`}>{pct}%</p>
                  </td>
                  <td className="px-3 py-3 text-foreground">{u.storageBonusMb} MB</td>
                  <td className="px-3 py-3 text-foreground">{gb(u.storageOverageBytes)}</td>
                  <td className="px-3 py-3">
                    {u.storageSubscription ? (
                      <div>
                        <p className="text-foreground text-xs">{u.storageSubscription.status}</p>
                        {u.storageSubscription.currentPeriodEnd && (
                          <p className="text-xs text-muted-foreground">
                            {u.storageSubscription.cancelAtPeriodEnd ? 'Cancels' : 'Renews'} {u.storageSubscription.currentPeriodEnd.toISOString().slice(0, 10)}
                          </p>
                        )}
                        {u.storageSubscription.failedChargeCount > 0 && (
                          <p className="text-xs text-red-400">{u.storageSubscription.failedChargeCount} failed</p>
                        )}
                      </div>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                  <td className="px-3 py-3">
                    <GrantBonusForm userId={u.id} currentBonusMb={u.storageBonusMb} />
                  </td>
                </tr>
              )
            })}
            {users.length === 0 && (
              <tr><td colSpan={7} className="text-center text-sm text-muted-foreground py-8">No users found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <Gift className="size-3.5" /> Bonus storage is layered on top of the user&apos;s plan quota.
      </p>
    </div>
  )
}
