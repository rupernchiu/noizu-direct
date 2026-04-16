import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { CloseAccountClient } from './CloseAccountClient'

export default async function CloseAccountPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if ((session.user as any).role !== 'CREATOR') redirect('/')
  const userId = (session.user as any).id as string

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { closureRequestedAt: true, accountStatus: true },
  })

  // Already requested or closed
  if (user?.accountStatus === 'CLOSED' || user?.closureRequestedAt) {
    return (
      <div className="max-w-lg mx-auto py-12 px-4 text-center space-y-4">
        <div className="text-4xl">📋</div>
        <h1 className="text-xl font-bold text-foreground">Account Closure Already Requested</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {user.accountStatus === 'CLOSED'
            ? 'Your account has been closed.'
            : `Your account closure was requested on ${new Intl.DateTimeFormat('en-US', { dateStyle: 'long' }).format(user.closureRequestedAt!)}. If you need to cancel this, contact us at `}
          {user.accountStatus !== 'CLOSED' && (
            <a href="mailto:hello@noizu.direct" className="text-primary hover:underline">
              hello@noizu.direct
            </a>
          )}
          {user.accountStatus !== 'CLOSED' && ' within 24 hours.'}
        </p>
      </div>
    )
  }

  // Compute approximate balance: completed transactions minus paid payouts
  const [txAgg, payoutAgg] = await Promise.all([
    prisma.transaction.aggregate({
      where: { creatorId: userId, status: 'COMPLETED' },
      _sum: { creatorAmount: true },
    }),
    prisma.payout.aggregate({
      where: { creatorId: userId, status: 'COMPLETED' },
      _sum: { amountUsd: true },
    }),
  ])

  const earned = txAgg._sum.creatorAmount ?? 0
  const paid = payoutAgg._sum.amountUsd ?? 0
  const balanceCents = Math.max(0, earned - paid)

  return (
    <CloseAccountClient
      balanceCents={balanceCents}
      currentStatus={user?.accountStatus ?? 'ACTIVE'}
    />
  )
}
