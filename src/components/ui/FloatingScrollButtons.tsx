'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'

export function FloatingScrollButtons() {
  const [atTop, setAtTop]       = useState(true)
  const [atBottom, setAtBottom] = useState(false)

  const check = useCallback(() => {
    const scrollY  = window.scrollY
    const maxScroll = document.body.scrollHeight - window.innerHeight
    setAtTop(scrollY <= 10)
    setAtBottom(maxScroll <= 0 || scrollY >= maxScroll - 10)
  }, [])

  useEffect(() => {
    check()
    window.addEventListener('scroll', check, { passive: true })
    window.addEventListener('resize', check, { passive: true })
    return () => {
      window.removeEventListener('scroll', check)
      window.removeEventListener('resize', check)
    }
  }, [check])

  const scrollUp   = () => window.scrollTo({ top: 0, behavior: 'smooth' })
  const scrollDown = () => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })

  const btnStyle = {
    border:    '1.5px solid #7c3aed',
    boxShadow: '0 2px 12px rgba(124, 58, 237, 0.25)',
  }

  const base =
    'group flex items-center justify-center size-10 rounded-full cursor-pointer ' +
    'bg-white dark:bg-card ' +
    'hover:bg-[#7c3aed] hover:scale-110 ' +
    'transition-all duration-200'

  return (
    <div
      className="fixed z-50 flex flex-row gap-2"
      style={{ bottom: 24, left: '50%', transform: 'translateX(-50%)' }}
      aria-label="Page scroll controls"
    >
      <button
        suppressHydrationWarning
        onClick={scrollUp}
        className={base}
        aria-label="Scroll to top"
        style={{
          ...btnStyle,
          opacity:       atTop ? 0 : 1,
          pointerEvents: atTop ? 'none' : 'auto',
          transform:     atTop ? 'translateY(4px)' : 'translateY(0)',
          transition:    'opacity 0.2s ease, transform 0.2s ease, background-color 0.2s ease, scale 0.2s ease',
        }}
      >
        <ChevronUp className="size-4 text-[#7c3aed] group-hover:text-white transition-colors duration-200" />
      </button>

      <button
        suppressHydrationWarning
        onClick={scrollDown}
        className={base}
        aria-label="Scroll to bottom"
        style={{
          ...btnStyle,
          opacity:       atBottom ? 0 : 1,
          pointerEvents: atBottom ? 'none' : 'auto',
          transform:     atBottom ? 'translateY(-4px)' : 'translateY(0)',
          transition:    'opacity 0.2s ease, transform 0.2s ease, background-color 0.2s ease, scale 0.2s ease',
        }}
      >
        <ChevronDown className="size-4 text-[#7c3aed] group-hover:text-white transition-colors duration-200" />
      </button>
    </div>
  )
}
