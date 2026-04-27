'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import Link from 'next/link'
import { Logo } from '@/components/ui/Logo'
import { COUNTRIES, enabledCreatorCountries } from '@/lib/countries'

const CATEGORY_OPTIONS = [
  'Digital Art',
  'Doujin',
  'Cosplay Prints',
  'Merch',
  'Stickers',
] as const

// Tier-1 countries (sorted) for the dropdown. Phase 3 of the tax architecture
// build (2026-04-27 spec). Anyone outside Tier 1 hits the waitlist modal.
const TIER1_COUNTRIES = enabledCreatorCountries()
  .map((c) => ({ iso2: c.iso2, name: c.name }))
  .sort((a, b) => a.name.localeCompare(b.name))
const ALL_COUNTRIES = Object.values(COUNTRIES)
  .map((c) => ({ iso2: c.iso2, name: c.name }))
  .sort((a, b) => a.name.localeCompare(b.name))

const step1Schema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email'),
    password: z.string().min(8, 'At least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords must match',
    path: ['confirmPassword'],
  })

const step2Schema = z.object({
  username: z
    .string()
    .min(3, 'At least 3 characters')
    .max(30, 'At most 30 characters')
    .regex(/^[a-z0-9_]+$/, 'Lowercase letters, numbers and underscores only'),
  displayName: z.string().min(2, 'At least 2 characters').max(60, 'At most 60 characters'),
  bio: z.string().max(500, 'At most 500 characters').optional(),
  categoryTags: z.array(z.string()).min(1, 'Select at least one category'),
  country: z
    .string()
    .length(2, 'Pick your country')
    .refine((v) => TIER1_COUNTRIES.some((c) => c.iso2 === v), {
      message: 'Country not currently open — please join the waitlist.',
    }),
})

const waitlistSchema = z.object({
  email: z.string().email('Enter a valid email'),
  country: z.string().length(2, 'Pick a country'),
})
type WaitlistData = z.infer<typeof waitlistSchema>

type Step1Data = z.infer<typeof step1Schema>
type Step2Data = z.infer<typeof step2Schema>

export default function CreatorRegisterPage() {
  const [currentStep, setCurrentStep] = useState<1 | 2>(1)
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null)
  const [waitlistOpen, setWaitlistOpen] = useState(false)

  const {
    register: registerStep1,
    handleSubmit: handleStep1Submit,
    formState: { errors: errors1, isSubmitting: isStep1Submitting },
  } = useForm<Step1Data>({ resolver: zodResolver(step1Schema) })

  const {
    register: registerStep2,
    handleSubmit: handleStep2Submit,
    setValue,
    watch,
    formState: { errors: errors2, isSubmitting: isStep2Submitting },
  } = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: { categoryTags: [], country: TIER1_COUNTRIES[0]?.iso2 ?? 'MY' },
  })

  const watchedTags = watch('categoryTags') ?? []

  function onStep1Valid(data: Step1Data) {
    setStep1Data(data)
    setCurrentStep(2)
  }

  function toggleCategory(cat: string) {
    const current = watchedTags
    if (current.includes(cat)) {
      setValue('categoryTags', current.filter((c) => c !== cat), { shouldValidate: true })
    } else {
      setValue('categoryTags', [...current, cat], { shouldValidate: true })
    }
  }

  async function onStep2Valid(data: Step2Data) {
    if (!step1Data) return

    try {
      const res = await fetch('/api/auth/register/creator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: step1Data.name,
          email: step1Data.email,
          password: step1Data.password,
          username: data.username,
          displayName: data.displayName,
          bio: data.bio,
          categoryTags: data.categoryTags,
          country: data.country,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        toast.error((body as { error?: string }).error ?? 'Registration failed')
        if ((body as { error?: string }).error?.toLowerCase().includes('email')) {
          setCurrentStep(1)
        }
        return
      }

      await signIn('credentials', {
        email: step1Data.email,
        password: step1Data.password,
        redirectTo: '/dashboard',
      })
    } catch {
      toast.error('Something went wrong. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-card rounded-2xl border border-border p-8 space-y-6">
        {/* Logo */}
        <div className="flex justify-center">
          <Link href="/">
            <Logo />
          </Link>
        </div>

        {/* Heading */}
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold text-foreground">Become a creator</h1>
          <p className="text-sm text-muted-foreground">
            Step {currentStep} of 2 —{' '}
            {currentStep === 1 ? 'Account details' : 'Creator profile'}
          </p>
        </div>

        {/* Step indicators */}
        <div className="flex gap-2">
          {([1, 2] as const).map((step) => (
            <div
              key={step}
              className={`flex-1 h-1 rounded-full transition-colors ${
                step <= currentStep ? 'bg-primary' : 'bg-border'
              }`}
            />
          ))}
        </div>

        {/* Step 1 */}
        {currentStep === 1 && (
          <form onSubmit={handleStep1Submit(onStep1Valid)} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="name" className="text-sm font-medium text-foreground">
                Name
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                placeholder="Your name"
                aria-invalid={!!errors1.name || undefined}
                aria-describedby={errors1.name ? 'name-error' : undefined}
                {...registerStep1('name')}
                className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-foreground placeholder:text-muted-foreground focus-visible:border-primary outline-none transition-colors"
              />
              {errors1.name && (
                <p id="name-error" role="alert" className="text-sm text-destructive mt-1">{errors1.name.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                aria-invalid={!!errors1.email || undefined}
                aria-describedby={errors1.email ? 'email-error' : undefined}
                {...registerStep1('email')}
                className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-foreground placeholder:text-muted-foreground focus-visible:border-primary outline-none transition-colors"
              />
              {errors1.email && (
                <p id="email-error" role="alert" className="text-sm text-destructive mt-1">{errors1.email.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                aria-invalid={!!errors1.password || undefined}
                aria-describedby={errors1.password ? 'password-error' : undefined}
                {...registerStep1('password')}
                className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-foreground placeholder:text-muted-foreground focus-visible:border-primary outline-none transition-colors"
              />
              {errors1.password && (
                <p id="password-error" role="alert" className="text-sm text-destructive mt-1">{errors1.password.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                aria-invalid={!!errors1.confirmPassword || undefined}
                aria-describedby={errors1.confirmPassword ? 'confirmPassword-error' : undefined}
                {...registerStep1('confirmPassword')}
                className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-foreground placeholder:text-muted-foreground focus-visible:border-primary outline-none transition-colors"
              />
              {errors1.confirmPassword && (
                <p id="confirmPassword-error" role="alert" className="text-sm text-destructive mt-1">{errors1.confirmPassword.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isStep1Submitting}
              className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </form>
        )}

        {/* Step 2 */}
        {currentStep === 2 && (
          <form onSubmit={handleStep2Submit(onStep2Valid)} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="username" className="text-sm font-medium text-foreground">
                Username
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                placeholder="your_handle"
                aria-invalid={!!errors2.username || undefined}
                aria-describedby={errors2.username ? 'username-error' : undefined}
                {...registerStep2('username')}
                className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-foreground placeholder:text-muted-foreground focus-visible:border-primary outline-none transition-colors"
              />
              {errors2.username && (
                <p id="username-error" role="alert" className="text-sm text-destructive mt-1">{errors2.username.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="displayName" className="text-sm font-medium text-foreground">
                Display Name
              </label>
              <input
                id="displayName"
                type="text"
                placeholder="The name fans will see"
                aria-invalid={!!errors2.displayName || undefined}
                aria-describedby={errors2.displayName ? 'displayName-error' : undefined}
                {...registerStep2('displayName')}
                className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-foreground placeholder:text-muted-foreground focus-visible:border-primary outline-none transition-colors"
              />
              {errors2.displayName && (
                <p id="displayName-error" role="alert" className="text-sm text-destructive mt-1">{errors2.displayName.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="bio" className="text-sm font-medium text-foreground">
                Bio{' '}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <textarea
                id="bio"
                rows={3}
                placeholder="Tell fans about yourself…"
                aria-invalid={!!errors2.bio || undefined}
                aria-describedby={errors2.bio ? 'bio-error' : undefined}
                {...registerStep2('bio')}
                className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-foreground placeholder:text-muted-foreground focus-visible:border-primary outline-none transition-colors resize-none"
              />
              {errors2.bio && (
                <p id="bio-error" role="alert" className="text-sm text-destructive mt-1">{errors2.bio.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="country" className="text-sm font-medium text-foreground">
                Country of residence
              </label>
              <select
                id="country"
                {...registerStep2('country')}
                className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-foreground placeholder:text-muted-foreground focus-visible:border-primary outline-none transition-colors"
              >
                {TIER1_COUNTRIES.map((c) => (
                  <option key={c.iso2} value={c.iso2}>
                    {c.name}
                  </option>
                ))}
              </select>
              {errors2.country && (
                <p role="alert" className="text-sm text-destructive mt-1">{errors2.country.message}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Don&apos;t see your country?{' '}
                <button
                  type="button"
                  onClick={() => setWaitlistOpen(true)}
                  className="text-primary hover:underline font-medium"
                >
                  Join the waitlist
                </button>
                .
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Categories</p>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_OPTIONS.map((cat) => {
                  const selected = watchedTags.includes(cat)
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                        selected
                          ? 'bg-primary border-primary text-white'
                          : 'bg-transparent border-border text-muted-foreground hover:border-primary hover:text-foreground'
                      }`}
                    >
                      {cat}
                    </button>
                  )
                })}
              </div>
              {errors2.categoryTags && (
                <p id="categoryTags-error" role="alert" className="text-sm text-destructive mt-1">{errors2.categoryTags.message}</p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="flex-1 border border-border text-muted-foreground hover:text-foreground hover:border-primary font-semibold py-2.5 rounded-lg transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isStep2Submitting}
                className="flex-1 bg-primary hover:bg-primary/90 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isStep2Submitting ? 'Creating…' : 'Create profile'}
              </button>
            </div>
          </form>
        )}

        <div className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="text-primary hover:text-primary/80 font-medium transition-colors">
            Log in
          </Link>
        </div>
      </div>
      {waitlistOpen && (
        <WaitlistModal onClose={() => setWaitlistOpen(false)} />
      )}
    </div>
  )
}

// ─── Waitlist modal ──────────────────────────────────────────────────────────

function WaitlistModal({ onClose }: { onClose: () => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<WaitlistData>({
    resolver: zodResolver(waitlistSchema),
    defaultValues: { email: '', country: ALL_COUNTRIES[0]?.iso2 ?? 'MY' },
  })

  async function onValid(data: WaitlistData) {
    try {
      const res = await fetch('/api/creator-waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        toast.error(body.error ?? 'Could not join waitlist. Please try again.')
        return
      }
      toast.success("You're on the waitlist — we'll email you when your country opens.")
      onClose()
    } catch {
      toast.error('Network error — please try again.')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="register-waitlist-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-card rounded-2xl border border-border p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h2 id="register-waitlist-title" className="text-lg font-bold text-foreground">
            Join the creator waitlist
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            We&apos;ll let you know as soon as we open creator onboarding for your country.
          </p>
        </div>
        <form onSubmit={handleSubmit(onValid)} className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="rwl-email" className="text-sm font-medium text-foreground">Email</label>
            <input
              id="rwl-email"
              type="email"
              placeholder="you@example.com"
              {...register('email')}
              className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-foreground placeholder:text-muted-foreground focus-visible:border-primary outline-none transition-colors"
            />
            {errors.email && (
              <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-1">
            <label htmlFor="rwl-country" className="text-sm font-medium text-foreground">Country</label>
            <select
              id="rwl-country"
              {...register('country')}
              className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-foreground placeholder:text-muted-foreground focus-visible:border-primary outline-none transition-colors"
            >
              {ALL_COUNTRIES.map((c) => (
                <option key={c.iso2} value={c.iso2}>{c.name}</option>
              ))}
            </select>
            {errors.country && (
              <p className="text-sm text-destructive mt-1">{errors.country.message}</p>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-border text-muted-foreground hover:text-foreground hover:border-primary font-semibold py-2.5 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-primary hover:bg-primary/90 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Joining…' : 'Join waitlist'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
