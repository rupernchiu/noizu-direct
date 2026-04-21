import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { QuoteBuilder } from '../QuoteBuilder'

export default async function NewQuotePage({ searchParams }: { searchParams: Promise<{ requestId?: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  if ((session.user as { role?: string }).role !== 'CREATOR') redirect('/')

  const { requestId } = await searchParams
  let requestCtx: { id: string; title: string; buyerName: string | null; briefText: string } | null = null

  if (requestId) {
    const r = await prisma.commissionRequest.findUnique({
      where: { id: requestId },
      include: {
        buyer: { select: { name: true } },
        creator: { select: { userId: true } },
      },
    })
    if (!r) notFound()
    if (r.creator.userId !== session.user.id) redirect('/dashboard/commissions')
    requestCtx = { id: r.id, title: r.title, buyerName: r.buyer.name, briefText: r.briefText }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">New quote</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {requestCtx ? `Quoting "${requestCtx.title}" for ${requestCtx.buyerName ?? 'buyer'}` : 'Build a custom quote'}
        </p>
      </div>
      <QuoteBuilder requestId={requestCtx?.id ?? null} presetTitle={requestCtx?.title ?? ''} />
    </div>
  )
}
