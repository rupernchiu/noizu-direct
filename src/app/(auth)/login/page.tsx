'use client'

import { signIn } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import Link from 'next/link'
import { useState } from 'react'

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
})

type FormData = z.infer<typeof schema>

const DEMO_ACCOUNTS = [
  { label: 'Admin',   icon: '👑', email: 'admin@noizu.direct',  password: 'admin123'    },
  { label: 'Creator', icon: '🎨', email: 'sakura@noizu.direct', password: 'creator123'  },
  { label: 'Buyer',   icon: '🛍️', email: 'buyer1@test.com',     password: 'buyer123'    },
] as const

const SHOW_DEMO = process.env.NEXT_PUBLIC_SHOW_DEMO_LOGIN === 'true'

export default function LoginPage() {
  const [activeDemo, setActiveDemo] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  function fillDemo(account: typeof DEMO_ACCOUNTS[number]) {
    setValue('email', account.email, { shouldValidate: true })
    setValue('password', account.password, { shouldValidate: true })
    setActiveDemo(account.label)
  }

  async function onSubmit(data: FormData) {
    try {
      await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirectTo: '/',
      })
    } catch {
      toast.error('Invalid email or password')
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-card rounded-2xl border border-border p-8 space-y-6">
        <div className="text-center">
          <Link href="/">
            <span className="text-2xl font-bold text-white">NOIZU</span>
            <span className="text-2xl font-bold text-secondary">-DIRECT</span>
          </Link>
        </div>

        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
          <p className="text-sm text-muted-foreground">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              {...register('email')}
              className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-foreground placeholder:text-muted-foreground focus-visible:border-primary outline-none transition-colors"
            />
            {errors.email && (
              <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              {...register('password')}
              className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-foreground placeholder:text-muted-foreground focus-visible:border-primary outline-none transition-colors"
            />
            {errors.password && (
              <p className="text-sm text-destructive mt-1">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="space-y-2 text-center text-sm text-muted-foreground">
          <p>
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-primary hover:text-primary/80 font-medium transition-colors">
              Sign up
            </Link>
          </p>
          <p>
            <Link href="/register/creator" className="text-secondary hover:text-secondary/80 font-medium transition-colors">
              Become a creator
            </Link>
          </p>
        </div>

        {SHOW_DEMO && (
          <div style={{ marginTop: '8px' }}>
            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '4px 0 14px' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
              <span style={{ fontSize: '11px', color: 'var(--muted-foreground)', whiteSpace: 'nowrap', userSelect: 'none' }}>
                or try a demo account
              </span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
            </div>

            {/* Pill buttons */}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              {DEMO_ACCOUNTS.map((acc) => {
                const active = activeDemo === acc.label
                return (
                  <button
                    suppressHydrationWarning
                    key={acc.label}
                    type="button"
                    onClick={() => fillDemo(acc)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '5px',
                      padding: '6px 14px',
                      fontSize: '13px', fontWeight: 500,
                      borderRadius: '20px',
                      border: `1.5px solid ${active ? '#7c3aed' : 'var(--border)'}`,
                      background: active ? 'rgba(124,58,237,0.06)' : 'var(--background)',
                      color: active ? '#7c3aed' : 'var(--muted-foreground)',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s, color 0.15s, background 0.15s',
                    }}
                    onMouseEnter={e => {
                      if (!active) {
                        e.currentTarget.style.borderColor = '#7c3aed'
                        e.currentTarget.style.color = '#7c3aed'
                      }
                    }}
                    onMouseLeave={e => {
                      if (!active) {
                        e.currentTarget.style.borderColor = 'var(--border)'
                        e.currentTarget.style.color = 'var(--muted-foreground)'
                      }
                    }}
                  >
                    <span>{acc.icon}</span>
                    {acc.label}
                  </button>
                )
              })}
            </div>

            <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--muted-foreground)', marginTop: '8px', opacity: 0.7 }}>
              Click to fill credentials · Demo accounts — prototype only
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
