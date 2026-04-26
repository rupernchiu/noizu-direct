import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getUserQuota, getAvailablePlans } from '@/lib/storage-quota'
import Link from 'next/link'
import { ArrowLeft, HardDrive } from 'lucide-react'
import { SubscribeForm } from './SubscribeForm'

export const metadata = { title: 'Upgrade storage' }

function gb(bytes: number) {
  if (bytes >= 1024 * 1024 * 1024) return `${Math.round(bytes / (1024 * 1024 * 1024))} GB`
  return `${Math.round(bytes / (1024 * 1024))} MB`
}

export default async function StorageSubscribePage() {
  const session = await auth()
  if (!session) redirect('/login')
  const userId = (session.user as { id: string }).id

  const [quota, plans, currentSub] = await Promise.all([
    getUserQuota(userId),
    getAvailablePlans(),
    prisma.storageSubscription.findUnique({
      where: { userId },
      select: { plan: true, status: true, currentPeriodEnd: true, cancelAtPeriodEnd: true },
    }),
  ])

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link href="/dashboard/storage" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to storage
      </Link>

      <div className="flex items-center gap-3">
        <HardDrive className="size-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Upgrade your storage</h1>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <p className="text-xs text-muted-foreground">Current plan</p>
        <p className="text-xl font-bold text-foreground">{quota.plan}</p>
        <p className="text-sm text-muted-foreground mt-1">
          Using {gb(quota.usedBytes)} of {gb(quota.quotaBytes)}
          {quota.bonusBytes > 0 ? ` (includes ${gb(quota.bonusBytes)} bonus)` : ''}
        </p>
        {currentSub && currentSub.status !== 'CANCELED' && currentSub.currentPeriodEnd && (
          <p className="text-xs text-muted-foreground mt-2">
            {currentSub.cancelAtPeriodEnd ? 'Ends on ' : 'Next renewal: '}
            {currentSub.currentPeriodEnd.toISOString().slice(0, 10)}
          </p>
        )}
      </div>

      <SubscribeForm plans={plans} currentPlan={quota.plan} />

      <div className="bg-muted/20 border border-border rounded-xl p-4 space-y-2 text-xs text-muted-foreground">
        <p><strong className="text-foreground">How billing works:</strong></p>
        <ul className="list-disc pl-4 space-y-1">
          <li>You&apos;re charged monthly at the listed price (USD).</li>
          <li>Airwallex handles the card details — we never see your card number.</li>
          <li>Cancel anytime — your plan stays active until the current period ends.</li>
          <li>If a monthly charge fails, we retry at +3 days and +7 days, then downgrade to Free.</li>
          <li>Soft overage: going over quota briefly (within the {quota.overagePercent}% grace band) is allowed; new uploads are blocked above the hard limit.</li>
        </ul>
      </div>
    </div>
  )
}
