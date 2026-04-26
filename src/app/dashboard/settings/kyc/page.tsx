// KYC self-service view for creators.
//
// Shows the three required KYC document slots (id_front, id_back, selfie) and
// whichever live (non-superseded) files the user has uploaded. Status is
// driven by the creator's CreatorApplication row:
//
//   DRAFT                → can upload / replace / preview thumbnails
//   SUBMITTED/UNDER_REVIEW → locked; thumbnails hidden, review banner shown
//   APPROVED             → locked; green "verified" banner
//   REJECTED             → pink banner with reason + "Start new submission" CTA
//
// Files are *append-only*. There is no delete button — by policy, replacing a
// document marks the previous row `supersededAt` (the /api/upload route
// handles that) and we retain both for audit. We still tell the user how many
// older versions we have, without rendering them.

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { ShieldCheck, ArrowLeft } from 'lucide-react'
import { KycSettingsClient, type KycSlot } from './KycSettingsClient'

export const metadata = { title: 'KYC documents' }

type KycCategory = 'id_front' | 'id_back' | 'selfie'
const CATEGORIES: KycCategory[] = ['id_front', 'id_back', 'selfie']

const CATEGORY_LABEL: Record<KycCategory, string> = {
  id_front: 'Government ID — front',
  id_back:  'Government ID — back',
  selfie:   'Selfie holding ID',
}

const CATEGORY_DESC: Record<KycCategory, string> = {
  id_front: 'Clear photo of the front of your IC, passport, or equivalent.',
  id_back:  'Back of your IC/licence. Skip if you uploaded a passport.',
  selfie:   'You holding your ID next to your face, both clearly visible.',
}

export default async function KycSettingsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const userId = session.user.id as string

  // Live uploads (non-superseded) grouped by category.
  const liveUploads = await prisma.kycUpload.findMany({
    where: { userId, supersededAt: null },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      category: true,
      viewerUrl: true,
      mimeType: true,
      fileSize: true,
      createdAt: true,
    },
  })

  // Historical rows (superseded) — count only, never URLs.
  const supersededCounts = await prisma.kycUpload.groupBy({
    by: ['category'],
    where: { userId, supersededAt: { not: null } },
    _count: { _all: true },
  })

  const supersededByCategory: Record<string, number> = {}
  for (const g of supersededCounts) {
    supersededByCategory[g.category] = g._count._all
  }

  const application = await prisma.creatorApplication.findUnique({
    where: { userId },
    select: {
      id: true,
      status: true,
      rejectionReason: true,
      submittedAt: true,
      reviewedAt: true,
    },
  })

  const appStatus = application?.status ?? 'DRAFT'
  const isLocked =
    appStatus === 'SUBMITTED' ||
    appStatus === 'UNDER_REVIEW' ||
    appStatus === 'APPROVED'

  const slots: KycSlot[] = CATEGORIES.map((cat) => {
    const live = liveUploads.find((u) => u.category === cat) ?? null
    return {
      category: cat,
      label: CATEGORY_LABEL[cat],
      description: CATEGORY_DESC[cat],
      live: live
        ? {
            id: live.id,
            viewerUrl: live.viewerUrl,
            mimeType: live.mimeType,
            fileSize: live.fileSize,
            uploadedAt: live.createdAt.toISOString(),
          }
        : null,
      supersededCount: supersededByCategory[cat] ?? 0,
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/settings"
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          <ArrowLeft className="size-4" />
          Back to settings
        </Link>
      </div>

      <div className="flex items-start gap-3">
        <ShieldCheck className="size-6 text-primary mt-0.5" />
        <div>
          <h1 className="text-xl font-bold text-foreground">KYC documents</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Your identity documents on file. Append-only for your protection and ours.
          </p>
        </div>
      </div>

      {/* Info panel explaining append-only semantics */}
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
        <p className="text-sm text-foreground leading-relaxed">
          <span className="font-semibold">KYC documents are append-only.</span>{' '}
          You cannot delete them — this protects you and us against disputes.
          If you need to update one, use <span className="font-semibold">Replace</span>.
          Older versions are kept only for audit; reviewers only see the current version.
        </p>
      </div>

      {/* Status banners */}
      {appStatus === 'REJECTED' && (
        <div className="rounded-xl border border-pink-500/40 bg-pink-500/10 p-4 space-y-2">
          <p className="text-sm text-pink-300 font-semibold">
            Your KYC submission was rejected.
          </p>
          {application?.rejectionReason && (
            <p className="text-sm text-foreground leading-relaxed">
              Reason: <span className="text-pink-200">{application.rejectionReason}</span>
            </p>
          )}
          <div className="pt-1">
            <Link
              href="/start-selling"
              className="inline-flex items-center gap-1.5 rounded-lg bg-pink-500 text-white text-sm font-medium px-3 py-1.5 hover:bg-pink-500/90"
            >
              Start new submission
            </Link>
          </div>
        </div>
      )}

      {(appStatus === 'SUBMITTED' || appStatus === 'UNDER_REVIEW') && (
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
          <p className="text-sm text-yellow-300 font-semibold">
            Your KYC is locked while under review.
          </p>
          <p className="text-sm text-foreground leading-relaxed mt-1">
            Thumbnails are hidden to avoid reviewer bias. If you need to correct
            something urgently, email{' '}
            <a
              href="mailto:support@noizu.direct?subject=KYC%20review%20support"
              className="text-primary hover:underline"
            >
              support@noizu.direct
            </a>
            .
          </p>
        </div>
      )}

      {appStatus === 'APPROVED' && (
        <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4">
          <p className="text-sm text-green-300 font-semibold">
            You&apos;re verified. These documents are locked on your account.
          </p>
        </div>
      )}

      <KycSettingsClient
        slots={slots}
        locked={isLocked}
        applicationStatus={appStatus}
      />
    </div>
  )
}
