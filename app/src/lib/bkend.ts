const BKEND_URL = process.env.NEXT_PUBLIC_BKEND_PROJECT_URL || ''
const BKEND_API_KEY = process.env.BKEND_API_KEY || ''

interface BkendRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: Record<string, unknown>
  token?: string
  params?: Record<string, string>
}

async function bkendFetch<T>(path: string, options: BkendRequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token, params } = options

  const url = new URL(`${BKEND_URL}${path}`)
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': BKEND_API_KEY,
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

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
