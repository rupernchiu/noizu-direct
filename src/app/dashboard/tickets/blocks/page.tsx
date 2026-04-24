import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { ArrowLeft, Shield } from 'lucide-react'
import { UnblockButton } from './UnblockButton'

export default async function CreatorBlocksPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const userId = (session.user as { id: string }).id
  const role = (session.user as { role?: string }).role
  if (role !== 'CREATOR') redirect('/')

  const blocks = await prisma.userBlock.findMany({
    where: { blockerId: userId },
    orderBy: { createdAt: 'desc' },
    include: { blocked: { select: { id: true, name: true, avatar: true, email: true } } },
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard/tickets"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" /> All tickets
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Shield className="size-6 text-primary" /> Blocked buyers
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Blocked buyers can&apos;t open new tickets or reply to existing ones with you. You can unblock anyone at any time.
        </p>
      </div>

      {blocks.length === 0 ? (
        <div className="bg-surface rounded-xl border border-border px-5 py-12 text-center">
          <p className="text-sm text-muted-foreground">You haven&apos;t blocked anyone.</p>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface overflow-hidden">
          {blocks.map((b) => (
            <li key={b.id} className="flex items-center gap-3 px-4 py-3">
              <div className="shrink-0 size-9 rounded-full bg-gradient-to-br from-primary/40 to-secondary/40 flex items-center justify-center text-xs font-bold text-white">
                {b.blocked.name?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {b.blocked.name ?? 'Unknown'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {b.reason ? `Reason: ${b.reason}` : 'No reason recorded'}
                </p>
                <p className="text-[10px] text-muted-foreground/80 mt-0.5">
                  Blocked {new Date(b.createdAt).toLocaleDateString()}
                </p>
              </div>
              <UnblockButton blockId={b.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
