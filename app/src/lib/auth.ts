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
  return bkend.post<AuthTokens>('/auth/signup', { email, password, name })
}

export async function login(email: string, password: string): Promise<AuthTokens> {
  return bkend.post<AuthTokens>('/auth/login', { email, password })
}

export async function refreshToken(token: string): Promise<AuthTokens> {
  return bkend.post<AuthTokens>('/auth/refresh', { refreshToken: token })
}

export async function getMe(token: string): Promise<AuthUser> {
  return bkend.get<AuthUser>('/auth/me', { token })
}

export function getTokenFromCookie(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(?:^|; )access_token=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : null
}

export function setAuthCookies(tokens: AuthTokens): void {
  const maxAge = 60 * 60 // 1 hour
  document.cookie = `access_token=${tokens.accessToken}; path=/; max-age=${maxAge}; SameSite=Lax`
  document.cookie = `refresh_token=${tokens.refreshToken}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`
}

export function clearAuthCookies(): void {
  document.cookie = 'access_token=; path=/; max-age=0'
  document.cookie = 'refresh_token=; path=/; max-age=0'
}
