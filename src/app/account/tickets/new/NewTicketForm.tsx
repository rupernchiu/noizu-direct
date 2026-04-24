'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Send } from 'lucide-react'

export function NewTicketForm({ defaultCreatorUsername }: { defaultCreatorUsername: string }) {
  const router = useRouter()
  const [creatorUsername, setCreatorUsername] = useState(defaultCreatorUsername)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setError(null)
    const username = creatorUsername.trim().replace(/^@/, '')
    if (!username) {
      setError('Enter a creator username.')
      return
    }
    if (!subject.trim() || subject.trim().length > 140) {
      setError('Subject is required and must be 140 characters or fewer.')
      return
    }
    if (!body.trim() || body.trim().length > 5000) {
      setError('Write a message (max 5000 characters).')
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorUsername: username,
          subject: subject.trim(),
          body: body.trim(),
        }),
      })
      const data = await res.json().catch(() => ({})) as { ticket?: { id: string }; error?: string }
      if (!res.ok) {
        setError(data.error ?? 'Could not open ticket.')
        return
      }
      if (data.ticket?.id) {
        router.push(`/account/tickets/${data.ticket.id}`)
      } else {
        router.push('/account/tickets')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="bg-surface rounded-xl border border-border p-5 space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Creator username</label>
        <div className="flex items-center rounded-lg bg-background border border-border focus-within:ring-2 focus-within:ring-ring">
          <span className="pl-3 text-muted-foreground text-sm">@</span>
          <input
            type="text"
            value={creatorUsername}
            onChange={(e) => setCreatorUsername(e.target.value)}
            maxLength={64}
            placeholder="username"
            className="flex-1 bg-transparent px-2 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none"
            required
          />
        </div>
        <p className="text-[11px] text-muted-foreground">
          Tip: you can find a creator&apos;s username on their profile URL (e.g. noizu.direct/@username).
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Subject
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          maxLength={140}
          placeholder="Short summary — what do you want to ask about?"
          className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          required
        />
        <p className="text-[11px] text-muted-foreground text-right">{subject.length}/140</p>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Message</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={5000}
          rows={6}
          placeholder="Add as much context as you can — the more detail you give, the faster the creator can help."
          className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          required
        />
        <p className="text-[11px] text-muted-foreground text-right">{body.length}/5000</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-400 flex items-center gap-2">
          <AlertCircle className="size-3.5" /> {error}
        </div>
      )}

      <div className="flex items-center justify-end">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary hover:bg-primary/90 px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50"
        >
          <Send className="size-3.5" />
          {busy ? 'Opening…' : 'Open ticket'}
        </button>
      </div>
    </form>
  )
}
