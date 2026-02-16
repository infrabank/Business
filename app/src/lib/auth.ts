import { getSupabaseBrowserClient, getSupabaseServerClient } from './supabase'

interface AuthTokens {
  accessToken: string
  refreshToken: string
}

interface AuthUser {
  id: string
  email: string
  name: string
}

export async function signup(email: string, password: string, name: string): Promise<AuthTokens> {
  // Step 1: Create confirmed user via server API (bypasses email confirmation)
  const res = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  })

  if (!res.ok) {
    const { error } = await res.json()
    throw new Error(error || 'Signup failed')
  }

  // Step 2: Sign in to get session cookies
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)

  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
  }
}

export async function login(email: string, password: string): Promise<AuthTokens> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)
  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
  }
}

export async function refreshToken(_token: string): Promise<AuthTokens> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase.auth.refreshSession()
  if (error) throw new Error(error.message)
  if (!data.session) throw new Error('Token refresh failed')
  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
  }
}

// Client-side: get current user from Supabase session
export async function getMe(_token?: string): Promise<AuthUser> {
  const supabase = getSupabaseBrowserClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Not authenticated')
  return {
    id: user.id,
    email: user.email!,
    name: user.user_metadata?.name || user.email?.split('@')[0] || '',
  }
}

// Server-side: get current user from request cookies
export async function getMeServer(): Promise<AuthUser> {
  const supabase = await getSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Not authenticated')
  return {
    id: user.id,
    email: user.email!,
    name: user.user_metadata?.name || user.email?.split('@')[0] || '',
  }
}

export function getTokenFromCookie(): string | null {
  if (typeof window === 'undefined') return null
  // Check for Supabase auth cookies (sb-{ref}-auth-token)
  const cookies = document.cookie
  if (cookies.includes('sb-') && cookies.includes('-auth-token')) {
    return 'supabase-session'
  }
  return null
}

export function setAuthCookies(_tokens: AuthTokens): void {
  // Supabase manages cookies automatically - no-op for backward compat
}

export function clearAuthCookies(): void {
  // Sign out via Supabase to clear session cookies
  if (typeof window !== 'undefined') {
    const supabase = getSupabaseBrowserClient()
    supabase.auth.signOut()
  }
}
