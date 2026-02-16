import { bkend } from './bkend'

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
  return bkend.post<AuthTokens>('/v1/auth/email/signup', { method: 'password', email, password, name })
}

export async function login(email: string, password: string): Promise<AuthTokens> {
  return bkend.post<AuthTokens>('/v1/auth/email/signin', { method: 'password', email, password })
}

export async function refreshToken(token: string): Promise<AuthTokens> {
  return bkend.post<AuthTokens>('/v1/auth/refresh', { refreshToken: token })
}

export async function getMe(token: string): Promise<AuthUser> {
  return bkend.get<AuthUser>('/v1/auth/me', { token })
}

export function getTokenFromCookie(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(?:^|; )access_token=([^;]*)/)
  const cookieToken = match ? decodeURIComponent(match[1]) : null
  // Fallback to localStorage if cookie not found
  if (!cookieToken && typeof window !== 'undefined') {
    return localStorage.getItem('access_token')
  }
  return cookieToken
}

export function setAuthCookies(tokens: AuthTokens): void {
  const maxAge = 60 * 60 // 1 hour
  document.cookie = `access_token=${tokens.accessToken}; path=/; max-age=${maxAge}; SameSite=Lax`
  document.cookie = `refresh_token=${tokens.refreshToken}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`
  // Also store in localStorage for bkend.ts auto-refresh
  if (typeof window !== 'undefined') {
    localStorage.setItem('access_token', tokens.accessToken)
    localStorage.setItem('refresh_token', tokens.refreshToken)
  }
}

export function clearAuthCookies(): void {
  document.cookie = 'access_token=; path=/; max-age=0'
  document.cookie = 'refresh_token=; path=/; max-age=0'
  // Also clear localStorage tokens
  if (typeof window !== 'undefined') {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
  }
}
