import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { SettingsForm } from './SettingsForm'
import { MaintenanceToggle } from './MaintenanceToggle'
import { TRENDING_CONFIG } from '@/lib/trendingConfig'

export default async function AdminSettingsPage() {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/')

  let settings = await prisma.platformSettings.findFirst()

  if (!settings) {
    settings = await prisma.platformSettings.create({ data: {} })
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Platform Settings</h2>
      <MaintenanceToggle
        enabled={settings.maintenanceMode}
        message={settings.maintenanceMessage ?? ''}
      />
      <SettingsForm
        settings={{
          processingFeePercent: settings.processingFeePercent,
          platformFeePercent: settings.platformFeePercent,
          withdrawalFeePercent: settings.withdrawalFeePercent,
          creatorCommissionPercent: settings.creatorCommissionPercent,
          buyerFeeLocalPercent: settings.buyerFeeLocalPercent,
          buyerFeeCardPercent: settings.buyerFeeCardPercent,
          digitalEscrowHours: settings.digitalEscrowHours,
          physicalEscrowDays: settings.physicalEscrowDays,
          podEscrowDays: settings.podEscrowDays,
          commissionEscrowDays: settings.commissionEscrowDays,
          newCreatorEscrowExtraDays: settings.newCreatorEscrowExtraDays,
          newCreatorTransactionThreshold: settings.newCreatorTransactionThreshold,
          clawbackExposureWindowDays: settings.clawbackExposureWindowDays,
          taxDestinationCountries: settings.taxDestinationCountries,
          defaultCreatorTaxRatePercent: settings.defaultCreatorTaxRatePercent,
          topCreatorThreshold: settings.topCreatorThreshold,
        }}
      />
      <div className="bg-card rounded-xl border border-border p-5 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Trending Algorithm Config</h3>
        <p className="text-xs text-muted-foreground">Read-only. To update, edit <code className="bg-border px-1 rounded">src/lib/trendingConfig.ts</code> and bump the version.</p>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div><dt className="text-muted-foreground text-xs">Version</dt><dd className="text-foreground font-mono">{TRENDING_CONFIG.version}</dd></div>
          <div><dt className="text-muted-foreground text-xs">Window</dt><dd className="text-foreground font-mono">{TRENDING_CONFIG.windowDays} days</dd></div>
          <div><dt className="text-muted-foreground text-xs">Decay Factor</dt><dd className="text-foreground font-mono">{TRENDING_CONFIG.decayFactor}</dd></div>
          <div><dt className="text-muted-foreground text-xs">Weight — Orders</dt><dd className="text-foreground font-mono">{TRENDING_CONFIG.weights.orders}</dd></div>
          <div><dt className="text-muted-foreground text-xs">Weight — Wishlist</dt><dd className="text-foreground font-mono">{TRENDING_CONFIG.weights.wishlist}</dd></div>
          <div><dt className="text-muted-foreground text-xs">Weight — Cart</dt><dd className="text-foreground font-mono">{TRENDING_CONFIG.weights.cart}</dd></div>
          <div><dt className="text-muted-foreground text-xs">Weight — Views</dt><dd className="text-foreground font-mono">{TRENDING_CONFIG.weights.views}</dd></div>
        </dl>
      </div>
    </div>
  )
}
