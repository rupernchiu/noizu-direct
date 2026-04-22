'use client'

import { useState, useId, useTransition } from 'react'
import { toast } from 'sonner'
import { ArrowRight, Check } from 'lucide-react'
import type { NewsletterSource } from '@/lib/newsletter'

type Variant = 'compact' | 'stacked'

interface Props {
  source?: NewsletterSource
  variant?: Variant
  // Copy lives with the caller so each surface (footer, modal, dashboard)
  // sets its own voice without a sprawling enum here.
  label?: string
  placeholder?: string
  buttonLabel?: string
  className?: string
}

// Mirror the API's lightweight check so obvious typos never leave the form.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function NewsletterForm({
  source = 'footer',
  variant = 'compact',
  label,
  placeholder = 'you@example.com',
  buttonLabel = 'Subscribe',
  className = '',
}: Props) {
  const [email, setEmail] = useState('')
  const [botField, setBotField] = useState('') // honeypot
  const [done, setDone] = useState(false)
  const [isPending, startTransition] = useTransition()
  const inputId = useId()

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (done || isPending) return

    const trimmed = email.trim()
    if (!EMAIL_RE.test(trimmed)) {
      toast.error('Please enter a valid email address.')
      return
    }

    startTransition(async () => {
      try {
        const res = await fetch('/api/newsletter', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            email: trimmed,
            source,
            bot: botField || undefined,
            locale: typeof navigator !== 'undefined' ? navigator.language : undefined,
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          toast.error(data?.error ?? 'Could not subscribe. Please try again.')
          return
        }
        setDone(true)
        toast.success(
          data?.alreadySubscribed
            ? "You're already on the list. Thanks!"
            : "You're in. Thanks for subscribing!",
        )
      } catch {
        toast.error('Network error. Please try again.')
      }
    })
  }

  const isStacked = variant === 'stacked'

  return (
    <form onSubmit={onSubmit} className={className} noValidate aria-label="Subscribe to the newsletter">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-2">
          {label}
        </label>
      )}

      <div className={isStacked ? 'space-y-2' : 'flex gap-2'}>
        <input
          id={inputId}
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={placeholder}
          disabled={done || isPending}
          className="flex-1 min-w-0 h-10 px-3 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 disabled:opacity-60 disabled:cursor-not-allowed"
        />

        {/* Honeypot — hidden from humans via layout; bots fill it. */}
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={botField}
          onChange={(e) => setBotField(e.target.value)}
          className="absolute opacity-0 pointer-events-none h-0 w-0"
          aria-hidden="true"
        />

        <button
          type="submit"
          disabled={done || isPending}
          className={[
            'inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-lg text-sm font-semibold transition-colors',
            'bg-primary text-white hover:bg-primary/90',
            'disabled:opacity-60 disabled:cursor-not-allowed',
            isStacked ? 'w-full' : 'flex-shrink-0',
          ].join(' ')}
        >
          {done ? (
            <>
              <Check size={14} aria-hidden="true" />
              Subscribed
            </>
          ) : isPending ? (
            'Subscribing…'
          ) : (
            <>
              {buttonLabel}
              <ArrowRight size={14} aria-hidden="true" />
            </>
          )}
        </button>
      </div>
    </form>
  )
}
