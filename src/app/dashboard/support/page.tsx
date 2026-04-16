import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { SupportManager } from './SupportManager'

export default async function SupportPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if ((session.user as any).role !== 'CREATOR') redirect('/')

  const userId = (session.user as any).id as string
  const profile = await prisma.creatorProfile.findUnique({ where: { userId } })
  if (!profile) redirect('/')

  const [tiers, goals, gift] = await Promise.all([
    prisma.supportTier.findMany({
      where: { creatorId: profile.id },
      orderBy: { order: 'asc' },
    }),
    prisma.supportGoal.findMany({
      where: { creatorId: profile.id },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.supportGift.findUnique({ where: { creatorId: profile.id } }),
  ])

  return (
    <SupportManager
      initialTiers={tiers.map(t => ({
        id: t.id,
        name: t.name,
        priceUsd: t.priceUsd,
        description: t.description ?? null,
        perks: (() => { try { return JSON.parse(t.perks) } catch { return [] } })(),
        isActive: t.isActive,
        subscriberCount: t.subscriberCount,
        order: t.order,
      }))}
      initialGoals={goals.map(g => ({
        id: g.id,
        title: g.title,
        description: g.description ?? null,
        targetAmountUsd: g.targetAmountUsd,
        currentAmountUsd: g.currentAmountUsd,
        deadline: g.deadline?.toISOString() ?? null,
        status: g.status,
        coverImage: g.coverImage ?? null,
      }))}
      initialGift={gift ? {
        id: gift.id,
        isActive: gift.isActive,
        presetAmounts: (() => { try { return JSON.parse(gift.presetAmounts) } catch { return [3, 5, 10, 25] } })(),
        thankYouMessage: gift.thankYouMessage,
        totalReceived: gift.totalReceived,
        giftCount: gift.giftCount,
      } : null}
    />
  )
}
