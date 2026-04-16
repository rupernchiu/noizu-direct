import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { loadStaffActor, can } from '@/lib/staffPolicy'
import { NewStaffForm } from './NewStaffForm'

export default async function NewStaffPage() {
  const session = await auth()
  const isMainAdmin = session && (session.user as any).role === 'ADMIN'
  if (!isMainAdmin) {
    const actor = await loadStaffActor()
    if (!actor || !can(actor, 'staff.create') || !actor.isSuperAdmin) redirect('/admin/staff')
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Create Staff User</h2>
        <p className="text-sm text-muted-foreground mt-0.5">New staff members can sign in at /staff/login</p>
      </div>
      <NewStaffForm />
    </div>
  )
}
