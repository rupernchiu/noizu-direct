'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

interface ImageGalleryProps {
  images: string[]
  title: string
}

export function ImageGallery({ images, title }: ImageGalleryProps) {
  const hasImages = images.length > 0
  const displayImages = hasImages ? images : []

  // Main image state
  const [activeIdx, setActiveIdx] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lbZoom, setLbZoom] = useState(1)
  const [lbPanX, setLbPanX] = useState(0)
  const [lbPanY, setLbPanY] = useState(0)
  const [lbDragging, setLbDragging] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)
  const lbDragStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)
  const didDragRef = useRef(false)
  const lbDidDragRef = useRef(false)
  const lastTapRef = useRef(0)
  const pinchDistRef = useRef<number | null>(null)

  // ── Helpers ────────────────────────────────────────────────────────────────

  function resetZoom() {
    setZoom(1); setPanX(0); setPanY(0)
  }

  function selectImage(idx: number) {
    setActiveIdx(idx); resetZoom()
  }

  function prevImage(e?: React.MouseEvent) {
    e?.stopPropagation()
    selectImage((activeIdx - 1 + displayImages.length) % displayImages.length)
  }

  function nextImage(e?: React.MouseEvent) {
    e?.stopPropagation()
    selectImage((activeIdx + 1) % displayImages.length)
  }

  function lbPrev(e?: React.MouseEvent) {
    e?.stopPropagation()
    setActiveIdx(i => (i - 1 + displayImages.length) % displayImages.length)
    setLbZoom(1); setLbPanX(0); setLbPanY(0)
  }

  function lbNext(e?: React.MouseEvent) {
    e?.stopPropagation()
    setActiveIdx(i => (i + 1) % displayImages.length)
    setLbZoom(1); setLbPanX(0); setLbPanY(0)
  }

  // ── Non-passive wheel on main image ───────────────────────────────────────

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      setZoom(z => {
        const next = Math.min(4, Math.max(1, z + (e.deltaY > 0 ? -0.35 : 0.35)))
        if (next <= 1) { setPanX(0); setPanY(0) }
        return next
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // ── Non-passive wheel on lightbox ─────────────────────────────────────────

  useEffect(() => {
    if (!lightboxOpen) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      setLbZoom(z => {
        const next = Math.min(4, Math.max(1, z + (e.deltaY > 0 ? -0.35 : 0.35)))
        if (next <= 1) { setLbPanX(0); setLbPanY(0) }
        return next
      })
    }
    document.addEventListener('wheel', onWheel, { passive: false })
    return () => document.removeEventListener('wheel', onWheel)
  }, [lightboxOpen])

  // ── Keyboard nav + body scroll lock ───────────────────────────────────────

  useEffect(() => {
    if (!lightboxOpen) return
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false)
      if (e.key === 'ArrowLeft') lbPrev()
      if (e.key === 'ArrowRight') lbNext()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxOpen, displayImages.length])

  // ── Main image mouse events ────────────────────────────────────────────────

  function handleMouseDown(e: React.MouseEvent) {
    if (zoom <= 1) return
    e.preventDefault()
    setIsDragging(true)
    didDragRef.current = false
    dragStartRef.current = { x: e.clientX, y: e.clientY, panX, panY }
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!isDragging || !dragStartRef.current) return
    const dx = e.clientX - dragStartRef.current.x
    const dy = e.clientY - dragStartRef.current.y
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didDragRef.current = true
    setPanX(dragStartRef.current.panX + dx)
    setPanY(dragStartRef.current.panY + dy)
  }

  function handleMouseUp() {
    setIsDragging(false)
    dragStartRef.current = null
  }

  function handleClick() {
    if (didDragRef.current) { didDragRef.current = false; return }
    if (zoom <= 1) setLightboxOpen(true)
  }

  // ── Main image touch events ────────────────────────────────────────────────

  function getPinchDist(touches: React.TouchList) {
    const dx = touches[0].clientX - touches[1].clientX
    const dy = touches[0].clientY - touches[1].clientY
    return Math.hypot(dx, dy)
  }

  function handleTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      pinchDistRef.current = getPinchDist(e.touches)
    } else {
      const now = Date.now()
      if (now - lastTapRef.current < 300) {
        if (zoom > 1) resetZoom()
        else setZoom(2)
        lastTapRef.current = 0
      } else {
        lastTapRef.current = now
        if (zoom > 1) {
          dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, panX, panY }
        }
      }
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2 && pinchDistRef.current !== null) {
      e.preventDefault()
      const dist = getPinchDist(e.touches)
      const ratio = dist / pinchDistRef.current
      setZoom(z => Math.min(4, Math.max(1, z * ratio)))
      pinchDistRef.current = dist
    } else if (e.touches.length === 1 && dragStartRef.current && zoom > 1) {
      setPanX(dragStartRef.current.panX + (e.touches[0].clientX - dragStartRef.current.x))
      setPanY(dragStartRef.current.panY + (e.touches[0].clientY - dragStartRef.current.y))
    }
  }

  function handleTouchEnd() {
    pinchDistRef.current = null
  }

  // ── Lightbox mouse events ──────────────────────────────────────────────────

  function handleLbMouseDown(e: React.MouseEvent) {
    if (lbZoom <= 1) return
    e.preventDefault()
    e.stopPropagation()
    setLbDragging(true)
    lbDidDragRef.current = false
    lbDragStartRef.current = { x: e.clientX, y: e.clientY, panX: lbPanX, panY: lbPanY }
  }

  function handleLbMouseMove(e: React.MouseEvent) {
    if (!lbDragging || !lbDragStartRef.current) return
    const dx = e.clientX - lbDragStartRef.current.x
    const dy = e.clientY - lbDragStartRef.current.y
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) lbDidDragRef.current = true
    setLbPanX(lbDragStartRef.current.panX + dx)
    setLbPanY(lbDragStartRef.current.panY + dy)
  }

  function handleLbMouseUp() {
    setLbDragging(false)
    lbDragStartRef.current = null
  }

  const currentImg = displayImages[activeIdx]

  return (
    <div className="flex gap-3">
      {/* ── Thumbnail strip ─────────────────────────────────────────────────── */}
      {displayImages.length > 1 && (
        <div className="flex flex-col gap-2 w-20 shrink-0">
          {displayImages.slice(0, 6).map((img, idx) => (
            <button
              suppressHydrationWarning
              key={idx}
              onClick={() => selectImage(idx)}
              className={[
                'w-20 h-20 rounded-lg overflow-hidden border-2 shrink-0 transition-all',
                idx === activeIdx
                  ? 'border-primary ring-1 ring-primary/30'
                  : 'border-border hover:border-primary/50',
              ].join(' ')}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt={`${title} view ${idx + 1}`} className="w-full h-full object-cover" draggable={false} />
            </button>
          ))}
        </div>
      )}

      {/* ── Main image ──────────────────────────────────────────────────────── */}
      <div className="flex-1">
        <div
          ref={containerRef}
          className="relative aspect-square rounded-xl overflow-hidden bg-card select-none"
          style={{ cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={handleClick}
        >
          {hasImages ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentImg}
              alt={title}
              className="w-full h-full object-cover"
              style={{
                transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
                transformOrigin: 'center center',
                transition: isDragging ? 'none' : 'transform 0.12s ease',
              }}
              draggable={false}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/30 to-secondary/30">
              <span className="text-6xl opacity-30">🎨</span>
            </div>
          )}

          {/* Zoom level indicator */}
          {zoom > 1.05 && (
            <div className="absolute bottom-3 right-3 rounded-full bg-background/80 backdrop-blur-sm px-2.5 py-1 text-xs font-bold text-foreground pointer-events-none">
              {zoom.toFixed(1)}×
            </div>
          )}

          {/* Image counter */}
          {displayImages.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-background/80 backdrop-blur-sm px-2.5 py-1 text-xs font-medium text-foreground pointer-events-none">
              {activeIdx + 1} / {displayImages.length}
            </div>
          )}

          {/* Arrows */}
          {displayImages.length > 1 && (
            <>
              <button
                suppressHydrationWarning
                onClick={prevImage}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center text-foreground hover:bg-background shadow-sm transition-colors"
                aria-label="Previous image"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                suppressHydrationWarning
                onClick={nextImage}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center text-foreground hover:bg-background shadow-sm transition-colors"
                aria-label="Next image"
              >
                <ChevronRight className="size-5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Lightbox ────────────────────────────────────────────────────────── */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.92)' }}
          onClick={() => setLightboxOpen(false)}
        >
          {/* Close */}
          <button
            suppressHydrationWarning
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            aria-label="Close lightbox"
          >
            <X className="size-5" />
          </button>

          {/* Counter */}
          {displayImages.length > 1 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-white z-10 pointer-events-none">
              {activeIdx + 1} / {displayImages.length}
            </div>
          )}

          {/* Image */}
          <div
            className="relative w-full h-full flex items-center justify-center select-none overflow-hidden"
            style={{ cursor: lbZoom > 1 ? (lbDragging ? 'grabbing' : 'grab') : 'default' }}
            onClick={e => e.stopPropagation()}
            onMouseDown={handleLbMouseDown}
            onMouseMove={handleLbMouseMove}
            onMouseUp={handleLbMouseUp}
            onMouseLeave={handleLbMouseUp}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentImg}
              alt={title}
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
              style={{
                transform: `translate(${lbPanX}px, ${lbPanY}px) scale(${lbZoom})`,
                transformOrigin: 'center center',
                transition: lbDragging ? 'none' : 'transform 0.12s ease',
              }}
              draggable={false}
            />

            {/* Lightbox zoom indicator */}
            {lbZoom > 1.05 && (
              <div className="absolute bottom-6 right-6 rounded-full bg-white/10 px-3 py-1.5 text-sm font-bold text-white pointer-events-none">
                {lbZoom.toFixed(1)}×
              </div>
            )}
          </div>

          {/* Lightbox arrows */}
          {displayImages.length > 1 && (
            <>
              <button
                suppressHydrationWarning
                onClick={lbPrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
                aria-label="Previous image"
              >
                <ChevronLeft className="size-7" />
              </button>
              <button
                suppressHydrationWarning
                onClick={lbNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
                aria-label="Next image"
              >
                <ChevronRight className="size-7" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
