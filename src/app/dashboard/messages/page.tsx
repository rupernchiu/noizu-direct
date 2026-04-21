'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { MessageCircle } from 'lucide-react'

interface ConversationBuyer {
  id: string
  name: string
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
  buyer: ConversationBuyer
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

export default function CreatorMessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedConvoId, setSelectedConvoId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [otherUserId, setOtherUserId] = useState<string | null>(null)
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [mobileShowThread, setMobileShowThread] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const filteredConversations = searchQuery.trim()
    ? conversations.filter((c) =>
        c.buyer.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conversations

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/messages')
      if (res.ok) {
        const data = await res.json() as Conversation[]
        setConversations(data)
      }
    } catch {
      // ignore
    }
  }, [])

  const fetchMessages = useCallback(async (convoId: string) => {
    try {
      const res = await fetch(`/api/messages/${convoId}`)
      if (res.ok) {
        const data = await res.json() as { messages: Message[]; otherUserId: string }
        setMessages(data.messages)
        setOtherUserId(data.otherUserId)
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  useEffect(() => {
    const interval = setInterval(() => {
      fetchConversations()
      if (selectedConvoId) fetchMessages(selectedConvoId)
    }, 5000)
    return () => clearInterval(interval)
  }, [fetchConversations, fetchMessages, selectedConvoId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function selectConvo(convoId: string) {
    setSelectedConvoId(convoId)
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
        if (selectedConvoId) await fetchMessages(selectedConvoId)
        await fetchConversations()
      }
    } catch {
      // ignore
    } finally {
      setSending(false)
    }
  }

  const selectedConvo = conversations.find((c) => c.id === selectedConvoId)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Messages</h1>
        <p className="text-sm text-muted-foreground mt-1">Chat with your fans</p>
      </div>

      <div className="bg-surface rounded-xl border border-border overflow-hidden h-[calc(100dvh-10rem)] md:h-[600px] flex">
        {/* Conversations list */}
        <div
          className={`w-full md:w-72 md:block shrink-0 border-r border-border flex flex-col ${
            mobileShowThread ? 'hidden' : 'flex'
          }`}
        >
          <div className="px-3 py-3 border-b border-border space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Conversations
            </p>
            <input
              type="search"
              placeholder="Search by name…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg bg-background border border-border px-3 py-2 text-base sm:text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
                {!searchQuery && (
                  <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-card text-muted-foreground">
                    <MessageCircle className="size-6" />
                  </div>
                )}
                <p className="text-sm font-medium text-foreground">
                  {searchQuery ? 'No results found' : 'No messages yet'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {searchQuery ? 'Try a different name.' : 'Members will message you here about products, commissions, and orders.'}
                </p>
              </div>
            ) : (
              filteredConversations.map((convo) => {
                const displayName = convo.buyer.name
                const isSelected = selectedConvoId === convo.id
                return (
                  <button
                    key={convo.id}
                    onClick={() => selectConvo(convo.id)}
                    className={`w-full px-4 py-3 flex items-start gap-3 text-left hover:bg-card transition-colors ${
                      isSelected ? 'bg-card' : ''
                    }`}
                  >
                    <div className="shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-primary/40 to-secondary/40 flex items-center justify-center text-xs font-bold text-white">
                      {displayName[0]?.toUpperCase() ?? '?'}
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
          {!selectedConvo ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Select a conversation</p>
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-border flex items-center gap-3">
                <button
                  className="md:hidden flex items-center justify-center size-10 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
                  onClick={() => setMobileShowThread(false)}
                  aria-label="Back to conversations"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <p className="text-sm font-semibold text-foreground">
                  {selectedConvo.buyer.name}
                </p>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {messages.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground mt-8">
                    No messages yet.
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
                          <p className={`text-xs mt-1 ${isMine ? 'text-white/60' : 'text-muted-foreground'}`}>
                            {formatTime(msg.createdAt)}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="px-4 py-3 border-t border-border flex gap-2">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendMessage()
                    }
                  }}
                  placeholder="Type a message…"
                  rows={1}
                  className="flex-1 resize-none rounded-lg bg-background border border-border px-3 py-2 text-base sm:text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  onClick={sendMessage}
                  disabled={sending || !content.trim()}
                  className="shrink-0 inline-flex items-center justify-center size-11 sm:size-9 rounded-lg bg-primary hover:bg-primary/90 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
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
