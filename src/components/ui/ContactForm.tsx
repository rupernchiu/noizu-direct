'use client'

import { useState } from 'react'
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

export function ContactForm() {
  const [fields, setFields] = useState({ name: '', email: '', subject: '', message: '' })
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [errors, setErrors] = useState<Partial<typeof fields>>({})

  function validate(): boolean {
    const e: Partial<typeof fields> = {}
    if (!fields.name.trim())    e.name    = 'Name is required.'
    if (!fields.email.trim())   e.email   = 'Email is required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) e.email = 'Enter a valid email address.'
    if (!fields.message.trim()) e.message = 'Message is required.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function set(field: keyof typeof fields, value: string) {
    setFields(f => ({ ...f, [field]: value }))
    if (errors[field]) setErrors(e => ({ ...e, [field]: undefined }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setStatus('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/contact', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...fields, bot: '' }),
      })
      const data = await res.json() as { ok?: boolean; error?: string }

      if (!res.ok || !data.ok) {
        setErrorMsg(data.error ?? 'Something went wrong. Please try again.')
        setStatus('error')
        return
      }

      setStatus('success')
    } catch {
      setErrorMsg('Network error. Please check your connection and try again.')
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center text-center py-12 px-6 gap-4">
        <CheckCircle className="size-12 text-green-500" />
        <h3 className="text-xl font-semibold text-foreground">Message sent!</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Thanks for reaching out. We&apos;ll get back to you as soon as possible.
          Check your inbox for a confirmation copy.
        </p>
        <button
          suppressHydrationWarning
          onClick={() => { setStatus('idle'); setFields({ name: '', email: '', subject: '', message: '' }) }}
          className="mt-2 text-sm text-primary hover:underline"
        >
          Send another message
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {/* Honeypot — hidden from real users */}
      <input suppressHydrationWarning type="text" name="bot" className="hidden" tabIndex={-1} aria-hidden="true" />

      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="cf-name" className="text-sm font-medium text-foreground">
          Name <span className="text-red-400">*</span>
        </label>
        <input
          suppressHydrationWarning
          id="cf-name"
          type="text"
          autoComplete="name"
          value={fields.name}
          onChange={e => set('name', e.target.value)}
          placeholder="Your full name"
          aria-invalid={!!errors.name || undefined}
          aria-describedby={errors.name ? 'name-error' : undefined}
          className={`h-10 px-3 rounded-lg text-sm bg-card border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors ${errors.name ? 'border-red-400' : 'border-border'}`}
        />
        {errors.name && <p id="name-error" role="alert" className="text-xs text-red-400">{errors.name}</p>}
      </div>

      {/* Email */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="cf-email" className="text-sm font-medium text-foreground">
          Email <span className="text-red-400">*</span>
        </label>
        <input
          suppressHydrationWarning
          id="cf-email"
          type="email"
          autoComplete="email"
          value={fields.email}
          onChange={e => set('email', e.target.value)}
          placeholder="you@example.com"
          aria-invalid={!!errors.email || undefined}
          aria-describedby={errors.email ? 'email-error' : undefined}
          className={`h-10 px-3 rounded-lg text-sm bg-card border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors ${errors.email ? 'border-red-400' : 'border-border'}`}
        />
        {errors.email && <p id="email-error" role="alert" className="text-xs text-red-400">{errors.email}</p>}
      </div>

      {/* Subject */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="cf-subject" className="text-sm font-medium text-foreground">
          Subject
        </label>
        <input
          suppressHydrationWarning
          id="cf-subject"
          type="text"
          value={fields.subject}
          onChange={e => set('subject', e.target.value)}
          placeholder="What's this about?"
          className="h-10 px-3 rounded-lg text-sm bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
        />
      </div>

      {/* Message */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="cf-message" className="text-sm font-medium text-foreground">
          Message <span className="text-red-400">*</span>
        </label>
        <textarea
          suppressHydrationWarning
          id="cf-message"
          rows={6}
          value={fields.message}
          onChange={e => set('message', e.target.value)}
          placeholder="Tell us how we can help..."
          aria-invalid={!!errors.message || undefined}
          aria-describedby={errors.message ? 'message-error' : undefined}
          className={`px-3 py-2.5 rounded-lg text-sm bg-card border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors resize-none ${errors.message ? 'border-red-400' : 'border-border'}`}
        />
        <div className="flex items-center justify-between">
          {errors.message
            ? <p id="message-error" role="alert" className="text-xs text-red-400">{errors.message}</p>
            : <span />
          }
          <p className="text-xs text-muted-foreground ml-auto">{fields.message.length}/2000</p>
        </div>
      </div>

      {/* Error banner */}
      {status === 'error' && (
        <div id="contact-error" role="alert" className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="size-4 shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Submit */}
      <button
        suppressHydrationWarning
        type="submit"
        disabled={status === 'loading'}
        className="h-11 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
      >
        {status === 'loading' && <Loader2 className="size-4 animate-spin" />}
        {status === 'loading' ? 'Sending…' : 'Send Message'}
      </button>

      <p className="text-xs text-muted-foreground text-center">
        We typically respond within 1–2 business days.
      </p>
    </form>
  )
}
