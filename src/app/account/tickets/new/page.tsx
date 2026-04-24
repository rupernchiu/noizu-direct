import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Info } from 'lucide-react'
import { NewTicketForm } from './NewTicketForm'

export default async function NewTicketPage({
  searchParams,
}: {
  searchParams: Promise<{ creator?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const { creator } = await searchParams

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Link
          href="/account/tickets"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" /> My tickets
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground">Open a ticket</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Got a question for a creator that isn&apos;t tied to an order or commission yet? Open a general ticket.
        </p>
      </div>

      <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 flex items-start gap-2">
        <Info className="size-4 text-primary mt-0.5 shrink-0" />
        <div className="text-xs text-foreground">
          <p className="font-medium">Heads up</p>
          <p className="text-muted-foreground mt-0.5">
            Orders, commission requests, and quotes open their own dedicated tickets automatically — you don&apos;t need to start one manually for those.
          </p>
        </div>
      </div>

      <NewTicketForm defaultCreatorUsername={creator ?? ''} />
    </div>
  )
}
