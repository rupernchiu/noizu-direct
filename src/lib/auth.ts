import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';
import { clientIp, rateLimit } from './rate-limit';

// 10 credential attempts per IP per 15 minutes. Generous enough for a
// human who mistypes a password repeatedly, tight enough to block
// online guessing against a single account or sprayed across many.
const LOGIN_RATE = { limit: 10, windowSeconds: 900 };

// Bcrypt cost factor. Standardized on 12 across every password hash path
// (login, register, register/creator, account/password, reset-password,
// staff/login). Existing lower-cost hashes continue to verify; they are
// re-hashed lazily on next password change or reset.
export const BCRYPT_COST = 12;

/**
 * Bump `tokenVersion` for a user. Every live NextAuth JWT for this user is
 * invalidated on the next request because the `jwt` callback compares the
 * token's version against the DB and returns null on mismatch.
 *
 * Call this after:
 *   - Password change (account/password, dashboard/settings change_password)
 *   - Password reset (auth/reset-password)
 *   - Soft-delete (dashboard/settings delete_account)
 *   - Admin-initiated role demotion / account suspension / closure
 *     (e.g. admin/creators/[id], admin/staff/[id] — those routes are out of
 *     this batch's scope; when those are next touched, import and call this.)
 */
export async function bumpTokenVersion(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { tokenVersion: { increment: 1 } },
  });
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      credentials: {
        email: { type: 'email' },
        password: { type: 'password' },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) return null;

        const ip = clientIp(request as { headers: Headers });
        const rl = await rateLimit('auth-login', ip, LOGIN_RATE.limit, LOGIN_RATE.windowSeconds);
        if (!rl.allowed) return null;

        const user = await prisma.user.findUnique({
          where: { email: (credentials.email as string).trim().toLowerCase() },
        });
        if (!user || !user.password) return null;
        const valid = await bcrypt.compare(credentials.password as string, user.password);
        if (!valid) return null;
        if (user.role === 'CREATOR') {
          prisma.creatorProfile.updateMany({
            where: { userId: user.id },
            data: { lastLoginAt: new Date() },
          }).catch((err: unknown) => console.error('[auth/login] lastLoginAt update failed', err))
        }
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role as 'BUYER' | 'CREATOR' | 'ADMIN',
        };
      },
    }),
  ],
  callbacks: {
    /**
     * Google sign-in guard (C3).
     *
     * Previously: if a User row with the given email existed, Google's
     * providerAccountId was silently attached to it. An attacker could
     * pre-register /api/auth/register with the victim's email and a
     * password of their choice; when the real owner later signed in
     * with Google, they landed on the attacker's row with the attacker's
     * password intact → account takeover.
     *
     * Now:
     *   1. Require `profile.email_verified === true` (Google always verifies
     *      before issuing an ID token, but belt-and-braces).
     *   2. If an existing credentials account (row has `password` set) has
     *      NOT confirmed ownership of this email (`emailVerified` null),
     *      refuse the link. The user is redirected to /login with an
     *      `?error=OAuthAccountNotLinked` so the UI can explain that they
     *      must log in with their password first and link Google from
     *      their account page (or complete an email-verification flow).
     *   3. If no existing row, create a fresh BUYER row and stamp
     *      `emailVerified` since Google attested to the email.
     *   4. If an existing row has no password (Google-only user) OR already
     *      has `emailVerified` set, proceed with the link as before.
     */
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        const email = user.email;
        if (!email) return false;

        // Defensive: Google's OIDC flow always sets email_verified=true for
        // successful auth, but a mis-configured provider could omit it.
        if (profile && (profile as { email_verified?: boolean }).email_verified === false) {
          return false;
        }

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
          // Hijack guard: existing credentials account that hasn't verified
          // ownership of this mailbox. Refuse to silently link.
          if (existing.password && !existing.emailVerified && !existing.googleId) {
            // Returning a string redirects to /login?error=... in v5.
            return '/login?error=OAuthAccountNotLinked';
          }
          if (!existing.googleId) {
            await prisma.user.update({
              where: { id: existing.id },
              data: {
                googleId: account.providerAccountId,
                // Google attested the email → mark verified if not already.
                emailVerified: existing.emailVerified ?? new Date(),
              },
            });
          } else if (!existing.emailVerified) {
            await prisma.user.update({
              where: { id: existing.id },
              data: { emailVerified: new Date() },
            });
          }
          user.id = existing.id;
          user.role = existing.role as 'BUYER' | 'CREATOR' | 'ADMIN';
        } else {
          const created = await prisma.user.create({
            data: {
              email,
              name: user.name ?? email.split('@')[0],
              avatar: user.image ?? null,
              googleId: account.providerAccountId,
              role: 'BUYER',
              emailVerified: new Date(),
            },
          });
          user.id = created.id;
          user.role = created.role as 'BUYER' | 'CREATOR' | 'ADMIN';
        }
      }
      return true;
    },
    /**
     * jwt callback (C4 + M12).
     *
     * Runs on every session refresh (not just signIn). Previously we only
     * baked `role`/`id` in once and never re-checked, so role demotion,
     * soft-delete, suspension, and password reset all failed to invalidate
     * live sessions. We now re-read the user on every call and:
     *
     *   - If the user no longer exists → return null (NextAuth treats this
     *     as invalidation; the client is signed out).
     *   - If `tokenVersion` in the token !== DB → return null. Password
     *     changes/resets/admin actions bump this and kick existing tabs.
     *   - If `role === 'DELETED'` or `accountStatus` is SUSPENDED/CLOSED →
     *     return null. Suspended users lose access immediately.
     *   - Otherwise copy the fresh `role` + `tokenVersion` onto the token
     *     so callers see the live value.
     *
     * Cost: one indexed SELECT per JWT refresh. Acceptable at marketplace
     * scale; revisit with a short-lived cache if traffic demands it.
     */
    async jwt({ token, user }) {
      // Fresh sign-in: seed the token from the `user` object.
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }

      const userId = token.id as string | undefined;
      if (!userId) return null;

      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true, tokenVersion: true, accountStatus: true },
      });

      if (!dbUser) return null;

      // Stale token after password change / admin action.
      const tokenVersion = typeof token.tokenVersion === 'number' ? token.tokenVersion : null;
      if (user) {
        // First call after sign-in — seed from DB.
        token.tokenVersion = dbUser.tokenVersion;
      } else if (tokenVersion === null || tokenVersion !== dbUser.tokenVersion) {
        return null;
      }

      if (dbUser.role === 'DELETED') return null;
      if (dbUser.accountStatus === 'SUSPENDED' || dbUser.accountStatus === 'CLOSED') return null;

      token.role = dbUser.role as 'BUYER' | 'CREATOR' | 'ADMIN';
      return token;
    },
    session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
});
