'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'

export function MobileNavDrawer({
  title,
  children,
  className = '',
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Close when the route changes
  useEffect(() => { setOpen(false) }, [pathname])

  // Escape to close + lock background scroll while open
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Open ${title}`}
        className={`md:hidden inline-flex items-center justify-center size-10 rounded-lg border border-border text-foreground hover:bg-card transition-colors ${className}`}
      >
        <Menu className="size-5" />
      </button>

      {open && (
        <div
          className="md:hidden fixed inset-0 z-[60]"
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div className="absolute inset-y-0 left-0 w-[280px] max-w-[85vw] bg-background border-r border-border shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
              <p className="text-sm font-semibold text-foreground">{title}</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="size-9 inline-flex items-center justify-center rounded-lg hover:bg-card text-muted-foreground hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-3 flex flex-col gap-1">
              {children}
            </nav>
          </div>
        </div>
      )}
    </>
  )
}
