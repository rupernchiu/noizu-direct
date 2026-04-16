import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { EditNameForm } from '@/components/ui/EditNameForm'
import { AvatarUploadForm } from '@/components/ui/AvatarUploadForm'
import { ROLE_LABELS } from '@/lib/labels'

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'long' }).format(date)
}

export default async function AccountPage() {
  const session = await auth()
  if (!session) redirect('/login')
  const userId = (session.user as any).id

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, avatar: true, createdAt: true },
  })
  if (!user) redirect('/login')

  const [orderCount, totalSpentData, followingCount, wishlistCount] = await Promise.all([
    prisma.order.count({ where: { buyerId: userId } }),
    prisma.order.aggregate({ where: { buyerId: userId, status: { in: ['PAID','PROCESSING','SHIPPED','COMPLETED'] } }, _sum: { amountUsd: true } }),
    prisma.creatorFollow.count({ where: { buyerId: userId } }),
    prisma.wishlistItem.count({ where: { buyerId: userId } }),
  ])
  const totalSpent = totalSpentData._sum.amountUsd ?? 0

  const initials = user.name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="space-y-8">
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
