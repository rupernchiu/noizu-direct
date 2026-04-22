'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { safeExternalHref, safeInternalHref } from '@/lib/safe-url'

interface Announcement {
  id: string
  text: string
  color: string
  link: string | null
}

interface Props {
  announcements: Announcement[]
}

export function AnnouncementBarClient({ announcements }: Props) {
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (announcements.length <= 1) return
    const interval = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setIndex((i) => (i + 1) % announcements.length)
        setVisible(true)
      }, 300)
    }, 5000)
    return () => clearInterval(interval)
  }, [announcements.length])

  const announcement = announcements[index]
  if (!announcement) return null

  // H17 — CMS-controlled link; accept http(s) absolute or same-origin path.
  // Anything else (`javascript:`, `data:`, protocol-relative) → render as
  // plain text, no link.
  const safeLink = announcement.link
    ? (safeInternalHref(announcement.link) ?? safeExternalHref(announcement.link))
    : null

  const content = (
    <div
      className="w-full py-2 px-4 text-center text-sm font-medium text-white"
      style={{
        backgroundColor: announcement.color,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.3s ease-in-out',
      }}
    >
      {announcement.text}
      {safeLink && (
        <span className="ml-2 underline underline-offset-2 opacity-90">
          Learn more →
        </span>
      )}
    </div>
  )

  if (safeLink) {
    return (
      <Link href={safeLink} className="block w-full hover:opacity-90 transition-opacity">
        {content}
      </Link>
    )
  }

  return content
}
