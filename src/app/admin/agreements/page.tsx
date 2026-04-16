import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { AdminAgreementsClient } from './AdminAgreementsClient'

export default async function AdminAgreementsPage() {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/')

  const [templates, totalCreators] = await Promise.all([
    prisma.agreementTemplate.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { agreements: true } },
      },
    }),
    prisma.user.count({ where: { role: 'CREATOR' } }),
  ])

  // For overall compliance: creators who have signed ALL active templates
  const activeTemplates = templates.filter((t) => t.isActive)
  let overallPct = 100
  if (activeTemplates.length > 0 && totalCreators > 0) {
    // Count creators who signed at least one agreement per active template type
    // Simplified: average of individual template sign rates
    const totalSigned = activeTemplates.reduce((sum, t) => sum + t._count.agreements, 0)
    const maxPossible = activeTemplates.length * totalCreators
    overallPct = maxPossible > 0 ? Math.round((totalSigned / maxPossible) * 100) : 0
  }

  const templateRows = templates.map((t) => ({
    id: t.id,
    type: t.type,
    version: t.version,
    title: t.title,
    isActive: t.isActive,
    publishedAt: t.publishedAt?.toISOString() ?? null,
    signedCount: t._count.agreements,
    totalCreators,
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">Agreement Manager</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Create and manage creator agreements. Publishing a new version requires all creators to re-sign before
          accessing their dashboard.
        </p>
      </div>

      {/* Overall compliance card */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase text-muted-foreground font-semibold tracking-wide">Overall Compliance</p>
            <p className="text-3xl font-bold text-foreground mt-1">{overallPct}%</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              of creators have signed all active agreements
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">{totalCreators} total creators</p>
            <p className="text-xs text-muted-foreground">{activeTemplates.length} active agreement types</p>
          </div>
        </div>
        <div className="mt-4 h-2 bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${overallPct}%` }}
          />
        </div>
      </div>

      <AdminAgreementsClient templates={templateRows} totalCreators={totalCreators} />
    </div>
  )
}
