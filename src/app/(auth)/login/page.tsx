'use client'

import { signIn } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import Link from 'next/link'

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
})

type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

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
    <div className="min-h-screen bg-[#0d0d12] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-[#1e1e2a] rounded-2xl border border-[#2a2a3a] p-8 space-y-6">
        <div className="text-center">
          <Link href="/">
            <span className="text-2xl font-bold text-white">NOIZU</span>
            <span className="text-2xl font-bold text-[#00d4aa]">-DIRECT</span>
          </Link>
        </div>

        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold text-[#f0f0f5]">Welcome back</h1>
          <p className="text-sm text-[#8888aa]">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium text-[#f0f0f5]">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              {...register('email')}
              className="w-full px-3 py-2 rounded-lg bg-[#16161f] border border-[#2a2a3a] text-[#f0f0f5] placeholder:text-[#8888aa] focus-visible:border-[#7c3aed] outline-none transition-colors"
            />
            {errors.email && (
              <p className="text-sm text-[#ef4444] mt-1">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium text-[#f0f0f5]">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              {...register('password')}
              className="w-full px-3 py-2 rounded-lg bg-[#16161f] border border-[#2a2a3a] text-[#f0f0f5] placeholder:text-[#8888aa] focus-visible:border-[#7c3aed] outline-none transition-colors"
            />
            {errors.password && (
              <p className="text-sm text-[#ef4444] mt-1">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="space-y-2 text-center text-sm text-[#8888aa]">
          <p>
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-[#7c3aed] hover:text-[#6d28d9] font-medium transition-colors">
              Sign up
            </Link>
          </p>
          <p>
            <Link href="/register/creator" className="text-[#00d4aa] hover:text-[#00b894] font-medium transition-colors">
              Become a creator
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
