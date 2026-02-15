import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('access_token')?.value
  const { pathname } = request.nextUrl

  // Dashboard routes require auth
  if (pathname.startsWith('/dashboard') ||
      pathname.startsWith('/providers') ||
      pathname.startsWith('/budget') ||
      pathname.startsWith('/alerts') ||
      pathname.startsWith('/reports') ||
      pathname.startsWith('/projects') ||
      pathname.startsWith('/settings') ||
      pathname.startsWith('/billing')) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // Auth routes redirect to dashboard if already logged in
  if ((pathname === '/login' || pathname === '/signup') && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/providers/:path*',
    '/budget/:path*',
    '/alerts/:path*',
    '/reports/:path*',
    '/projects/:path*',
    '/settings/:path*',
    '/billing/:path*',
    '/login',
    '/signup',
  ],
}
