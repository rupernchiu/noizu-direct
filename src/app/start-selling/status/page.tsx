import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-MY', { dateStyle: 'long', timeStyle: 'short' }).format(
    new Date(date),
  )
}

export default async function StartSellingStatusPage() {
  const session = await auth()
  if (!session) redirect('/login?callbackUrl=/start-selling/status')

  const userId = (session.user as any).id as string

  const application = await prisma.creatorApplication.findUnique({
    where: { userId },
  })

  if (!application) redirect('/start-selling')
  if (application.status === 'APPROVED') redirect('/dashboard')
  if (application.status === 'DRAFT') redirect('/start-selling')

  const status = application.status as
    | 'SUBMITTED'
    | 'UNDER_REVIEW'
    | 'APPROVED'
    | 'REJECTED'

  return (
    <div className="min-h-screen bg-background py-16 px-4">
      <div className="max-w-lg mx-auto">
        <div className="bg-surface border border-border rounded-2xl p-8 text-center space-y-6">
          {/* Status icon + heading */}
          {(status === 'SUBMITTED' || status === 'UNDER_REVIEW') && (
            <>
              <div className="text-5xl">⏳</div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Under Review</h1>
                <p className="text-sm text-muted-foreground mt-2">
                  Submitted{' '}
                  {application.submittedAt
                    ? formatDate(application.submittedAt)
                    : formatDate(application.createdAt)}
                  . Expected review time: 24–48 hours.
                </p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800 text-left space-y-1 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                <p className="font-semibold text-amber-900 dark:text-amber-200">What happens next?</p>
                <p>
                  Our team will verify your identity and documents. You will receive an email once
                  the review is complete.
                </p>
              </div>
              <a
                href="mailto:hello@noizu.direct"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground hover:border-primary/40 transition-colors"
              >
                Contact Support
              </a>
            </>
          )}

          {status === 'REJECTED' && (
            <>
              <div className="text-5xl">❌</div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Application Not Approved</h1>
                {application.rejectionReason && (
                  <div className="mt-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800 text-left dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-300">
                    <span className="font-semibold">Reason: </span>
                    {application.rejectionReason}
                  </div>
                )}
                <p className="text-sm text-muted-foreground mt-3">
                  You may reapply after addressing the issues above.
                </p>
              </div>
              <Link
                href="/start-selling"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
              >
                Reapply →
              </Link>
            </>
          )}

          {/* Reference number */}
          <p className="text-xs text-muted-foreground border-t border-border pt-4">
            Application reference:{' '}
            <span className="font-mono text-foreground">{application.id}</span>
          </p>
        </div>

        {/* Back link */}
        <div className="mt-4 text-center">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
