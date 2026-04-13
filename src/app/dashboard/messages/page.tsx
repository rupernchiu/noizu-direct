'use client'
import { useState, useEffect, useRef, useCallback } from 'react'

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
  const [selectedConvoId, setSelectedConvoId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [otherUserId, setOtherUserId] = useState<string | null>(null)
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [mobileShowThread, setMobileShowThread] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

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
        <h1 className="text-2xl font-bold text-[#f0f0f5]">Messages</h1>
        <p className="text-sm text-[#8888aa] mt-1">Chat with your fans</p>
      </div>

      <div className="bg-[#16161f] rounded-xl border border-[#2a2a3a] overflow-hidden h-[600px] flex">
        {/* Conversations list */}
        <div
          className={`w-full md:w-72 md:block shrink-0 border-r border-[#2a2a3a] flex flex-col ${
            mobileShowThread ? 'hidden' : 'flex'
          }`}
        >
          <div className="px-4 py-3 border-b border-[#2a2a3a]">
            <p className="text-xs font-semibold text-[#8888aa] uppercase tracking-wide">
              Conversations
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <p className="text-sm text-[#8888aa]">No conversations yet.</p>
                <p className="text-xs text-[#8888aa] mt-1">
                  Messages from buyers will appear here.
                </p>
              </div>
            ) : (
              conversations.map((convo) => {
                const displayName = convo.buyer.name
                const isSelected = selectedConvoId === convo.id
                return (
                  <button
                    key={convo.id}
                    onClick={() => selectConvo(convo.id)}
                    className={`w-full px-4 py-3 flex items-start gap-3 text-left hover:bg-[#1e1e2a] transition-colors ${
                      isSelected ? 'bg-[#1e1e2a]' : ''
                    }`}
                  >
                    <div className="shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-[#7c3aed]/40 to-[#00d4aa]/40 flex items-center justify-center text-xs font-bold text-white">
                      {displayName[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-sm font-medium text-[#f0f0f5] truncate">
                          {displayName}
                        </span>
                        {convo.lastMessage && (
                          <span className="text-xs text-[#8888aa] shrink-0">
                            {formatTime(convo.lastMessage.createdAt)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-1 mt-0.5">
                        <p className="text-xs text-[#8888aa] truncate">
                          {convo.lastMessage?.content ?? 'No messages yet'}
                        </p>
                        {convo.unreadCount > 0 && (
                          <span className="shrink-0 inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#7c3aed] text-white text-xs font-bold">
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
              <p className="text-sm text-[#8888aa]">Select a conversation</p>
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-[#2a2a3a] flex items-center gap-3">
                <button
                  className="md:hidden text-[#8888aa] hover:text-[#f0f0f5] mr-1"
                  onClick={() => setMobileShowThread(false)}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <p className="text-sm font-semibold text-[#f0f0f5]">
                  {selectedConvo.buyer.name}
                </p>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {messages.length === 0 ? (
                  <div className="text-center text-sm text-[#8888aa] mt-8">
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
                              ? 'bg-[#7c3aed] text-white rounded-br-sm'
                              : 'bg-[#2a2a3a] text-[#f0f0f5] rounded-bl-sm'
                          }`}
                        >
                          <p>{msg.content}</p>
                          <p className={`text-xs mt-1 ${isMine ? 'text-white/60' : 'text-[#8888aa]'}`}>
                            {formatTime(msg.createdAt)}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="px-4 py-3 border-t border-[#2a2a3a] flex gap-2">
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
                  className="flex-1 resize-none rounded-lg bg-[#0d0d12] border border-[#2a2a3a] px-3 py-2 text-sm text-[#f0f0f5] placeholder-[#8888aa] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]"
                />
                <button
                  onClick={sendMessage}
                  disabled={sending || !content.trim()}
                  className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-lg bg-[#7c3aed] hover:bg-[#6d28d9] text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
