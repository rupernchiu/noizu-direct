'use client'

import { useEffect, useRef, useState } from 'react'
import { Megaphone, EyeOff } from 'lucide-react'
import { BroadcastCard, type BroadcastTemplate } from '@/components/ui/BroadcastCard'

type FeedBroadcast = {
  id: string
  title: string
  body: string
  template: BroadcastTemplate
  audience: 'ALL_FOLLOWERS' | 'SUBSCRIBERS_ONLY'
  imageKey: string | null
  ctaText: string | null
  ctaUrl: string | null
  createdAt: Date | string
  creator: {
    username: string
    displayName: string | null
    avatar: string | null
  }
}

export type FeedItem = {
  notificationId: string
  readAt: Date | string | null
  createdAt: Date | string
  broadcast: FeedBroadcast
}

interface Props {
  initial: FeedItem[]
}

export function BroadcastFeed({ initial }: Props) {
  const [items, setItems] = useState<FeedItem[]>(initial)
  const [busyId, setBusyId] = useState<string | null>(null)
  const markedRef = useRef<Set<string>>(new Set())

  // Auto mark-as-read: anything unread on mount gets a background PATCH. Kept
  // naive (no scroll observer) because the feed is read-only and short —
  // visiting the tab is a deliberate "I want to see these" action.
  useEffect(() => {
    const unread = items.filter(i => !i.readAt && !markedRef.current.has(i.notificationId))
    if (unread.length === 0) return
    unread.forEach(i => markedRef.current.add(i.notificationId))
    Promise.all(
      unread.map(i =>
        fetch(`/api/account/broadcasts/${i.notificationId}`, { method: 'PATCH' })
          .catch(() => null),
      ),
    ).then(() => {
      setItems(prev =>
        prev.map(i =>
          markedRef.current.has(i.notificationId) && !i.readAt
            ? { ...i, readAt: new Date() }
            : i,
        ),
      )
    })
    // We only want this to run on mount; items.length captures "new data arrived".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function hide(notificationId: string) {
    setBusyId(notificationId)
    const prev = items
    setItems(p => p.filter(i => i.notificationId !== notificationId))
    const res = await fetch(`/api/account/broadcasts/${notificationId}`, { method: 'DELETE' })
    if (!res.ok) {
      setItems(prev)
    }
    setBusyId(null)
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center">
        <Megaphone className="mx-auto size-10 text-muted-foreground" />
        <p className="mt-3 text-sm font-medium text-foreground">No broadcasts</p>
        <p className="mt-1 text-xs text-muted-foreground">
          When a creator you follow sends an announcement, it'll show up here.
        </p>
      </div>
    )
  }

  return (
    <ul className="space-y-4">
      {items.map(item => (
        <li key={item.notificationId} className="relative">
          <BroadcastCard
            data={{
              id: item.broadcast.id,
              title: item.broadcast.title,
              body: item.broadcast.body,
              template: item.broadcast.template,
              imageKey: item.broadcast.imageKey,
              ctaText: item.broadcast.ctaText,
              ctaUrl: item.broadcast.ctaUrl,
              createdAt: item.broadcast.createdAt,
              creatorName: item.broadcast.creator.displayName ?? item.broadcast.creator.username,
              creatorUsername: item.broadcast.creator.username,
              creatorAvatarUrl: item.broadcast.creator.avatar,
            }}
          />
          <button
            type="button"
            onClick={() => hide(item.notificationId)}
            disabled={busyId === item.notificationId}
            className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-background/90 px-2 py-1 text-xs font-medium text-muted-foreground backdrop-blur hover:bg-surface hover:text-foreground disabled:opacity-50"
            aria-label="Hide this broadcast"
          >
            <EyeOff className="size-3" />
            Hide
          </button>
        </li>
      ))}
    </ul>
  )
}
