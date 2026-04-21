import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { QuoteBuilder } from '../../QuoteBuilder'

export default async function EditQuotePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  if ((session.user as { role?: string }).role !== 'CREATOR') redirect('/')
  const { id } = await params

  const quote = await prisma.commissionQuote.findUnique({
    where: { id },
    include: {
      creator: { select: { userId: true } },
      milestones: { orderBy: { order: 'asc' } },
    },
  })
  if (!quote) notFound()
  if (quote.creator.userId !== session.user.id) redirect('/dashboard/commissions')
  if (quote.status !== 'DRAFT') redirect(`/dashboard/commissions/quotes/${id}`)

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Edit quote</h1>
      </div>
      <QuoteBuilder
        quoteId={id}
        initial={{
          title: quote.title,
          description: quote.description,
          amountDollars: (quote.amountUsd / 100).toFixed(2),
          depositPercent: String(quote.depositPercent),
          revisionsIncluded: String(quote.revisionsIncluded),
          turnaroundDays: String(quote.turnaroundDays),
          termsText: quote.termsText ?? '',
          isMilestoneBased: quote.isMilestoneBased,
          milestones: quote.milestones.length > 0
            ? quote.milestones.map(m => ({ title: m.title, description: m.description ?? '', amountDollars: (m.amountUsd / 100).toFixed(2) }))
            : [
              { title: '', description: '', amountDollars: '' },
              { title: '', description: '', amountDollars: '' },
            ],
        }}
      />
    </div>
  )
}
