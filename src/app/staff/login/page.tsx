import type { Metadata } from 'next'
import StaffLoginForm from './StaffLoginForm'

export const metadata: Metadata = {
  title: 'Staff Login — noizu.direct',
}

export default function StaffLoginPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-card rounded-2xl border border-border p-8 space-y-6">
        <div className="space-y-1 text-center">
          <div className="flex justify-center mb-3">
            <span className="px-2.5 py-0.5 rounded bg-destructive/20 text-destructive text-xs font-bold tracking-wide">
              STAFF PORTAL
            </span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Staff Sign In</h1>
          <p className="text-sm text-muted-foreground">
            Sign in with your staff account credentials
          </p>
        </div>

        <StaffLoginForm />

        <p className="text-xs text-muted-foreground text-center">
          Forgot your password?{' '}
          <span className="text-foreground">Contact your system administrator.</span>
          <br />
          Staff passwords can only be reset by a super-admin.
        </p>
      </div>
    </div>
  )
}
