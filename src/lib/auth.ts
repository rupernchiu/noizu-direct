import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';

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
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });
        if (!user || !user.password) return null;
        const valid = await bcrypt.compare(credentials.password as string, user.password);
        if (!valid) return null;
        if (user.role === 'CREATOR') {
          prisma.creatorProfile.updateMany({
            where: { userId: user.id },
            data: { lastLoginAt: new Date() },
          }).catch(() => {})
        }
        return { id: user.id, email: user.email, name: user.name, role: user.role };
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
          (user as any).role = existing.role;
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
          (user as any).role = created.role;
        }
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
});
