import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CheckCircle, Circle } from 'lucide-react'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Phase 3 of the tax architecture build. The dashboard root already renders
// the "complete your store setup" checklist; this page is the canonical
// landing target for the tax-onboarding step and will act as the central
// onboarding hub once more required pre-listing steps land. For now it shows
// (1) tax onboarding state, (2) the existing storefront-readiness checklist
// summarized, with a clear pointer back to /dashboard for the rest.

export default async function OnboardingHubPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if ((session.user as any).role !== 'CREATOR') redirect('/')

  const userId = (session.user as any).id as string
  const profile = await prisma.creatorProfile.findUnique({
    where: { userId },
    select: {
      taxOnboardingAcknowledgedAt: true,
      taxOnboardingTosVersion: true,
      creatorClassification: true,
      payoutCountry: true,
      onboardingCompleted: true,
      avatar: true,
      bannerImage: true,
      bio: true,
      socialLinks: true,
      displayName: true,
      username: true,
      id: true,
    },
  })
  if (!profile) redirect('/dashboard')

  const taxDone = !!profile.taxOnboardingAcknowledgedAt

  // Re-derive the storefront checklist (mirrors logic in dashboard/page.tsx so
  // creators see consistent state across both surfaces).
  const activeListings = await prisma.product.count({
    where: { creatorId: profile.id, isActive: true },
  })

  const storefrontSteps = [
    { id: 'avatar', label: 'Add profile photo', completed: !!profile.avatar, href: '/dashboard/profile' },
    { id: 'banner', label: 'Add banner image', completed: !!profile.bannerImage, href: '/dashboard/profile' },
    { id: 'bio', label: 'Write your bio', completed: !!(profile.bio && profile.bio.length > 20), href: '/dashboard/profile' },
    { id: 'social', label: 'Add social links', completed: !!(profile.socialLinks && profile.socialLinks !== '{}' && profile.socialLinks !== 'null'), href: '/dashboard/profile' },
    { id: 'product', label: 'List your first product', completed: activeListings > 0, href: '/dashboard/listings/new' },
    {
      id: 'profile',
      label: 'Complete store profile',
      completed: !!(profile.displayName && profile.username),
      href: '/dashboard/profile',
    },
  ]
  const storefrontCompleted = storefrontSteps.filter((s) => s.completed).length

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Onboarding</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mt-1">Get your store ready</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-prose">
          A couple of quick steps before you start selling. Complete tax qualification first — it
          unlocks the rest of your storefront setup.
        </p>
      </div>

      {/* Tax onboarding card — gates everything else */}
      <div
        className={`rounded-xl border p-5 ${
          taxDone ? 'bg-card border-success/30' : 'bg-card border-primary/40'
        }`}
      >
        <div className="flex items-start gap-3">
          {taxDone ? (
            <CheckCircle size={20} className="text-success shrink-0 mt-0.5" />
          ) : (
            <Circle size={20} className="text-primary shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-foreground">Tax qualification</h2>
            {taxDone ? (
              <p className="text-sm text-muted-foreground mt-1">
                Acknowledged on{' '}
                {profile.taxOnboardingAcknowledgedAt!.toLocaleDateString()} · classification{' '}
                <span className="text-foreground">{profile.creatorClassification ?? 'unknown'}</span>
                {profile.payoutCountry ? (
                  <>
                    {' · country '}
                    <span className="text-foreground">{profile.payoutCountry}</span>
                  </>
                ) : null}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">
                Confirm your country, individual or registered-business status, and tax-ID (if
                applicable). One-time, takes under a minute.
              </p>
            )}
            <div className="mt-3">
              <Link
                href="/dashboard/onboarding/tax"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  taxDone
                    ? 'border border-border text-muted-foreground hover:text-foreground'
                    : 'bg-primary text-white hover:bg-primary/90'
                }`}
              >
                {taxDone ? 'Update tax info' : 'Start tax qualification →'}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Storefront checklist — mirrors the dashboard root surface */}
      <div
        className={`rounded-xl border bg-card p-5 ${
          taxDone ? '' : 'opacity-60 pointer-events-none'
        }`}
        aria-disabled={!taxDone || undefined}
      >
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-foreground">Storefront setup</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {taxDone
                ? `${storefrontCompleted} of ${storefrontSteps.length} steps complete.`
                : 'Available once you complete tax qualification.'}
            </p>
            <ul className="mt-3 space-y-1.5">
              {storefrontSteps.map((s) => (
                <li key={s.id} className="flex items-center gap-2 text-sm">
                  {s.completed ? (
                    <CheckCircle size={16} className="text-success shrink-0" />
                  ) : (
                    <Circle size={16} className="text-muted-foreground shrink-0" />
                  )}
                  {taxDone && !s.completed ? (
                    <Link href={s.href} className="text-foreground hover:text-primary">
                      {s.label}
                    </Link>
                  ) : (
                    <span className={s.completed ? 'text-muted-foreground line-through' : 'text-foreground'}>
                      {s.label}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Looking for the full dashboard?{' '}
        <Link href="/dashboard" className="text-primary hover:underline">
          Back to overview
        </Link>
        .
      </p>
    </div>
  )
}
