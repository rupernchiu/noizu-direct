/**
 * Phase 7 — Creator's sales-tax opt-in flow (agency-collect model).
 *
 * Server wrapper. Gates on:
 *   1. Authenticated session with role === 'CREATOR'
 *   2. CreatorProfile exists
 *   3. creatorClassification === 'REGISTERED_BUSINESS'
 *   4. taxId populated (i.e. tax onboarding complete)
 *
 * If conditions 3/4 fail, redirects the creator back to /dashboard/onboarding/tax
 * to complete the prerequisite onboarding step.
 *
 * The page renders different states depending on `salesTaxStatus`:
 *   NONE       → request form (rate / label / certificate upload)
 *   REQUESTED  → "Pending admin review" card; allow re-submit
 *   APPROVED   → "Active" card; collectsSalesTax toggle
 *   REJECTED   → rejection notice; "Submit again" button
 */
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { countryFor } from '@/lib/countries'
import { SalesTaxOptInForm } from './SalesTaxOptInForm'

export const dynamic = 'force-dynamic'

const TAX_LABELS = ['SST', 'GST', 'VAT', 'PPN'] as const

export default async function SalesTaxOptInPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if ((session.user as any).role !== 'CREATOR') redirect('/')

  const userId = (session.user as any).id as string
  const profile = await prisma.creatorProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      creatorClassification: true,
      taxId: true,
      taxJurisdiction: true,
      payoutCountry: true,
      collectsSalesTax: true,
      salesTaxRate: true,
      salesTaxLabel: true,
      salesTaxStatus: true,
      salesTaxApprovedAt: true,
      salesTaxCertificateUrl: true,
    },
  })

  if (!profile) redirect('/dashboard')

  // Gate: only registered businesses with completed tax onboarding can opt in.
  if (
    profile.creatorClassification !== 'REGISTERED_BUSINESS' ||
    !profile.taxId ||
    !profile.taxJurisdiction
  ) {
    redirect('/dashboard/onboarding/tax')
  }

  // Suggest the country's typical tax label as the default selection.
  const country = countryFor(profile.taxJurisdiction)
  const suggestedLabel: (typeof TAX_LABELS)[number] =
    (country?.destinationTax?.label as (typeof TAX_LABELS)[number] | undefined) ?? 'SST'

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Finance · Tax</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mt-1">
          Sales tax collection — opt in
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-prose">
          If your business is registered for SST / GST / VAT / PPN, noizu.direct can collect the tax
          at checkout and pass it through to you in your payout. You remit the tax to your tax
          authority yourself under your own registration. We don&apos;t file or remit on your behalf.
        </p>
      </div>

      <div className="bg-card rounded-2xl border border-border p-6">
        <SalesTaxOptInForm
          status={(profile.salesTaxStatus as 'NONE' | 'REQUESTED' | 'APPROVED' | 'REJECTED') ?? 'NONE'}
          collectsSalesTax={profile.collectsSalesTax ?? false}
          existingRate={profile.salesTaxRate ?? null}
          existingLabel={(profile.salesTaxLabel as (typeof TAX_LABELS)[number] | null) ?? null}
          existingCertificateUrl={profile.salesTaxCertificateUrl ?? null}
          approvedAt={profile.salesTaxApprovedAt?.toISOString() ?? null}
          taxId={profile.taxId}
          taxJurisdiction={profile.taxJurisdiction}
          suggestedLabel={suggestedLabel}
        />
      </div>
    </div>
  )
}
