'use client'

import { useState } from 'react'

interface ReviewFormProps {
  orderId: string
  productId: string
  productTitle: string
  onSuccess?: () => void
}

export function ReviewForm({ orderId, productId, productTitle, onSuccess }: ReviewFormProps) {
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (submitted) {
    return (
      <div className="py-8 text-center">
        <p className="text-green-500 font-medium text-sm">Review submitted! Thank you.</p>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (rating === 0 || submitting) return

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          rating,
          title: title || undefined,
          body: body || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Something went wrong. Please try again.')
        return
      }

      setSubmitted(true)
      onSuccess?.()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const displayRating = hovered || rating

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Star selector */}
      <div>
        <p className="text-sm font-medium text-foreground mb-2">Rating <span className="text-destructive">*</span></p>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className={`text-2xl leading-none transition-colors ${
                star <= displayRating ? 'text-yellow-400' : 'text-muted-foreground'
              }`}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => setRating(star)}
              aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
            >
              {star <= displayRating ? '★' : '☆'}
            </button>
          ))}
        </div>
      </div>

      {/* Title input */}
      <div>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, 100))}
          placeholder="Summary (optional)"
          maxLength={100}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? 'review-error' : undefined}
          className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {/* Body textarea */}
      <div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, 500))}
          placeholder="Share your experience (optional)"
          maxLength={500}
          rows={4}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? 'review-error' : undefined}
          className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
        />
        <p className="text-xs text-muted-foreground mt-1 text-right">{body.length}/500</p>
      </div>

      {/* Error */}
      {error && (
        <p id="review-error" role="alert" className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={rating === 0 || submitting}
        className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? 'Submitting…' : 'Submit Review'}
      </button>
    </form>
  )
}
