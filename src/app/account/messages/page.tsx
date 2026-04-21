'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'

interface ConversationCreatorProfile {
  username: string | null
  displayName: string | null
  avatar: string | null
}

interface ConversationCreator {
  id: string
  name: string
  creatorProfile: ConversationCreatorProfile | null
}

interface LastMessage {
  content: string
  createdAt: string
  senderId: string
}

interface Conversation {
  id: string
  buyerId: string
  creatorId: string
  lastMessageAt: string
  creator: ConversationCreator
  unreadCount: number
  lastMessage: LastMessage | null
}

interface Message {
  id: string
  senderId: string
  receiverId: string
  content: string
  imageUrl: string | null
  isRead: boolean
  createdAt: string
  orderId: string | null
}

interface NewConvoTarget {
  userId: string
  username: string
  displayName: string
  avatar: string | null
}

function formatTime(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHrs = diffMs / (1000 * 60 * 60)
  if (diffHrs < 24) {
    return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(date)
  }
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'short' }).format(date)
}

export default function MessagesPage() {
  const searchParams = useSearchParams()
  const toUsername = searchParams.get('to')

  const [conversations, setConversations]     = useState<Conversation[]>([])
  const [selectedConvoId, setSelectedConvoId] = useState<string | null>(null)
  const [messages, setMessages]               = useState<Message[]>([])
  const [otherUserId, setOtherUserId]         = useState<string | null>(null)
  const [newConvoTarget, setNewConvoTarget]   = useState<NewConvoTarget | null>(null)
  const [content, setContent]                 = useState('')
  const [sending, setSending]                 = useState(false)
  const [mobileShowThread, setMobileShowThread] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const didAutoSelect  = useRef(false)

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/messages')
      if (res.ok) {
        const data = await res.json()
        setConversations(data)
        return data as Conversation[]
      }
    } catch { /* ignore */ }
    return [] as Conversation[]
  }, [])

  const fetchMessages = useCallback(async (convoId: string) => {
    try {
      const res = await fetch(`/api/messages/${convoId}`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages)
        setOtherUserId(data.otherUserId)
      }
    } catch { /* ignore */ }
  }, [])

  // Initial load — auto-select or start new conversation if ?to= is present
  useEffect(() => {
    fetchConversations().then(async (convos) => {
      if (!toUsername || didAutoSelect.current) return
      didAutoSelect.current = true

      // Find existing conversation with this creator
      const match = convos.find(
        (c) => c.creator.creatorProfile?.username === toUsername
      )
      if (match) {
        setSelectedConvoId(match.id)
        fetchMessages(match.id)
        setMobileShowThread(true)
        return
      }

      // No existing conversation — look up the creator to enable starting one
      try {
        const res = await fetch(`/api/messages/lookup?username=${encodeURIComponent(toUsername)}`)
        if (res.ok) {
          const data = await res.json()
          setNewConvoTarget(data)
          setOtherUserId(data.userId)
          setMobileShowThread(true)
        }
      } catch { /* ignore */ }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toUsername])

  // Polling every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchConversations()
      if (selectedConvoId) fetchMessages(selectedConvoId)
    }, 5000)
    return () => clearInterval(interval)
  }, [fetchConversations, fetchMessages, selectedConvoId])

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function selectConvo(convoId: string) {
    setSelectedConvoId(convoId)
    setNewConvoTarget(null)
    fetchMessages(convoId)
    setMobileShowThread(true)
  }

  async function sendMessage() {
    if (!content.trim() || !otherUserId) return
    setSending(true)
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: otherUserId, content }),
      })
      if (res.ok) {
        setContent('')
        const convos = await fetchConversations()
        // If this was a new conversation, switch to the newly created one
        if (newConvoTarget) {
          const created = convos.find(
            (c) => c.creator.creatorProfile?.username === newConvoTarget.username
          )
          if (created) {
            setNewConvoTarget(null)
            setSelectedConvoId(created.id)
            fetchMessages(created.id)
          }
        } else if (selectedConvoId) {
          await fetchMessages(selectedConvoId)
        }
      }
    } catch { /* ignore */ }
    finally { setSending(false) }
  }

  const selectedConvo = conversations.find((c) => c.id === selectedConvoId)

  // Determine the thread header name
  const threadDisplayName = newConvoTarget
    ? newConvoTarget.displayName
    : (selectedConvo?.creator.creatorProfile?.displayName ?? selectedConvo?.creator.name ?? '')

  const threadAvatar = newConvoTarget?.avatar ?? selectedConvo?.creator.creatorProfile?.avatar ?? null
  const isThreadOpen = Boolean(selectedConvo || newConvoTarget)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Messages</h1>
        <p className="text-sm text-muted-foreground mt-1">Chat with creators</p>
      </div>

      <div className="bg-surface rounded-xl border border-border overflow-hidden h-[calc(100dvh-10rem)] md:h-[600px] flex">
        {/* Conversations list */}
        <div
          className={`w-full md:w-72 md:block shrink-0 border-r border-border flex flex-col ${
            mobileShowThread ? 'hidden' : 'flex'
          }`}
        >
          <div className="px-4 py-3 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Conversations
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {/* New conversation target — show at top if present */}
            {newConvoTarget && (
              <div
                className="w-full px-4 py-3 flex items-start gap-3 bg-primary/10 border-b border-primary/20"
              >
                <div className="shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-primary/40 to-secondary/40 flex items-center justify-center text-xs font-bold text-white overflow-hidden">
                  {newConvoTarget.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={newConvoTarget.avatar} alt={newConvoTarget.displayName} className="w-full h-full object-cover" />
                  ) : (
                    newConvoTarget.displayName[0]?.toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{newConvoTarget.displayName}</p>
                  <p className="text-xs text-primary mt-0.5">New conversation</p>
                </div>
              </div>
            )}

            {conversations.length === 0 && !newConvoTarget ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <p className="text-sm text-muted-foreground">No conversations yet.</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Visit a creator&apos;s page and click Message to start chatting.
                </p>
              </div>
            ) : (
              conversations.map((convo) => {
                const displayName =
                  convo.creator.creatorProfile?.displayName ?? convo.creator.name
                const isSelected = selectedConvoId === convo.id
                return (
                  <button
                    suppressHydrationWarning
                    key={convo.id}
                    onClick={() => selectConvo(convo.id)}
                    className={`w-full px-4 py-3 flex items-start gap-3 text-left hover:bg-card transition-colors ${
                      isSelected ? 'bg-card' : ''
                    }`}
                  >
                    {/* Avatar */}
                    <div className="shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-primary/40 to-secondary/40 flex items-center justify-center text-xs font-bold text-white overflow-hidden">
                      {convo.creator.creatorProfile?.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={convo.creator.creatorProfile.avatar}
                          alt={displayName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        displayName[0]?.toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-sm font-medium text-foreground truncate">
                          {displayName}
                        </span>
                        {convo.lastMessage && (
                          <span className="text-xs text-muted-foreground shrink-0">
                            {formatTime(convo.lastMessage.createdAt)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-1 mt-0.5">
                        <p className="text-xs text-muted-foreground truncate">
                          {convo.lastMessage?.content ?? 'No messages yet'}
                        </p>
                        {convo.unreadCount > 0 && (
                          <span className="shrink-0 inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary text-white text-xs font-bold">
                            {convo.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Thread panel */}
        <div
          className={`flex-1 flex flex-col min-w-0 ${
            !mobileShowThread ? 'hidden md:flex' : 'flex'
          }`}
        >
          {!isThreadOpen ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Select a conversation</p>
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div className="px-4 py-3 border-b border-border flex items-center gap-3">
                <button
                  suppressHydrationWarning
                  className="md:hidden flex items-center justify-center size-10 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
                  onClick={() => setMobileShowThread(false)}
                  aria-label="Back to conversations"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                {threadAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={threadAvatar} alt={threadDisplayName} className="w-7 h-7 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/40 to-secondary/40 flex items-center justify-center text-xs font-bold text-white shrink-0">
                    {threadDisplayName[0]?.toUpperCase()}
                  </div>
                )}
                <p className="text-sm font-semibold text-foreground">{threadDisplayName}</p>
                {newConvoTarget && (
                  <span className="ml-auto text-xs text-primary font-medium">New conversation</span>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {newConvoTarget && messages.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground mt-8">
                    Start a conversation with {newConvoTarget.displayName}!
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground mt-8">
                    No messages yet. Say hello!
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMine = msg.senderId !== otherUserId
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] px-3 py-2 rounded-xl text-sm ${
                            isMine
                              ? 'bg-primary text-white rounded-br-sm'
                              : 'bg-border text-foreground rounded-bl-sm'
                          }`}
                        >
                          <p>{msg.content}</p>
                          <p
                            className={`text-xs mt-1 ${
                              isMine ? 'text-white/60' : 'text-muted-foreground'
                            }`}
                          >
                            {formatTime(msg.createdAt)}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="px-4 py-3 border-t border-border flex gap-2">
                <textarea
                  suppressHydrationWarning
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendMessage()
                    }
                  }}
                  placeholder={newConvoTarget ? `Message ${newConvoTarget.displayName}…` : 'Type a message…'}
                  rows={1}
                  className="flex-1 resize-none rounded-lg bg-background border border-border px-3 py-2 text-base sm:text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  suppressHydrationWarning
                  onClick={sendMessage}
                  disabled={sending || !content.trim() || !otherUserId}
                  className="shrink-0 inline-flex items-center justify-center size-11 sm:size-9 rounded-lg bg-primary hover:bg-primary/90 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
