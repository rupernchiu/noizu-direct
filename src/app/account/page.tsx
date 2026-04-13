import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { EditNameForm } from '@/components/ui/EditNameForm'
import { AvatarUploadForm } from '@/components/ui/AvatarUploadForm'

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

  const initials = user.name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#f0f0f5]">Profile</h1>
        <p className="text-sm text-[#8888aa] mt-1">Manage your account information</p>
      </div>

      {/* Profile overview */}
      <div className="bg-[#16161f] rounded-xl border border-[#2a2a3a] p-6">
        <div className="flex items-center gap-4 mb-6">
          <Avatar className="size-16">
            {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
            <AvatarFallback className="bg-[#7c3aed] text-white text-lg">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-lg font-semibold text-[#f0f0f5]">{user.name}</p>
            <p className="text-sm text-[#8888aa]">{user.email}</p>
            <p className="text-xs text-[#8888aa] mt-0.5">Member since {formatDate(user.createdAt)}</p>
          </div>
          <div className="ml-auto">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                user.role === 'ADMIN'
                  ? 'bg-red-500/20 text-red-400'
                  : user.role === 'CREATOR'
                  ? 'bg-[#00d4aa]/20 text-[#00d4aa]'
                  : 'bg-[#7c3aed]/20 text-[#7c3aed]'
              }`}
            >
              {user.role}
            </span>
          </div>
        </div>

        <div className="border-t border-[#2a2a3a] pt-6 space-y-6">
          {/* Avatar upload */}
          <div>
            <h2 className="text-sm font-semibold text-[#f0f0f5] mb-3">Profile Picture</h2>
            <AvatarUploadForm />
          </div>

          <div className="border-t border-[#2a2a3a] pt-6">
            <h2 className="text-sm font-semibold text-[#f0f0f5] mb-3">Edit Name</h2>
            <EditNameForm currentName={user.name} />
          </div>
        </div>
      </div>

      {/* Account details */}
      <div className="bg-[#16161f] rounded-xl border border-[#2a2a3a] p-6">
        <h2 className="text-sm font-semibold text-[#f0f0f5] mb-4">Account Details</h2>
        <dl className="space-y-3">
          <div className="flex justify-between text-sm">
            <dt className="text-[#8888aa]">Email</dt>
            <dd className="text-[#f0f0f5]">{user.email}</dd>
          </div>
          <div className="flex justify-between text-sm">
            <dt className="text-[#8888aa]">Account ID</dt>
            <dd className="text-[#f0f0f5] font-mono text-xs">{user.id}</dd>
          </div>
          <div className="flex justify-between text-sm">
            <dt className="text-[#8888aa]">Member Since</dt>
            <dd className="text-[#f0f0f5]">{formatDate(user.createdAt)}</dd>
          </div>
          <div className="flex justify-between text-sm">
            <dt className="text-[#8888aa]">Role</dt>
            <dd className="text-[#f0f0f5]">{user.role}</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
