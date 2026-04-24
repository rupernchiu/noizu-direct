'use client'

// Thumbnail that fetches a private bucket file via the audited /api/files
// route once a reveal gate has been unlocked. Designed for review surfaces
// (dispute evidence, KYC docs) where the admin picks a reason ONCE for the
// whole page, then all images auto-load.
//
// Props:
//  - viewerUrl: the /api/files/... URL
//  - reveal: null while locked; { code, note } after the reason modal approves
//  - label: alt text + lightbox header
//  - mimeType: optional — if not an image, renders a generic file card
//
// On click, opens the image in a fullscreen lightbox. The blob URL is
// revoked when the component unmounts to avoid memory leaks.

import { useEffect, useRef, useState } from 'react'
import { fetchPrivateBlobUrl } from '@/lib/private-file-fetch'
import type { AccessReasonCode } from '@/lib/private-file-audit-types'

export interface RevealState {
  code: AccessReasonCode
  note: string
}

interface Props {
  viewerUrl: string
  reveal: RevealState | null
  label: string
  mimeType?: string | null
  /** Smaller thumbnail variant for dense lists (dispute evidence rows). */
  dense?: boolean
}

export function AuthedThumbnail({ viewerUrl, reveal, label, mimeType, dense = false }: Props) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const blobRef = useRef<string | null>(null)

  useEffect(() => {
    return () => {
      if (blobRef.current) {
        URL.revokeObjectURL(blobRef.current)
        blobRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!reveal) return
    if (blobRef.current) return
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchPrivateBlobUrl(viewerUrl, reveal.code, reveal.note)
      .then((url) => {
        if (cancelled) {
          URL.revokeObjectURL(url)
          return
        }
        blobRef.current = url
        setBlobUrl(url)
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message || 'Could not fetch file')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [reveal, viewerUrl])

  const isImage = !mimeType || mimeType.startsWith('image/')
  const containerClasses = dense
    ? 'w-24 h-24 rounded-md'
    : 'w-full aspect-video rounded-lg'

  if (!reveal) {
    return (
      <div
        className={`${containerClasses} bg-background/40 border border-border flex items-center justify-center text-[11px] text-muted-foreground`}
      >
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true">🔒</span>Locked
        </span>
      </div>
    )
  }

  if (loading || (!blobUrl && !error)) {
    return (
      <div
        className={`${containerClasses} bg-background/40 border border-border animate-pulse flex items-center justify-center text-[11px] text-muted-foreground`}
      >
        Loading…
      </div>
    )
  }

  if (error) {
    return (
      <div
        className={`${containerClasses} bg-red-500/10 border border-red-500/30 flex items-center justify-center text-[11px] text-red-400 p-2 text-center`}
      >
        {error}
      </div>
    )
  }

  if (!isImage) {
    return (
      <a
        href={blobUrl!}
        target="_blank"
        rel="noopener noreferrer"
        referrerPolicy="no-referrer"
        className={`${containerClasses} bg-background/60 border border-border flex flex-col items-center justify-center gap-1 text-xs text-foreground hover:border-primary/50 transition-colors`}
      >
        <span aria-hidden="true" className="text-2xl">📄</span>
        <span className="font-medium">{mimeType ?? 'file'}</span>
        <span className="text-[11px] text-muted-foreground">Open ↗</span>
      </a>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setLightboxOpen(true)}
        className={`${containerClasses} bg-background border border-border overflow-hidden hover:border-primary/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40`}
        title={`${label} — click to enlarge`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={blobUrl!}
          alt={label}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
        />
      </button>
      {lightboxOpen && blobUrl && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setLightboxOpen(false)}
        >
          <div
            className="w-full max-w-5xl flex items-center justify-between py-3 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-semibold">{label}</p>
            <div className="flex items-center gap-3">
              <a
                href={blobUrl}
                target="_blank"
                rel="noopener noreferrer"
                referrerPolicy="no-referrer"
                className="text-xs text-white/80 hover:text-white underline"
              >
                Open in new tab
              </a>
              <button
                type="button"
                onClick={() => setLightboxOpen(false)}
                className="text-white/80 hover:text-white text-lg"
                aria-label="Close"
              >
                ×
              </button>
            </div>
          </div>
          <div
            className="flex-1 w-full max-w-5xl overflow-auto flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={blobUrl}
              alt={label}
              referrerPolicy="no-referrer"
              className="max-w-full max-h-full rounded-lg border border-white/10"
            />
          </div>
        </div>
      )}
    </>
  )
}
