/**
 * Creator-facing tax & earnings statement.
 *
 * Server wrapper: gates on creator role, computes the default (current year)
 * statement on the server so the page paints with data on first load, then
 * delegates to the client component for filtering / refetch / PDF download.
 */
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { computeTaxStatement } from '@/lib/tax-statement'
import { TaxStatementClient } from './TaxStatementClient'

export const dynamic = 'force-dynamic'

export default async function TaxStatementPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if ((session.user as any).role !== 'CREATOR') redirect('/')
  const userId = (session.user as any).id as string

  const profile = await prisma.creatorProfile.findUnique({ where: { userId } })
  if (!profile) redirect('/dashboard')

  const initial = await computeTaxStatement(userId, profile, {})

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground mb-1">Finance</p>
          <h1 className="text-2xl font-bold text-foreground">Tax & Earnings Statement</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your earnings, withheld tax, and what noizu.direct collects on your behalf — searchable by month or year.
          </p>
        </div>
      </div>
      <TaxStatementClient initial={initial} />
    </div>
  )
}
