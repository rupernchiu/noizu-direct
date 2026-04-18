'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Share2, X, Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  productTitle: string
  creatorName: string
  firstImage: string | null
  className?: string
}

// ── Platform SVG icons ────────────────────────────────────────────────────────

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="currentColor" aria-hidden>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function ThreadsIcon() {
  return (
    <svg viewBox="0 0 192 192" className="size-5 shrink-0" fill="currentColor" aria-hidden>
      <path d="M141.537 88.988a66 66 0 0 0-2.518-1.143c-1.482-27.307-16.403-42.94-41.457-43.1h-.34c-14.986 0-27.449 6.396-35.12 18.036l13.779 9.452c5.73-8.695 14.724-10.548 21.348-10.548h.232c8.246.053 14.47 2.446 18.502 7.105 2.931 3.39 4.893 8.048 5.872 13.908a120.1 120.1 0 0 0-12.71-.671c-20.314 0-33.374 10.987-32.453 28.88.466 9.04 5.14 16.848 12.956 21.522a44.27 44.27 0 0 0 24.58 7.08c16.948-.157 28.614-9.386 32.588-25.89 2.14-8.9 2.25-18.24.274-26.63zm-15.78 31.093c-2.93 6.956-9.046 11.21-18.36 11.65-6.89.313-13.7-1.61-17.934-5.215-3.278-2.777-4.88-6.346-4.713-10.318.312-7.63 7.317-11.97 18.982-11.97 2.72 0 5.41.163 8.05.484-1.38 8.022-5.5 13.87-13.5 15.9l3.15 7.15c11.23-2.91 19.03-11.47 20.84-23.14l.003-.019a71.8 71.8 0 0 1 8.61 1.72c-.47 4.91-2.36 9.85-5.13 13.76z" />
    </svg>
  )
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="currentColor" aria-hidden>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0-2.21-1.791-4-4-4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  )
}

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="currentColor" aria-hidden>
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  )
}

// ── Platform config ───────────────────────────────────────────────────────────

interface Platform {
  name: string
  hoverBg: string
  hoverBorder: string
  icon: React.ReactNode
  open?: (url: string, caption: string) => string
  copyMsg?: string
}

const PLATFORMS: Platform[] = [
  {
    name: 'Facebook',
    hoverBg: 'hover:bg-[#1877F2] hover:text-white',
    hoverBorder: 'hover:border-[#1877F2]',
    icon: <FacebookIcon />,
    open: (url, caption) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(caption)}`,
  },
  {
    name: 'X',
    hoverBg: 'hover:bg-black hover:text-white',
    hoverBorder: 'hover:border-black',
    icon: <XIcon />,
    open: (url, caption) =>
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(caption)}`,
  },
  {
    name: 'Threads',
    hoverBg: 'hover:bg-black hover:text-white',
    hoverBorder: 'hover:border-black',
    icon: <ThreadsIcon />,
    open: (url, caption) =>
      `https://www.threads.net/intent/post?text=${encodeURIComponent(caption)}%20${encodeURIComponent(url)}`,
  },
  {
    name: 'Instagram',
    hoverBg: 'hover:bg-[#E1306C] hover:text-white',
    hoverBorder: 'hover:border-[#E1306C]',
    icon: <InstagramIcon />,
    copyMsg: 'Caption copied! Paste it on Instagram',
  },
  {
    name: 'TikTok',
    hoverBg: 'hover:bg-[#010101] hover:text-white',
    hoverBorder: 'hover:border-[#010101]',
    icon: <TikTokIcon />,
    copyMsg: 'Caption copied! Paste it on TikTok',
  },
]

// ── Component ─────────────────────────────────────────────────────────────────

export function ShareButton({ productTitle, creatorName, firstImage, className }: Props) {
  const [open, setOpen] = useState(false)
  const [clipboardMsg, setClipboardMsg] = useState<string | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  // Derive URL client-side (window.location) via state so SSR doesn't break
  const [currentUrl, setCurrentUrl] = useState('')
  useEffect(() => {
    if (open) setCurrentUrl(window.location.href)
  }, [open])

  // Escape key closes modal
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  // Reset inner state when modal closes
  useEffect(() => {
    if (!open) {
      setClipboardMsg(null)
      setLinkCopied(false)
    }
  }, [open])

  const copyToClipboard = useCallback(async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      return false
    }
  }, [])

  async function handlePlatform(platform: Platform) {
    const caption = `${productTitle} by ${creatorName} on noizu.direct 🛒 ${currentUrl}`
    if (platform.open) {
      window.open(platform.open(currentUrl, caption), '_blank', 'noopener,noreferrer')
    } else if (platform.copyMsg) {
      const clipboardText = `${productTitle} — ${currentUrl}`
      const ok = await copyToClipboard(clipboardText)
      if (ok) setClipboardMsg(platform.copyMsg)
    }
  }

  async function handleCopyLink() {
    const ok = await copyToClipboard(currentUrl)
    if (ok) {
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    }
  }

  return (
    <>
      {/* Share trigger button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'flex items-center justify-center gap-1.5 py-3 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all text-sm font-semibold',
          className
        )}
        aria-label="Share this product"
      >
        <Share2 size={16} />
        <span>Share</span>
      </button>

      {/* Modal */}
      {open && (
        <div
          ref={overlayRef}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === overlayRef.current) setOpen(false) }}
        >
          <div
            className="relative w-full max-w-sm rounded-2xl bg-surface border border-border shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
              <h2 className="text-base font-semibold text-foreground">Share this product</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center w-7 h-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-border/60 transition-colors"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* Product preview */}
              <div className="flex items-center gap-3">
                {firstImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={firstImage}
                    alt={productTitle}
                    className="w-12 h-12 rounded-lg object-cover border border-border flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/30 to-secondary/30 flex-shrink-0" />
                )}
                <p className="text-sm font-medium text-foreground line-clamp-2 leading-snug">
                  {productTitle}
                </p>
              </div>

              {/* Platform buttons */}
              <div className="grid grid-cols-3 gap-2">
                {PLATFORMS.map((platform) => (
                  <button
                    key={platform.name}
                    type="button"
                    onClick={() => handlePlatform(platform)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border border-border',
                      'bg-card text-muted-foreground text-xs font-medium',
                      'transition-colors',
                      platform.hoverBg,
                      platform.hoverBorder
                    )}
                  >
                    {platform.icon}
                    <span>{platform.name}</span>
                  </button>
                ))}
              </div>

              {/* Clipboard feedback */}
              {clipboardMsg && (
                <p className="text-xs text-center text-secondary font-medium py-1">
                  {clipboardMsg}
                </p>
              )}

              {/* Copy link row */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  readOnly
                  value={currentUrl}
                  className="flex-1 min-w-0 rounded-lg bg-background border border-border px-3 py-2 text-xs text-muted-foreground focus:outline-none truncate"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={cn(
                    'flex items-center gap-1.5 flex-shrink-0 px-3 py-2 rounded-lg border text-xs font-medium transition-colors',
                    linkCopied
                      ? 'border-success/50 bg-success/10 text-success'
                      : 'border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/40'
                  )}
                >
                  {linkCopied ? <Check size={13} /> : <Copy size={13} />}
                  {linkCopied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
