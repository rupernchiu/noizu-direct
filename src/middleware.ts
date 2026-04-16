import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_HOSTS = ['localhost:7000', '127.0.0.1:7000']

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Only apply hotlink protection to served upload files
  if (!pathname.startsWith('/uploads/')) {
    return NextResponse.next()
  }

  const referer = req.headers.get('referer')

  // No Referer = direct access (browser address bar, curl, etc.) — allow
  if (!referer) {
    return NextResponse.next()
  }

  // Parse the Referer and check host
  try {
    const refHost = new URL(referer).host
    if (ALLOWED_HOSTS.includes(refHost)) {
      return NextResponse.next()
    }
  } catch {
    // Malformed Referer — block it
  }

  return new NextResponse('Forbidden', { status: 403 })
}

export const config = {
  matcher: '/uploads/:path*',
}
