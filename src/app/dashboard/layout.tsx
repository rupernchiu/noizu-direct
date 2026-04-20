import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { NavLink } from '@/components/ui/NavLink'
import { NotificationBell } from '@/components/ui/NotificationBell'
import { AgreementWall } from '@/components/ui/AgreementWall'
import { LayoutDashboard, Package, ShoppingBag, MessageCircle, DollarSign, Users, User, Video, Heart, Zap, Printer, HardDrive, Download, FileText, Scale, Star, Tag, ShieldCheck } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { Suspense } from 'react'
import Link from 'next/link'

async function StorageUsageDot({ userId }: { userId: string }) {
  try {
    const [files, config] = await Promise.all([
      prisma.media.findMany({ where: { uploadedBy: userId }, select: { fileSize: true } }),
      prisma.storagePricingConfig.findUnique({ where: { id: 'config' } }),
    ])
    const usedBytes  = files.reduce((s, f) => s + (f.fileSize ?? 0), 0)
    const quotaBytes = (config?.freePlanMb ?? 500) * 1024 * 1024
    const pct        = quotaBytes > 0 ? (usedBytes / quotaBytes) * 100 : 0
    const color = pct >= 100 ? '#ef4444' : pct >= 95 ? '#f97316' : pct >= 80 ? '#eab308' : '#22c55e'
    return (
      <span
        className={`ml-auto size-2 rounded-full shrink-0${pct >= 100 ? ' animate-pulse' : ''}`}
        style={{ backgroundColor: color }}
      />
    )
  } catch {
    return null
  }
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')
  if ((session.user as any).role !== 'CREATOR') redirect('/')
  const userId = (session.user as any).id as string

  const [user, unsignedAgreements, application] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { accountStatus: true, closureRequestedAt: true, creatorVerificationStatus: true } }),
    prisma.agreementTemplate.findMany({
      where: {
        isActive: true,
        agreements: { none: { userId, isActive: true } }
      },
      select: { id: true, type: true, version: true, title: true, content: true, summary: true, changeLog: true, effectiveDate: true, publishedAt: true }
    }),
    prisma.creatorApplication.findUnique({ where: { userId }, select: { legalFullName: true, kycCompleted: true } }),
  ])
  const kycIncomplete = application && !application.kycCompleted

  if (user?.accountStatus === 'SUSPENDED') redirect('/suspended')
  if (user?.accountStatus === 'CLOSED') redirect('/account-closed')

  // Calculate grace period from oldest unsigned agreement publishedAt
  let gracePeriodEnd: string | null = null
  let daysRemaining: number | null = null
  if (unsignedAgreements.length > 0) {
    const publishedDates = unsignedAgreements
      .map(a => a.publishedAt)
      .filter((d): d is Date => d !== null)
    if (publishedDates.length > 0) {
      const oldest = new Date(Math.min(...publishedDates.map(d => d.getTime())))
      const daysSince = Math.floor((Date.now() - oldest.getTime()) / (1000 * 60 * 60 * 24))
      daysRemaining = 30 - daysSince
      const end = new Date(oldest)
      end.setDate(end.getDate() + 30)
      gracePeriodEnd = end.toISOString()
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Creator Dashboard</h1>
          <NotificationBell />
        </div>
        <div className="flex gap-8 flex-col md:flex-row">
          <aside className="md:w-56 shrink-0">
            <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
              {/* Member account switch link */}
              <Link
                href="/account"
                className="flex items-center gap-1.5 px-2 py-1 mb-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-border/40 shrink-0"
              >
                ← Member Account
              </Link>
              {/* Store management */}
              <NavLink href="/dashboard"><LayoutDashboard className="size-4" />Overview</NavLink>
              <NavLink href="/dashboard/listings"><Package className="size-4" />Listings</NavLink>
              <NavLink href="/dashboard/orders"><ShoppingBag className="size-4" />Orders</NavLink>
              <NavLink href="/dashboard/messages"><MessageCircle className="size-4" />Messages</NavLink>
              <NavLink href="/dashboard/earnings"><DollarSign className="size-4" />Earnings</NavLink>
              <NavLink href="/dashboard/fans"><Users className="size-4" />Fans</NavLink>
              {/* Separator */}
              <div className="hidden md:block my-2 h-px bg-border" />
              {/* Content */}
              <NavLink href="/dashboard/videos"><Video className="size-4" />Videos</NavLink>
              <NavLink href="/dashboard/support"><Heart className="size-4" />Support</NavLink>
              {/* Separator */}
              <div className="hidden md:block my-2 h-px bg-border" />
              <p className="hidden md:block px-2 py-0.5 text-[11px] uppercase text-muted-foreground font-medium select-none" style={{ letterSpacing: '0.08em' }}>
                Reviews
              </p>
              <NavLink href="/dashboard/reviews/products"><Star className="size-4" />Product Reviews</NavLink>
              <NavLink href="/dashboard/reviews/messages"><MessageCircle className="size-4" />Storefront Messages</NavLink>
              <NavLink href="/dashboard/discount-codes"><Tag className="size-4" />Discount Codes</NavLink>
              <NavLink href="/dashboard/pod-settings"><Printer className="size-4" />POD Settings</NavLink>
              <NavLink href="/dashboard/popup"><Zap className="size-4" />Popup</NavLink>
              {/* Separator */}
              <div className="hidden md:block my-2 h-px bg-border" />
              <NavLink href="/dashboard/profile"><User className="size-4" />Profile</NavLink>
              <NavLink href="/dashboard/verification">
                <ShieldCheck className="size-4" />
                Verification
                {kycIncomplete && (
                  <span className="ml-auto size-2 rounded-full bg-amber-400 shrink-0 animate-pulse" />
                )}
              </NavLink>
              <NavLink href="/dashboard/storage">
                <HardDrive className="size-4" />
                Storage
                <Suspense fallback={null}>
                  <StorageUsageDot userId={userId} />
                </Suspense>
              </NavLink>
              {/* Member Account section */}
              <div className="hidden md:block my-2 h-px bg-border" />
              <p className="hidden md:block px-2 py-0.5 text-[11px] uppercase text-muted-foreground font-medium select-none" style={{ letterSpacing: '0.08em' }}>
                Member Account
              </p>
              <NavLink href="/account/orders"><ShoppingBag className="size-4" />My Orders</NavLink>
              <NavLink href="/account/downloads"><Download className="size-4" />My Downloads</NavLink>
              <NavLink href="/account/wishlist"><Heart className="size-4" />Wishlist</NavLink>
              <NavLink href="/account/following"><Users className="size-4" />Following</NavLink>
              <NavLink href="/account/statements"><FileText className="size-4" />My Statements</NavLink>
              <NavLink href="/account/disputes"><Scale className="size-4" />Disputes</NavLink>
              <NavLink href="/account/messages"><MessageCircle className="size-4" />Messages</NavLink>
            </nav>
          </aside>
          <main className="flex-1 min-w-0">
            {user?.accountStatus === 'RESTRICTED' && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                ⚠️ Your account is restricted due to unsigned agreements. You cannot create new listings or request payouts. <Link href="/dashboard" className="underline">Sign agreements to restore access.</Link>
              </div>
            )}
            {kycIncomplete && (
              <div className="mb-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg text-sm text-amber-400 flex items-start gap-3">
                <ShieldCheck className="size-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-300">Your store is unverified</p>
                  <p className="mt-0.5">Complete your identity verification to receive a Verified badge. Buyers can see your store is unverified until you do.</p>
                  <Link href="/dashboard/verification" className="inline-block mt-2 text-xs font-semibold underline hover:text-amber-300 transition-colors">
                    Complete verification →
                  </Link>
                </div>
              </div>
            )}
            {children}
          </main>
        </div>
      </div>
      {unsignedAgreements.length > 0 && (
        <AgreementWall
          agreements={unsignedAgreements.map(a => ({ ...a, effectiveDate: a.effectiveDate.toISOString(), publishedAt: a.publishedAt?.toISOString() ?? null }))}
          userLegalName={application?.legalFullName ?? ''}
          gracePeriodEnd={gracePeriodEnd}
          daysRemaining={daysRemaining}
        />
      )}
    </div>
  )
}
