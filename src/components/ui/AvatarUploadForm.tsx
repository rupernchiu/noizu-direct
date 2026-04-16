'use client'
import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'

export function AvatarUploadForm() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const file = inputRef.current?.files?.[0]
    if (!file) return
    setLoading(true)
    setMessage(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/account/profile', {
        method: 'POST',
        body: formData,
      })
      if (res.ok) {
        setMessage('Avatar updated. Refresh to see changes.')
      } else {
        const data = await res.json()
        setMessage(data.error ?? 'Failed to upload avatar.')
      }
    } catch {
      setMessage('An error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-3">
      <input
        suppressHydrationWarning
        ref={inputRef}
        type="file"
        accept="image/*"
        className="text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-border file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-foreground hover:file:bg-card"
      />
      <Button type="submit" disabled={loading} size="sm" className="bg-primary hover:bg-primary/90 text-white">
        {loading ? 'Uploading…' : 'Upload'}
      </Button>
      {message && <span className="text-xs text-secondary">{message}</span>}
    </form>
  )
}
