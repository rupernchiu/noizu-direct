import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { Palette, ArrowLeft } from 'lucide-react'
import { RequestCommissionForm } from './RequestCommissionForm'

type PricingTier = { tier: string; price: number; description: string }

interface PageProps { params: Promise<{ username: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params
  return { title: `Request commission — ${username}`, robots: { index: false } }
}

export default async function NewCommissionRequestPage({ params }: PageProps) {
  const { username } = await params
  const session = await auth()
  if (!session?.user?.id) redirect(`/auth/signin?callbackUrl=/creator/${username}/commission/new`)

  const creator = await prisma.creatorProfile.findUnique({
    where: { username },
    select: {
      id:                    true,
      userId:                true,
      username:              true,
      displayName:           true,
      avatar:                true,
      isSuspended:           true,
      commissionStatus:      true,
      commissionSlots:       true,
      commissionDescription: true,
      commissionPricing:     true,
      commissionTerms:       true,
    },
  })
  if (!creator) notFound()
  if (creator.isSuspended) redirect(`/creator/${username}`)
  if (creator.userId === session.user.id) redirect(`/creator/${username}`)
  if (creator.commissionStatus === 'CLOSED') redirect(`/creator/${username}`)

  let pricingTiers: PricingTier[] = []
  try { pricingTiers = JSON.parse(creator.commissionPricing) as PricingTier[] } catch {}

  const statusLabel =
    creator.commissionStatus === 'LIMITED'
      ? `Limited availability${creator.commissionSlots != null ? ` · ${creator.commissionSlots} slot${creator.commissionSlots === 1 ? '' : 's'}` : ''}`
      : 'Open for commissions'

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <Link href={`/creator/${username}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
          Back to {creator.displayName}
        </Link>

        <div className="flex items-start gap-4">
          <div className="flex items-center gap-3">
            <Palette className="size-6 text-primary shrink-0" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Request a commission</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                To <span className="text-foreground font-medium">{creator.displayName}</span> · {statusLabel}
              </p>
            </div>
          </div>
        </div>

        {(creator.commissionDescription?.trim() || pricingTiers.length > 0 || creator.commissionTerms?.trim()) && (
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            {creator.commissionDescription?.trim() && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">What I take</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{creator.commissionDescription}</p>
              </div>
            )}
            {pricingTiers.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Starting prices</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {pricingTiers.map((t, i) => (
                    <div key={i} className="flex items-baseline justify-between gap-3 text-sm py-1.5 border-b border-border last:border-0">
                      <div className="min-w-0">
                        <p className="text-foreground font-medium truncate">{t.tier}</p>
                        {t.description && <p className="text-xs text-muted-foreground truncate">{t.description}</p>}
                      </div>
                      <p className="text-primary font-semibold shrink-0">${t.price.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {creator.commissionTerms?.trim() && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Terms &amp; process</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{creator.commissionTerms}</p>
              </div>
            )}
          </div>
        )}

        <RequestCommissionForm creatorProfileId={creator.id} creatorUsername={creator.username} />
      </div>
    </div>
  )
}
