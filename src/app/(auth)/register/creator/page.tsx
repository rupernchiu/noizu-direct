'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import Link from 'next/link'

const CATEGORY_OPTIONS = [
  'Digital Art',
  'Doujin',
  'Cosplay Prints',
  'Merch',
  'Stickers',
] as const

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
})

type Step1Data = z.infer<typeof step1Schema>
type Step2Data = z.infer<typeof step2Schema>

export default function CreatorRegisterPage() {
  const [currentStep, setCurrentStep] = useState<1 | 2>(1)
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null)

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
    defaultValues: { categoryTags: [] },
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
    <div className="min-h-screen bg-[#0d0d12] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-[#1e1e2a] rounded-2xl border border-[#2a2a3a] p-8 space-y-6">
        {/* Logo */}
        <div className="text-center">
          <Link href="/">
            <span className="text-2xl font-bold text-white">NOIZU</span>
            <span className="text-2xl font-bold text-[#00d4aa]">-DIRECT</span>
          </Link>
        </div>

        {/* Heading */}
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold text-[#f0f0f5]">Become a creator</h1>
          <p className="text-sm text-[#8888aa]">
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
                step <= currentStep ? 'bg-[#7c3aed]' : 'bg-[#2a2a3a]'
              }`}
            />
          ))}
        </div>

        {/* Step 1 */}
        {currentStep === 1 && (
          <form onSubmit={handleStep1Submit(onStep1Valid)} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="name" className="text-sm font-medium text-[#f0f0f5]">
                Name
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                placeholder="Your name"
                {...registerStep1('name')}
                className="w-full px-3 py-2 rounded-lg bg-[#16161f] border border-[#2a2a3a] text-[#f0f0f5] placeholder:text-[#8888aa] focus-visible:border-[#7c3aed] outline-none transition-colors"
              />
              {errors1.name && (
                <p className="text-sm text-[#ef4444] mt-1">{errors1.name.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="email" className="text-sm font-medium text-[#f0f0f5]">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                {...registerStep1('email')}
                className="w-full px-3 py-2 rounded-lg bg-[#16161f] border border-[#2a2a3a] text-[#f0f0f5] placeholder:text-[#8888aa] focus-visible:border-[#7c3aed] outline-none transition-colors"
              />
              {errors1.email && (
                <p className="text-sm text-[#ef4444] mt-1">{errors1.email.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="password" className="text-sm font-medium text-[#f0f0f5]">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                {...registerStep1('password')}
                className="w-full px-3 py-2 rounded-lg bg-[#16161f] border border-[#2a2a3a] text-[#f0f0f5] placeholder:text-[#8888aa] focus-visible:border-[#7c3aed] outline-none transition-colors"
              />
              {errors1.password && (
                <p className="text-sm text-[#ef4444] mt-1">{errors1.password.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-[#f0f0f5]">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                {...registerStep1('confirmPassword')}
                className="w-full px-3 py-2 rounded-lg bg-[#16161f] border border-[#2a2a3a] text-[#f0f0f5] placeholder:text-[#8888aa] focus-visible:border-[#7c3aed] outline-none transition-colors"
              />
              {errors1.confirmPassword && (
                <p className="text-sm text-[#ef4444] mt-1">{errors1.confirmPassword.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isStep1Submitting}
              className="w-full bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </form>
        )}

        {/* Step 2 */}
        {currentStep === 2 && (
          <form onSubmit={handleStep2Submit(onStep2Valid)} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="username" className="text-sm font-medium text-[#f0f0f5]">
                Username
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                placeholder="your_handle"
                {...registerStep2('username')}
                className="w-full px-3 py-2 rounded-lg bg-[#16161f] border border-[#2a2a3a] text-[#f0f0f5] placeholder:text-[#8888aa] focus-visible:border-[#7c3aed] outline-none transition-colors"
              />
              {errors2.username && (
                <p className="text-sm text-[#ef4444] mt-1">{errors2.username.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="displayName" className="text-sm font-medium text-[#f0f0f5]">
                Display Name
              </label>
              <input
                id="displayName"
                type="text"
                placeholder="The name fans will see"
                {...registerStep2('displayName')}
                className="w-full px-3 py-2 rounded-lg bg-[#16161f] border border-[#2a2a3a] text-[#f0f0f5] placeholder:text-[#8888aa] focus-visible:border-[#7c3aed] outline-none transition-colors"
              />
              {errors2.displayName && (
                <p className="text-sm text-[#ef4444] mt-1">{errors2.displayName.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="bio" className="text-sm font-medium text-[#f0f0f5]">
                Bio{' '}
                <span className="text-[#8888aa] font-normal">(optional)</span>
              </label>
              <textarea
                id="bio"
                rows={3}
                placeholder="Tell fans about yourself…"
                {...registerStep2('bio')}
                className="w-full px-3 py-2 rounded-lg bg-[#16161f] border border-[#2a2a3a] text-[#f0f0f5] placeholder:text-[#8888aa] focus-visible:border-[#7c3aed] outline-none transition-colors resize-none"
              />
              {errors2.bio && (
                <p className="text-sm text-[#ef4444] mt-1">{errors2.bio.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-[#f0f0f5]">Categories</p>
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
                          ? 'bg-[#7c3aed] border-[#7c3aed] text-white'
                          : 'bg-transparent border-[#2a2a3a] text-[#8888aa] hover:border-[#7c3aed] hover:text-[#f0f0f5]'
                      }`}
                    >
                      {cat}
                    </button>
                  )
                })}
              </div>
              {errors2.categoryTags && (
                <p className="text-sm text-[#ef4444] mt-1">{errors2.categoryTags.message}</p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="flex-1 border border-[#2a2a3a] text-[#8888aa] hover:text-[#f0f0f5] hover:border-[#7c3aed] font-semibold py-2.5 rounded-lg transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isStep2Submitting}
                className="flex-1 bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isStep2Submitting ? 'Creating…' : 'Create profile'}
              </button>
            </div>
          </form>
        )}

        <div className="text-center text-sm text-[#8888aa]">
          Already have an account?{' '}
          <Link href="/login" className="text-[#7c3aed] hover:text-[#6d28d9] font-medium transition-colors">
            Log in
          </Link>
        </div>
      </div>
    </div>
  )
}
