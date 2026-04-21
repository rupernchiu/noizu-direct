import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_HOSTS = ['localhost:7000', '127.0.0.1:7000']

// Paths that bypass maintenance mode — admin must always be accessible to turn it off
const MAINTENANCE_BYPASS = [
  '/maintenance',
  '/admin',
  '/api/',
  '/_next',
  '/favicon',
  '/uploads',
  '/fonts',
  '/images',
  '/icons',
]

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // ── Hotlink protection for uploads ────────────────────────────────────────
  if (pathname.startsWith('/uploads/')) {
    const referer = req.headers.get('referer')
    if (!referer) return NextResponse.next()
    try {
      const refHost = new URL(referer).host
      if (ALLOWED_HOSTS.includes(refHost)) return NextResponse.next()
    } catch { /* malformed referer */ }
    return new NextResponse('Forbidden', { status: 403 })
  }

  // ── Maintenance mode check ────────────────────────────────────────────────
  const bypass = MAINTENANCE_BYPASS.some(p => pathname.startsWith(p))
  if (!bypass) {
    try {
      const url = req.nextUrl.clone()
      url.pathname = '/api/internal/maintenance-status'
      const res = await fetch(url.toString(), {
        headers: { 'x-internal-secret': process.env.CRON_SECRET ?? '' },
      })
      if (res.ok) {
        const { enabled } = await res.json() as { enabled: boolean }
        if (enabled) {
          const maintenanceUrl = req.nextUrl.clone()
          maintenanceUrl.pathname = '/maintenance'
          return NextResponse.rewrite(maintenanceUrl)
        }
      }
    } catch {
      // If check fails, let the request through — don't block on DB errors
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
