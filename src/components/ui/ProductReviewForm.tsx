'use client'

import { useState } from 'react'
import Link from 'next/link'

interface ProductReviewFormProps {
  productId: string
  userRole: string | null
  alreadyReviewed: boolean
}

export function ProductReviewForm({ productId, userRole, alreadyReviewed }: ProductReviewFormProps) {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!userRole) {
    return (
      <div className="mt-6 rounded-xl border border-border bg-card p-5 text-center">
        <p className="text-sm text-muted-foreground mb-3">Sign in to leave a review</p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
        >
          Sign In
        </Link>
      </div>
    )
  }

  if (userRole === 'ADMIN') {
    return null
  }

  if (alreadyReviewed) {
    return (
      <div className="mt-6 rounded-xl border border-border bg-card p-5 text-center">
        <p className="text-sm text-success font-medium">You have already reviewed this product — thank you!</p>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="mt-6 rounded-xl border border-border bg-card p-5 text-center">
        <p className="text-sm font-medium text-success">Thank you! Your review has been submitted and is pending creator approval.</p>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (rating === 0) { setError('Please select a rating'); return }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, rating, title: title || undefined, body: body || undefined }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to submit review')
      } else {
        setSubmitted(true)
      }
    } catch {
      setError('Failed to submit review')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mt-6">
      <h3 className="text-base font-semibold text-foreground mb-4">Write a Review</h3>
      <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Rating</label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="text-2xl transition-colors"
                aria-label={`${star} star`}
              >
                <span className={(hoverRating || rating) >= star ? 'text-yellow-400' : 'text-border'}>★</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Title <span className="text-muted-foreground font-normal">(optional)</span></label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={100}
            aria-invalid={!!error || undefined}
            aria-describedby={error ? 'product-review-error' : undefined}
            className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            placeholder="Summarize your experience"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Review <span className="text-muted-foreground font-normal">(optional)</span></label>
          <textarea
            rows={4}
            value={body}
            onChange={e => setBody(e.target.value)}
            maxLength={1000}
            aria-invalid={!!error || undefined}
            aria-describedby={error ? 'product-review-error' : undefined}
            className="w-full resize-none rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            placeholder="Tell others about your experience with this product"
          />
        </div>
        {error && <p id="product-review-error" role="alert" className="text-sm text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {submitting ? 'Submitting…' : 'Submit Review'}
        </button>
      </form>
    </div>
  )
}
