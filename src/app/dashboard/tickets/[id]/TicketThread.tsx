'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Flag, Lock, Send, CheckCircle2, RotateCcw, AlertCircle } from 'lucide-react'

interface ThreadMessage {
  id: string
  body: string
  senderId: string
  senderName: string
  senderAvatar: string | null
  systemKind: string | null
  createdAt: string
  reportedAt: string | null
}

interface OtherParty {
  id: string
  name: string
  avatar: string | null
}

interface TicketThreadProps {
  ticketId: string
  status: 'OPEN' | 'CLOSED'
  viewerId: string
  viewerIsCreator: boolean
  otherParty: OtherParty
  initialMessages: ThreadMessage[]
  canReply: boolean
  readOnlyReason: string | null
  closeBlocker: string | null
  blockedBuyer: boolean
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const hr = diff / (1000 * 60 * 60)
  if (hr < 1) return `${Math.max(1, Math.floor(diff / (1000 * 60)))}m ago`
  if (hr < 24) return `${Math.floor(hr)}h ago`
  return d.toLocaleString()
}

export function TicketThread(props: TicketThreadProps) {
  const {
    ticketId,
    status,
    viewerId,
    viewerIsCreator,
    otherParty,
    initialMessages,
    canReply,
    readOnlyReason,
    closeBlocker,
    blockedBuyer,
  } = props

  const router = useRouter()
  const messages = initialMessages
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [closing, setClosing] = useState(false)
  const [reopening, setReopening] = useState(false)
  const [closeReason, setCloseReason] = useState('')
  const [showCloseForm, setShowCloseForm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [blockBusy, setBlockBusy] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = endRef.current
    const container = el?.parentElement
    if (container) container.scrollTop = container.scrollHeight
  }, [messages])

  async function send() {
    const trimmed = body.trim()
    if (!trimmed || sending) return
    if (trimmed.length > 5000) {
      setError('Message is too long (max 5000 characters).')
      return
    }
    setSending(true)
    setError(null)
    try {
      const res = await fetch(`/api/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: trimmed }),
      })
      const data = await res.json().catch(() => ({})) as { error?: string }
      if (!res.ok) {
        setError(data.error ?? 'Failed to send.')
        return
      }
      setBody('')
      router.refresh()
    } finally {
      setSending(false)
    }
  }

  async function closeTicket() {
    if (closing) return
    setClosing(true)
    setError(null)
    try {
      const res = await fetch(`/api/tickets/${ticketId}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: closeReason.trim() || undefined }),
      })
      const data = await res.json().catch(() => ({})) as { error?: string }
      if (!res.ok) {
        setError(data.error ?? 'Failed to close.')
        return
      }
      router.refresh()
    } finally {
      setClosing(false)
      setShowCloseForm(false)
    }
  }

  async function reopenTicket() {
    if (reopening) return
    setReopening(true)
    setError(null)
    try {
      const res = await fetch(`/api/tickets/${ticketId}/reopen`, { method: 'POST' })
      const data = await res.json().catch(() => ({})) as { error?: string }
      if (!res.ok) {
        setError(data.error ?? 'Failed to reopen.')
        return
      }
      router.refresh()
    } finally {
      setReopening(false)
    }
  }

  async function reportMessage(messageId: string) {
    const reason = window.prompt('Tell us what\'s wrong with this message (5–500 chars):')
    if (!reason || reason.trim().length < 5) return
    const res = await fetch(`/api/tickets/${ticketId}/messages/${messageId}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: reason.trim() }),
    })
    if (res.ok) {
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({})) as { error?: string }
      setError(data.error ?? 'Failed to report.')
    }
  }

  async function toggleBlock() {
    if (blockBusy) return
    setBlockBusy(true)
    setError(null)
    try {
      if (blockedBuyer) {
        // Need the block's id — look it up from list endpoint.
        const listRes = await fetch('/api/tickets/blocks')
        const list = await listRes.json().catch(() => ({})) as {
          blocks?: { id: string; user: { id: string } }[]
        }
        const match = list.blocks?.find((b) => b.user.id === otherParty.id)
        if (!match) {
          setError('Could not locate block record.')
          return
        }
        const res = await fetch(`/api/tickets/blocks/${match.id}`, { method: 'DELETE' })
        if (!res.ok) {
          const data = await res.json().catch(() => ({})) as { error?: string }
          setError(data.error ?? 'Failed to unblock.')
          return
        }
      } else {
        const reason = window.prompt('Optional: reason for blocking this buyer (internal only):')
        const res = await fetch('/api/tickets/blocks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: otherParty.id, reason: reason?.trim() || undefined }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({})) as { error?: string }
          setError(data.error ?? 'Failed to block.')
          return
        }
      }
      router.refresh()
    } finally {
      setBlockBusy(false)
    }
  }

  return (
    <div className="bg-surface rounded-xl border border-border overflow-hidden flex flex-col h-[calc(100dvh-22rem)] min-h-[420px]">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground mt-8">No messages yet.</p>
        ) : (
          messages.map((m) => {
            const isSystem = Boolean(m.systemKind)
            const isMine = m.senderId === viewerId
            if (isSystem) {
              return (
                <div key={m.id} className="flex justify-center">
                  <div className="text-xs text-muted-foreground italic bg-card/40 rounded-full px-3 py-1">
                    {m.body} · {formatTime(m.createdAt)}
                  </div>
                </div>
              )
            }
            return (
              <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'} group`}>
                <div className={`max-w-[75%] space-y-1`}>
                  <div
                    className={`px-3 py-2 rounded-xl text-sm whitespace-pre-wrap break-words ${
                      isMine
                        ? 'bg-primary text-white rounded-br-sm'
                        : 'bg-card text-foreground rounded-bl-sm border border-border'
                    }`}
                  >
                    <p>{m.body}</p>
                  </div>
                  <div className={`flex items-center gap-2 text-[10px] ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <span className="text-muted-foreground">
                      {m.senderName} · {formatTime(m.createdAt)}
                    </span>
                    {m.reportedAt && (
                      <span className="inline-flex items-center gap-1 text-amber-500">
                        <Flag className="size-3" /> reported
                      </span>
                    )}
                    {!isMine && !m.reportedAt && (
                      <button
                        type="button"
                        onClick={() => reportMessage(m.id)}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-amber-500 transition-all"
                      >
                        Report
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={endRef} />
      </div>

      {error && (
        <div className="border-t border-border bg-red-500/10 px-4 py-2 text-xs text-red-400 flex items-center gap-2">
          <AlertCircle className="size-3.5" /> {error}
        </div>
      )}

      {/* Footer: compose or status banner */}
      {status === 'CLOSED' ? (
        <div className="border-t border-border px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Lock className="size-3.5" />
            This ticket is closed. {viewerIsCreator ? 'Reopen it to continue the conversation.' : 'Contact the creator if you need to reopen.'}
          </div>
          {viewerIsCreator && (
            <button
              type="button"
              onClick={reopenTicket}
              disabled={reopening}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary/90 hover:bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-50"
            >
              <RotateCcw className="size-3.5" />
              {reopening ? 'Reopening…' : 'Reopen ticket'}
            </button>
          )}
        </div>
      ) : !canReply ? (
        <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground flex items-center gap-1.5">
          <Lock className="size-3.5" /> {readOnlyReason ?? 'Read-only.'}
        </div>
      ) : (
        <div className="border-t border-border px-4 py-3 space-y-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                send()
              }
            }}
            rows={2}
            maxLength={5000}
            placeholder="Write a reply… (Ctrl/Cmd+Enter to send)"
            className="w-full resize-none rounded-lg bg-background border border-border px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {viewerIsCreator && (
                <>
                  {!showCloseForm ? (
                    <button
                      type="button"
                      onClick={() => setShowCloseForm(true)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                    >
                      <CheckCircle2 className="size-3.5" /> Close ticket
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={toggleBlock}
                    disabled={blockBusy}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-red-400 hover:border-red-500/40 transition-colors disabled:opacity-50"
                  >
                    {blockedBuyer ? 'Unblock buyer' : 'Block buyer'}
                  </button>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={send}
              disabled={sending || !body.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary hover:bg-primary/90 px-3 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-50"
            >
              <Send className="size-3.5" />
              {sending ? 'Sending…' : 'Send'}
            </button>
          </div>
          {showCloseForm && viewerIsCreator && (
            <div className="rounded-lg border border-border bg-background/50 p-3 space-y-2">
              <p className="text-xs text-foreground">Closing this ticket locks the thread. 90-day retention kicks in after close.</p>
              {closeBlocker && (
                <p className="text-xs text-amber-500 flex items-center gap-1.5">
                  <AlertCircle className="size-3.5" />
                  Heads up — {closeBlocker}
                </p>
              )}
              <input
                type="text"
                value={closeReason}
                onChange={(e) => setCloseReason(e.target.value)}
                maxLength={200}
                placeholder="Optional: reason shown to buyer"
                className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowCloseForm(false)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={closeTicket}
                  disabled={closing}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/90 hover:bg-red-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-50"
                >
                  {closing ? 'Closing…' : 'Confirm close'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
