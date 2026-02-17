import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Skip auth for proxy API routes (they use proxy key auth)
  if (request.nextUrl.pathname.startsWith('/api/proxy/')) {
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Refresh session (important for keeping auth alive)
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Protected routes require auth
  const protectedPaths = [
    '/dashboard', '/providers', '/budget', '/alerts',
    '/reports', '/projects', '/settings', '/billing', '/proxy', '/team',
    '/analytics',
  ]
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p))

  if (isProtected && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Auth routes redirect to dashboard if already logged in
  if ((pathname === '/login' || pathname === '/signup') && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
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
    '/proxy/:path*',
    '/team/:path*',
    '/api/proxy/:path*',
    '/analytics/:path*',
    '/login',
    '/signup',
  ],
}
