'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Ticket as TicketIcon } from 'lucide-react'
import { useSession } from 'next-auth/react'

export function MessagesIcon() {
  const { data: session } = useSession()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    if (!session?.user) return
    const load = async () => {
      try {
        const res = await fetch('/api/tickets/unread-count')
        if (res.ok) {
          const data = await res.json() as { count: number }
          setUnread(data.count)
        }
      } catch { /* ignore */ }
    }
    void load()
    const interval = setInterval(() => void load(), 30_000)
    return () => clearInterval(interval)
  }, [session?.user])

  if (!session?.user) return null

  const role = (session.user as { role?: string }).role
  const href = role === 'CREATOR' ? '/dashboard/tickets' : '/account/tickets'

  return (
    <Link
      href={href}
      aria-label="Tickets"
      className="relative p-1.5 text-muted-foreground hover:text-foreground transition-colors"
    >
      <TicketIcon className="size-5" />
      {unread > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center px-0.5">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </Link>
  )
}
