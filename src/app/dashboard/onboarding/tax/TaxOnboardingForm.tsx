'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'

const TOS_VERSION = '2026-04-27'

interface CountryOption {
  iso2: string
  name: string
}

interface ExistingValues {
  country?: string | null
  classification?: 'INDIVIDUAL' | 'REGISTERED_BUSINESS' | null
  taxId?: string | null
  taxJurisdiction?: string | null
}

interface Props {
  defaultCountry: string
  enabledCountries: CountryOption[]
  allCountries: CountryOption[]
  existingValues: ExistingValues
  /** Pre-rendered, sanitized HTML from src/content/legal/tax-indemnification.md */
  indemnificationHtml: string
  /** Plain version date pulled from the same MD frontmatter for display. */
  indemnificationVersion: string
}

const formSchema = z
  .object({
    country: z.string().length(2, 'Pick your country'),
    classification: z.enum(['INDIVIDUAL', 'REGISTERED_BUSINESS']),
    taxId: z.string().trim().optional(),
    taxJurisdiction: z.string().length(2).optional(),
    ack: z.literal(true, { message: 'You must acknowledge the indemnification clause.' }),
  })
  .superRefine((d, ctx) => {
    if (d.classification === 'REGISTERED_BUSINESS') {
      if (!d.taxId || d.taxId.trim().length === 0) {
        ctx.addIssue({ code: 'custom', path: ['taxId'], message: 'Required for registered businesses.' })
      }
      if (!d.taxJurisdiction || d.taxJurisdiction.length !== 2) {
        ctx.addIssue({
          code: 'custom',
          path: ['taxJurisdiction'],
          message: 'Pick the jurisdiction where you are tax-registered.',
        })
      }
    }
  })

type FormData = z.infer<typeof formSchema>

const inputCls =
  'w-full px-3 py-2 rounded-lg bg-surface border border-border text-foreground placeholder:text-muted-foreground focus-visible:border-primary outline-none transition-colors'

export function TaxOnboardingForm({
  defaultCountry,
  enabledCountries,
  allCountries,
  existingValues,
  indemnificationHtml,
  indemnificationVersion,
}: Props) {
  const router = useRouter()
  const [waitlistOpen, setWaitlistOpen] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      country: existingValues.country ?? defaultCountry,
      classification: existingValues.classification ?? 'INDIVIDUAL',
      taxId: existingValues.taxId ?? '',
      taxJurisdiction:
        existingValues.taxJurisdiction ?? existingValues.country ?? defaultCountry,
      ack: undefined as unknown as true,
    },
  })

  const classification = watch('classification')
  const country = watch('country')

  async function onValid(data: FormData) {
    try {
      const res = await fetch('/api/dashboard/onboarding/tax', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          country: data.country,
          classification: data.classification,
          taxId: data.classification === 'REGISTERED_BUSINESS' ? data.taxId : undefined,
          taxJurisdiction:
            data.classification === 'REGISTERED_BUSINESS' ? data.taxJurisdiction : undefined,
          ackTosVersion: TOS_VERSION,
        }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        toast.error(body.error ?? 'Could not save tax onboarding. Please try again.')
        return
      }
      toast.success('Tax onboarding complete')
      router.push('/dashboard/onboarding')
      router.refresh()
    } catch {
      toast.error('Network error — please try again.')
    }
  }

  return (
    <form onSubmit={handleSubmit(onValid)} className="space-y-6">
      {/* Country */}
      <div className="space-y-1">
        <label htmlFor="country" className="text-sm font-medium text-foreground">
          Country of residence
        </label>
        <select
          id="country"
          {...register('country')}
          className={inputCls}
          onChange={(e) => {
            setValue('country', e.target.value, { shouldValidate: true })
            // Default jurisdiction to selected country when business is selected.
            if (classification === 'REGISTERED_BUSINESS') {
              setValue('taxJurisdiction', e.target.value, { shouldValidate: true })
            }
          }}
        >
          {enabledCountries.map((c) => (
            <option key={c.iso2} value={c.iso2}>
              {c.name}
            </option>
          ))}
        </select>
        {errors.country && (
          <p className="text-sm text-destructive mt-1">{errors.country.message}</p>
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

      {/* Classification */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-foreground">Tax classification</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label
            className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
              classification === 'INDIVIDUAL'
                ? 'border-primary bg-primary/5'
                : 'border-border bg-surface hover:border-primary/40'
            }`}
          >
            <input
              type="radio"
              value="INDIVIDUAL"
              {...register('classification')}
              className="mt-1"
            />
            <span>
              <span className="block text-sm font-medium text-foreground">Individual</span>
              <span className="block text-xs text-muted-foreground mt-0.5">
                Sole creator, not VAT/SST/GST registered.
              </span>
            </span>
          </label>
          <label
            className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
              classification === 'REGISTERED_BUSINESS'
                ? 'border-primary bg-primary/5'
                : 'border-border bg-surface hover:border-primary/40'
            }`}
          >
            <input
              type="radio"
              value="REGISTERED_BUSINESS"
              {...register('classification')}
              className="mt-1"
            />
            <span>
              <span className="block text-sm font-medium text-foreground">
                Registered business
              </span>
              <span className="block text-xs text-muted-foreground mt-0.5">
                Sdn Bhd, Pte Ltd, PT, Co. Ltd, etc. — has a tax registration number.
              </span>
            </span>
          </label>
        </div>
        {errors.classification && (
          <p className="text-sm text-destructive mt-1">{errors.classification.message}</p>
        )}
      </fieldset>

      {/* Business-only fields */}
      {classification === 'REGISTERED_BUSINESS' && (
        <div className="space-y-4 rounded-lg border border-border bg-surface/50 p-4">
          <div className="space-y-1">
            <label htmlFor="taxId" className="text-sm font-medium text-foreground">
              Tax registration number
            </label>
            <input
              id="taxId"
              type="text"
              placeholder="e.g. SST: A12-3456-78900000"
              {...register('taxId')}
              className={inputCls}
            />
            {errors.taxId && (
              <p className="text-sm text-destructive mt-1">{errors.taxId.message}</p>
            )}
          </div>
          <div className="space-y-1">
            <label htmlFor="taxJurisdiction" className="text-sm font-medium text-foreground">
              Tax jurisdiction
            </label>
            <select
              id="taxJurisdiction"
              {...register('taxJurisdiction')}
              className={inputCls}
              defaultValue={existingValues.taxJurisdiction ?? country}
            >
              {allCountries.map((c) => (
                <option key={c.iso2} value={c.iso2}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.taxJurisdiction && (
              <p className="text-sm text-destructive mt-1">{errors.taxJurisdiction.message}</p>
            )}
          </div>
        </div>
      )}

      {/* Indemnification */}
      <div className="space-y-2 rounded-lg border border-border bg-surface/50 p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Indemnification — version {indemnificationVersion}
        </p>
        <div
          className="prose prose-sm max-w-none text-sm text-foreground [&_p]:mb-3 [&_p:last-child]:mb-0"
          dangerouslySetInnerHTML={{ __html: indemnificationHtml }}
        />
        <label className="flex items-start gap-2 pt-2">
          <input
            type="checkbox"
            {...register('ack')}
            className="mt-1 size-4 rounded border-border"
          />
          <span className="text-sm text-foreground">
            I have read and acknowledge the indemnification clause above.
          </span>
        </label>
        {errors.ack && (
          <p className="text-sm text-destructive mt-1">{errors.ack.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Saving…' : 'Complete tax onboarding'}
      </button>

      {waitlistOpen && (
        <WaitlistModal countries={allCountries} onClose={() => setWaitlistOpen(false)} />
      )}
    </form>
  )
}

// ─── Inline waitlist modal ───────────────────────────────────────────────────

const waitlistSchema = z.object({
  email: z.string().email('Enter a valid email'),
  country: z.string().length(2, 'Pick a country'),
})
type WaitlistData = z.infer<typeof waitlistSchema>

function WaitlistModal({
  countries,
  onClose,
}: {
  countries: CountryOption[]
  onClose: () => void
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<WaitlistData>({
    resolver: zodResolver(waitlistSchema),
    defaultValues: { email: '', country: countries[0]?.iso2 ?? 'MY' },
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
      aria-labelledby="waitlist-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-card rounded-2xl border border-border p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h2 id="waitlist-title" className="text-lg font-bold text-foreground">
            Join the creator waitlist
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            We&apos;ll let you know as soon as we open creator onboarding for your country.
          </p>
        </div>
        <form onSubmit={handleSubmit(onValid)} className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="waitlist-email" className="text-sm font-medium text-foreground">
              Email
            </label>
            <input
              id="waitlist-email"
              type="email"
              placeholder="you@example.com"
              {...register('email')}
              className={inputCls}
            />
            {errors.email && (
              <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-1">
            <label htmlFor="waitlist-country" className="text-sm font-medium text-foreground">
              Country
            </label>
            <select id="waitlist-country" {...register('country')} className={inputCls}>
              {countries.map((c) => (
                <option key={c.iso2} value={c.iso2}>
                  {c.name}
                </option>
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
