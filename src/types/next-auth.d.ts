// Module augmentation for NextAuth v5. Replaces the `(session.user as any).id`
// / `(session.user as any).role` casts scattered throughout the codebase.
// Types must stay in sync with src/lib/auth.ts jwt/session callbacks.

import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: 'BUYER' | 'CREATOR' | 'ADMIN'
    } & DefaultSession['user']
  }

  interface User {
    id: string
    role: 'BUYER' | 'CREATOR' | 'ADMIN'
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: 'BUYER' | 'CREATOR' | 'ADMIN'
  }
}
