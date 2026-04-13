import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ProfileForm } from './ProfileForm'

export default async function ProfilePage() {
  const session = await auth()
  if (!session) redirect('/login')
  if ((session.user as any).role !== 'CREATOR') redirect('/')
  const userId = (session.user as any).id

  const profile = await prisma.creatorProfile.findUnique({ where: { userId } })
  if (!profile) redirect('/')

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#f0f0f5]">Creator Profile</h1>
        <p className="text-sm text-[#8888aa] mt-1">Update your public profile and store settings</p>
      </div>
      <ProfileForm profile={profile} />
    </div>
  )
}
