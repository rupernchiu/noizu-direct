import { NextResponse } from 'next/server'

// NextAuth v5 (Auth.js) cookie names.
// On HTTP (localhost) they are unprefixed; on HTTPS they get __Secure- / __Host- prefixes.
// We delete all variants so this works in both environments.
const AUTH_COOKIES = [
  // HTTP / localhost
  'authjs.session-token',
  'authjs.callback-url',
  'authjs.csrf-token',
  // HTTPS / production
  '__Secure-authjs.session-token',
  '__Secure-authjs.callback-url',
  '__Host-authjs.csrf-token',
]

export async function POST() {
  const response = NextResponse.json({ ok: true })

  for (const name of AUTH_COOKIES) {
    // Delete by setting Max-Age=0 with the broadest possible path/domain scope
    response.cookies.set(name, '', {
      maxAge: 0,
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
    })
  }

  return response
}
