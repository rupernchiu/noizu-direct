'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { safeExternalHref, safeInternalHref } from '@/lib/safe-url'

interface Announcement {
  id: string
  text: string
  color: string
  link: string | null
}

interface Props {
  announcements: Announcement[]
  initialIndex: number
}

export function AnnouncementBarClient({ announcements, initialIndex }: Props) {
  const pathname = usePathname()
  const [index, setIndex] = useState(initialIndex)
  const firstRender = useRef(true)

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    if (announcements.length <= 1) return
    setIndex(prev => (prev + 1) % announcements.length)
  }, [pathname, announcements.length])

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
      style={{ backgroundColor: announcement.color }}
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
