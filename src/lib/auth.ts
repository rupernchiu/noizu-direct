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
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        const email = user.email;
        if (!email) return false;
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
          if (!existing.googleId) {
            await prisma.user.update({
              where: { id: existing.id },
              data: { googleId: account.providerAccountId },
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
            },
          });
          user.id = created.id;
          user.role = created.role as 'BUYER' | 'CREATOR' | 'ADMIN';
        }
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
});
