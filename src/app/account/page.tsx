import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { EditNameForm } from '@/components/ui/EditNameForm'
import { EditEmailForm } from '@/components/ui/EditEmailForm'
import { ChangePasswordForm } from '@/components/ui/ChangePasswordForm'
import { AvatarUploadForm } from '@/components/ui/AvatarUploadForm'
import { ROLE_LABELS } from '@/lib/labels'
import { XCircle, CheckCircle, Clock, ArrowRight, Palette } from 'lucide-react'
import Link from 'next/link'

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'long' }).format(date)
}

export default async function AccountPage() {
  const session = await auth()
  if (!session) redirect('/login')
  const userId = (session.user as any).id
  const userRole = (session.user as any).role as string

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, avatar: true, createdAt: true },
  })
  if (!user) redirect('/login')

  const [orderCount, totalSpentData, followingCount, wishlistCount, application, creatorProfile] = await Promise.all([
    prisma.order.count({ where: { buyerId: userId } }),
    prisma.order.aggregate({ where: { buyerId: userId, status: { in: ['PAID','PROCESSING','SHIPPED','COMPLETED'] } }, _sum: { amountUsd: true } }),
    prisma.creatorFollow.count({ where: { buyerId: userId } }),
    prisma.wishlistItem.count({ where: { buyerId: userId } }),
    prisma.creatorApplication.findFirst({
      where: { userId, status: { in: ['REJECTED', 'SUBMITTED', 'UNDER_REVIEW'] } },
      select: { status: true, rejectionReason: true, submittedAt: true },
      orderBy: { createdAt: 'desc' },
    }),
    userRole === 'CREATOR'
      ? prisma.creatorProfile.findUnique({ where: { userId }, select: { createdAt: true } })
      : Promise.resolve(null),
  ])
  const totalSpent = totalSpentData._sum.amountUsd ?? 0

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const isNewCreator = creatorProfile ? creatorProfile.createdAt > thirtyDaysAgo : false

  const initials = user.name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="space-y-8">
      {/* ── Application status banners ──────────────────────────────────────── */}

      {/* Rejected */}
      {application?.status === 'REJECTED' && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca',
          borderRadius: '12px', padding: '16px 20px',
          display: 'flex', alignItems: 'flex-start', gap: '12px',
        }}>
          <XCircle size={20} color="#dc2626" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 600, color: '#991b1b', margin: '0 0 4px', fontSize: '14px' }}>
              Creator Application Not Approved
            </p>
            <p style={{ fontSize: '13px', color: '#b91c1c', margin: '0 0 12px' }}>
              {application.rejectionReason ?? 'Please review your application and reapply.'}
            </p>
            <Link href="/start-selling" style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              fontSize: '13px', fontWeight: 600, color: '#dc2626',
              background: 'white', padding: '6px 14px',
              borderRadius: '20px', border: '1px solid #fecaca', textDecoration: 'none',
            }}>
              Reapply Now <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      )}

      {/* Under review */}
      {(application?.status === 'SUBMITTED' || application?.status === 'UNDER_REVIEW') && (
        <div style={{
          background: '#eff6ff', border: '1px solid #bfdbfe',
          borderRadius: '12px', padding: '16px 20px',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <Clock size={20} color="#2563eb" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 600, color: '#1d4ed8', margin: '0 0 4px', fontSize: '14px' }}>
              Creator Application Under Review
            </p>
            <p style={{ fontSize: '13px', color: '#3b82f6', margin: 0 }}>
              {application.submittedAt
                ? `Submitted ${formatDate(application.submittedAt)}. `
                : ''}
              Expected review time: 24–48 hours.
            </p>
          </div>
          <Link href="/start-selling/status" style={{
            fontSize: '13px', fontWeight: 600, color: '#2563eb',
            background: 'white', padding: '6px 14px',
            borderRadius: '20px', border: '1px solid #bfdbfe',
            textDecoration: 'none', whiteSpace: 'nowrap',
          }}>
            Check Status →
          </Link>
        </div>
      )}

      {/* Newly approved creator */}
      {userRole === 'CREATOR' && isNewCreator && (
        <div style={{
          background: 'linear-gradient(135deg, #faf5ff, #ede9fe)',
          border: '1px solid #c4b5fd', borderRadius: '12px',
          padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <CheckCircle size={20} color="#7c3aed" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 600, color: '#6d28d9', margin: '0 0 4px', fontSize: '14px' }}>
              🎉 You are a verified creator!
            </p>
            <p style={{ fontSize: '13px', color: '#7c3aed', margin: 0 }}>
              Manage your store and products from your creator dashboard.
            </p>
          </div>
          <Link href="/dashboard" style={{
            fontSize: '13px', fontWeight: 600, color: '#7c3aed',
            background: 'white', padding: '6px 14px',
            borderRadius: '20px', border: '1px solid #c4b5fd',
            textDecoration: 'none', whiteSpace: 'nowrap',
          }}>
            Creator Dashboard →
          </Link>
        </div>
      )}

      {/* No application yet — upsell for buyers */}
      {!application && userRole === 'BUYER' && (
        <div style={{
          background: 'linear-gradient(135deg, #faf5ff, #ede9fe)',
          border: '1px solid #c4b5fd', borderRadius: '12px',
          padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <Palette size={20} color="#7c3aed" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 600, color: '#6d28d9', margin: '0 0 4px', fontSize: '14px' }}>
              🎨 Want to sell on NOIZU-DIRECT?
            </p>
            <p style={{ fontSize: '13px', color: '#7c3aed', margin: 0 }}>
              Join thousands of SEA creators selling directly to fans.
            </p>
          </div>
          <Link href="/start-selling" style={{
            fontSize: '13px', fontWeight: 600, color: '#7c3aed',
            background: 'white', padding: '6px 14px',
            borderRadius: '20px', border: '1px solid #c4b5fd',
            textDecoration: 'none', whiteSpace: 'nowrap',
          }}>
            Start Selling →
          </Link>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account information</p>
      </div>

      {/* Profile overview */}
      <div className="bg-surface rounded-xl border border-border p-6">
        <div className="flex items-center gap-4 mb-6">
          <Avatar className="size-16">
            {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
            <AvatarFallback className="bg-primary text-white text-lg">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-lg font-semibold text-foreground">{user.name}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Member since {formatDate(user.createdAt)}</p>
          </div>
          <div className="ml-auto">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                user.role === 'ADMIN'
                  ? 'bg-red-500/20 text-red-400'
                  : user.role === 'CREATOR'
                  ? 'bg-secondary/20 text-secondary'
                  : 'bg-primary/20 text-primary'
              }`}
            >
              {ROLE_LABELS[user.role] ?? user.role}
            </span>
          </div>
        </div>

        <div className="border-t border-border pt-6 space-y-6">
          {/* Avatar upload */}
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-3">Profile Picture</h2>
            <AvatarUploadForm />
          </div>

          <div className="border-t border-border pt-6">
            <h2 className="text-sm font-semibold text-foreground mb-3">Edit Name</h2>
            <EditNameForm currentName={user.name} />
          </div>

          <div className="border-t border-border pt-6">
            <h2 className="text-sm font-semibold text-foreground mb-3">Change Email</h2>
            <EditEmailForm currentEmail={user.email} />
          </div>

          <div className="border-t border-border pt-6">
            <h2 className="text-sm font-semibold text-foreground mb-3">Change Password</h2>
            <ChangePasswordForm />
          </div>
        </div>
      </div>

      {/* Account details */}
      <div className="bg-surface rounded-xl border border-border p-6">
        <h2 className="text-sm font-semibold text-foreground mb-4">Account Details</h2>
        <dl className="space-y-3">
          <div className="flex justify-between text-sm">
            <dt className="text-muted-foreground">Email</dt>
            <dd className="text-foreground">{user.email}</dd>
          </div>
          <div className="flex justify-between text-sm">
            <dt className="text-muted-foreground">Account ID</dt>
            <dd className="text-foreground font-mono text-xs">{user.id}</dd>
          </div>
          <div className="flex justify-between text-sm">
            <dt className="text-muted-foreground">Member Since</dt>
            <dd className="text-foreground">{formatDate(user.createdAt)}</dd>
          </div>
          <div className="flex justify-between text-sm">
            <dt className="text-muted-foreground">Role</dt>
            <dd className="text-foreground">{ROLE_LABELS[user.role] ?? user.role}</dd>
          </div>
        </dl>
      </div>

      {/* Account Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Orders', value: orderCount },
          { label: 'Total Spent', value: `$${(totalSpent / 100).toFixed(2)}` },
          { label: 'Following', value: followingCount },
          { label: 'Wishlist', value: wishlistCount },
        ].map(stat => (
          <div key={stat.label} className="bg-surface rounded-xl border border-border p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-surface rounded-xl border border-red-500/20 p-6">
        <h2 className="text-sm font-semibold text-red-400 mb-4">Danger Zone</h2>
        <div className="flex flex-wrap gap-3">
          <a
            href="/api/account/export"
            className="inline-flex items-center px-4 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Export My Data
          </a>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Export downloads a JSON file with all your account data including orders, messages, and profile.
        </p>
      </div>
    </div>
  )
}
