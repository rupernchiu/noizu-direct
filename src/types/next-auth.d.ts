// Module augmentation for NextAuth v5. Replaces the `(session.user as any).id`
// / `(session.user as any).role` casts scattered throughout the codebase.
// Types must stay in sync with src/lib/auth.ts jwt/session callbacks.
//
// NextAuth v5 re-exports Session/User/JWT from @auth/core. Re-exported types
// do not pick up module augmentation on the re-export path — we must augment
// the source modules directly for the narrowed types to flow into callbacks.

import type { DefaultSession } from 'next-auth'

type AppRole = 'BUYER' | 'CREATOR' | 'ADMIN'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: AppRole
    } & DefaultSession['user']
  }

  interface User {
    id: string
    role: AppRole
  }
}

declare module '@auth/core/types' {
  interface Session {
    user: {
      id: string
      role: AppRole
    } & DefaultSession['user']
  }

  interface User {
    id: string
    role: AppRole
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: AppRole
    tokenVersion: number
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    id: string
    role: AppRole
    tokenVersion: number
  }
}
