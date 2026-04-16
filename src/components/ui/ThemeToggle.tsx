'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'

interface ThemeToggleProps {
  mobile?: boolean
}

export function ThemeToggle({ mobile = false }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Don't render until mounted — avoids reading undefined theme on first render
  if (!mounted) return null

  const isDark = theme === 'dark'

  if (mobile) {
    return (
      <button
        suppressHydrationWarning
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground py-2 transition-colors"
      >
        {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        {isDark ? 'Light mode' : 'Dark mode'}
      </button>
    )
  }

  return (
    <button
      suppressHydrationWarning
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-border/60 transition-colors"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  )
}
