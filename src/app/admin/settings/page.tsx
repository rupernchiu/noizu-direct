import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { SettingsForm } from './SettingsForm'

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
      <SettingsForm
        settings={{
          processingFeePercent: settings.processingFeePercent,
          platformFeePercent: settings.platformFeePercent,
          withdrawalFeePercent: settings.withdrawalFeePercent,
          topCreatorThreshold: settings.topCreatorThreshold,
        }}
      />
    </div>
  )
}
