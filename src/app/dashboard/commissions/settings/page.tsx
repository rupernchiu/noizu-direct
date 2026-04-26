import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { parseCommissionDefaults } from '@/lib/commission-defaults'
import { CommissionSettingsForm } from './CommissionSettingsForm'
import { Plus } from 'lucide-react'
import Link from 'next/link'

export const metadata = { title: 'Commission settings' }

type PricingTier = { tier: string; price: number; description: string }

export default async function CommissionSettingsPage() {
  const session = await auth()
  if (!session) redirect('/login')
  const userId = (session.user as { id: string }).id

  const profile = await prisma.creatorProfile.findUnique({
    where: { userId },
    select: {
      commissionStatus:      true,
      commissionSlots:       true,
      commissionDescription: true,
      commissionTerms:       true,
      commissionPricing:     true,
      commissionDefaults:    true,
      absorbProcessingFee:   true,
    },
  })
  if (!profile) redirect('/dashboard')

  let pricingTiers: PricingTier[] = []
  try { pricingTiers = JSON.parse(profile.commissionPricing) as PricingTier[] } catch {}

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <p className="text-sm text-muted-foreground max-w-2xl">
          Configure how you accept commissions, pricing tiers, and n-stage milestone templates used when issuing quotes.
        </p>
        <Link
          href="/dashboard/commissions/quotes/new"
          className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90"
        >
          <Plus className="size-4" />
          New quote
        </Link>
      </div>

      <CommissionSettingsForm
        initial={{
          commissionStatus:      (profile.commissionStatus as 'OPEN' | 'LIMITED' | 'CLOSED'),
          commissionSlots:       profile.commissionSlots,
          commissionDescription: profile.commissionDescription ?? '',
          commissionTerms:       profile.commissionTerms ?? '',
          pricingTiers,
          absorbProcessingFee:   profile.absorbProcessingFee,
          defaults:              parseCommissionDefaults(profile.commissionDefaults),
        }}
      />
    </div>
  )
}
