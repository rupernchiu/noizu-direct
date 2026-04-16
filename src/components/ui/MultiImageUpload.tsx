'use client'

import { useState, useRef } from 'react'
import { X, Upload, GripVertical } from 'lucide-react'

interface MultiImageUploadProps {
  images: string[]
  onChange: (images: string[]) => void
  maxImages?: number
  disabled?: boolean
}

export function MultiImageUpload({ images, onChange, maxImages = 6, disabled = false }: MultiImageUploadProps) {
  const [progress, setProgress] = useState<Record<string, number>>({})
  const [error, setError] = useState<string | null>(null)
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const uploadingCount = Object.keys(progress).length
  const canAddMore = images.length + uploadingCount < maxImages

  async function uploadFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const key = `${file.name}-${Date.now()}-${Math.random()}`
      setProgress(p => ({ ...p, [key]: 0 }))

      const xhr = new XMLHttpRequest()
      const fd = new FormData()
      fd.append('file', file)
      fd.append('subdir', 'products')

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          setProgress(p => ({ ...p, [key]: Math.round((e.loaded / e.total) * 100) }))
        }
      })

      xhr.addEventListener('load', () => {
        setProgress(p => { const n = { ...p }; delete n[key]; return n })
        if (xhr.status === 200) {
          try {
            const data = JSON.parse(xhr.responseText) as { url: string }
            resolve(data.url)
          } catch {
            reject(new Error('Invalid response'))
          }
        } else {
          reject(new Error(`Upload failed (${xhr.status})`))
        }
      })

      xhr.addEventListener('error', () => {
        setProgress(p => { const n = { ...p }; delete n[key]; return n })
        reject(new Error('Upload failed'))
      })

      xhr.open('POST', '/api/upload')
      xhr.send(fd)
    })
  }

  async function handleFiles(files: File[]) {
    const canAdd = maxImages - images.length - uploadingCount
    if (canAdd <= 0) return
    const toUpload = files.slice(0, canAdd)
    setError(null)
    try {
      const urls = await Promise.all(toUpload.map(uploadFile))
      onChange([...images, ...urls])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length > 0) void handleFiles(files)
    e.target.value = ''
  }

  function removeImage(idx: number) {
    onChange(images.filter((_, i) => i !== idx))
  }

  // Drag-to-reorder
  function onDragStart(e: React.DragEvent, idx: number) {
    setDraggingIdx(idx)
    e.dataTransfer.effectAllowed = 'move'
  }

  function onDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIdx(idx)
  }

  function onDrop(e: React.DragEvent, idx: number) {
    e.preventDefault()
    if (draggingIdx === null || draggingIdx === idx) return
    const next = [...images]
    const [removed] = next.splice(draggingIdx, 1)
    next.splice(idx, 0, removed)
    onChange(next)
    setDraggingIdx(null)
    setDragOverIdx(null)
  }

  function onDragEnd() {
    setDraggingIdx(null)
    setDragOverIdx(null)
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-3">
        {/* Existing images */}
        {images.map((url, idx) => (
          <div
            key={`${url}-${idx}`}
            draggable={!disabled}
            onDragStart={(e) => onDragStart(e, idx)}
            onDragOver={(e) => onDragOver(e, idx)}
            onDrop={(e) => onDrop(e, idx)}
            onDragEnd={onDragEnd}
            className={[
              'relative w-20 h-20 rounded-lg overflow-hidden border-2 transition-all',
              disabled ? 'cursor-default' : 'cursor-grab active:cursor-grabbing',
              draggingIdx === idx ? 'opacity-40 scale-95' : '',
              dragOverIdx === idx && draggingIdx !== idx
                ? 'border-primary scale-105 shadow-lg shadow-primary/20'
                : 'border-border',
            ].join(' ')}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`Image ${idx + 1}`} className="w-full h-full object-cover" draggable={false} />

            {/* Cover badge */}
            {idx === 0 && (
              <div className="absolute bottom-0 inset-x-0 bg-primary/80 backdrop-blur-sm text-white text-[9px] font-bold text-center py-0.5 tracking-wide">
                COVER
              </div>
            )}

            {/* Drag grip */}
            {!disabled && (
              <div className="absolute top-0.5 left-0.5 text-white/70 pointer-events-none">
                <GripVertical className="size-3.5" />
              </div>
            )}

            {/* Delete */}
            {!disabled && (
              <button
                suppressHydrationWarning
                type="button"
                onClick={() => removeImage(idx)}
                className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-red-500 transition-colors"
                aria-label="Remove image"
              >
                <X className="size-3" />
              </button>
            )}
          </div>
        ))}

        {/* Uploading placeholders */}
        {Object.entries(progress).map(([key, pct]) => (
          <div
            key={key}
            className="relative w-20 h-20 rounded-lg border-2 border-border bg-card flex flex-col items-center justify-center gap-1"
          >
            <span className="text-xs font-bold text-primary">{pct}%</span>
            <div className="w-12 h-1 rounded-full bg-border overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-150"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        ))}

        {/* Add button */}
        {canAddMore && !disabled && (
          <label className="w-20 h-20 rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors group">
            <Upload className="size-5 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="text-[10px] text-muted-foreground group-hover:text-primary transition-colors font-medium">
              Add
            </span>
            <input
              suppressHydrationWarning
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleInputChange}
              disabled={disabled}
              className="hidden"
            />
          </label>
        )}
      </div>

      {error && (
        <p className="mb-2 text-xs text-red-400">{error}</p>
      )}

      <p className="text-xs text-muted-foreground">
        {images.length}/{maxImages} images
        {images.length > 0 && ' · Drag to reorder · First image is the cover'}
      </p>
    </div>
  )
}
