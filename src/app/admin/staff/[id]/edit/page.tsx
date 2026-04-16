import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { loadStaffActor, can } from '@/lib/staffPolicy'
import { EditStaffForm } from './EditStaffForm'

export default async function EditStaffPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const isMainAdmin = session && (session.user as any).role === 'ADMIN'
  if (!isMainAdmin) {
    const actor = await loadStaffActor()
    if (!actor || !actor.isSuperAdmin) redirect('/admin/staff')
  }

  const { id } = await params
  const user = await prisma.staffUser.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, department: true, isActive: true, isSuperAdmin: true },
  })
  if (!user) notFound()

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Edit Staff User</h2>
        <p className="text-sm text-muted-foreground mt-0.5">{user.email}</p>
      </div>
      <EditStaffForm user={user} />
    </div>
  )
}
