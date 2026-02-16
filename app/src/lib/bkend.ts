const BKEND_API_URL = process.env.NEXT_PUBLIC_BKEND_API_URL || 'https://api.bkend.ai'
const BKEND_PROJECT_ID = process.env.NEXT_PUBLIC_BKEND_PROJECT_ID || ''
const BKEND_ENVIRONMENT = process.env.NEXT_PUBLIC_BKEND_ENVIRONMENT || 'dev'

interface BkendRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: Record<string, unknown>
  token?: string
  params?: Record<string, string>
}

// Token storage helpers (SSR-safe)
function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('access_token')
}

function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('refresh_token')
}

function setTokens(accessToken: string, refreshToken: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('access_token', accessToken)
  localStorage.setItem('refresh_token', refreshToken)
}

// Refresh token and retry logic
async function refreshTokenAndRetry<T>(
  path: string,
  options: BkendRequestOptions
): Promise<T> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) {
    throw new Error('No refresh token available')
  }

  // Call refresh endpoint
  const refreshRes = await fetch(`${BKEND_API_URL}/v1/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Project-Id': BKEND_PROJECT_ID,
      'X-Environment': BKEND_ENVIRONMENT,
    },
    body: JSON.stringify({ refreshToken }),
  })

  if (!refreshRes.ok) {
    // Refresh failed - clear tokens
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
    }
    throw new Error('Token refresh failed - please login again')
  }

  const { accessToken, refreshToken: newRefreshToken } = await refreshRes.json()
  setTokens(accessToken, newRefreshToken)

  // Retry original request with new token (isRetry=true to prevent infinite loop)
  return bkendFetch<T>(path, { ...options, token: accessToken }, true)
}

async function bkendFetch<T>(
  path: string,
  options: BkendRequestOptions = {},
  isRetry = false
): Promise<T> {
  const { method = 'GET', body, token, params } = options

  // Construct URL
  const url = new URL(`${BKEND_API_URL}${path}`)
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  }

  // Required headers on every request
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Project-Id': BKEND_PROJECT_ID,
    'X-Environment': BKEND_ENVIRONMENT,
  }

  // Add authorization header if token provided or available in storage
  const authToken = token || getAccessToken()
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`
  }

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  // Handle 401 - auto refresh and retry ONCE
  if (res.status === 401 && !isRetry && getRefreshToken()) {
    return refreshTokenAndRetry<T>(path, options)
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(error.message || `bkend request failed: ${res.status}`)
  }

  return res.json()
}

export const bkend = {
  get: <T>(path: string, options?: Omit<BkendRequestOptions, 'method' | 'body'>) =>
    bkendFetch<T>(path, { ...options, method: 'GET' }),

  post: <T>(path: string, body: Record<string, unknown>, options?: Omit<BkendRequestOptions, 'method' | 'body'>) =>
    bkendFetch<T>(path, { ...options, method: 'POST', body }),

  put: <T>(path: string, body: Record<string, unknown>, options?: Omit<BkendRequestOptions, 'method' | 'body'>) =>
    bkendFetch<T>(path, { ...options, method: 'PUT', body }),

  patch: <T>(path: string, body: Record<string, unknown>, options?: Omit<BkendRequestOptions, 'method' | 'body'>) =>
    bkendFetch<T>(path, { ...options, method: 'PATCH', body }),

  delete: <T>(path: string, options?: Omit<BkendRequestOptions, 'method' | 'body'>) =>
    bkendFetch<T>(path, { ...options, method: 'DELETE' }),
}
