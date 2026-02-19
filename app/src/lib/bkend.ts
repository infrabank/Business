import type { SupabaseClient } from '@supabase/supabase-js'
import {
  getSupabaseBrowserClient,
  getSupabaseServerClient,
  getSupabaseServiceClient,
} from './supabase'

interface BkendRequestOptions {
  token?: string // Kept for backward compat, ignored by Supabase
  params?: Record<string, string>
}

// ---------------------------------------------------------------------------
// Path parsing: /table-name → table, /table-name/id → table + id
// ---------------------------------------------------------------------------
function parsePath(path: string): { table: string; id?: string; subPath?: string } {
  const cleaned = path.replace(/^\//, '')
  const parts = cleaned.split('/')
  const table = parts[0].replace(/-/g, '_')
  return {
    table,
    id: parts[1],
    subPath: parts.length > 2 ? parts.slice(2).join('/') : undefined,
  }
}

// ---------------------------------------------------------------------------
// Apply query params as Supabase filters
//   date_gte → .gte('date', value)
//   effectiveFrom_lte → .lte('effectiveFrom', value)
//   metadata.field → JSONB text extraction
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyParams(query: any, params: Record<string, string>) {
  for (const [key, value] of Object.entries(params)) {
    // Column selection: _select=col1,col2 → .select('col1,col2') instead of SELECT *
    if (key === '_select') continue // handled in supabaseQuery before applyParams

    // Pagination / sorting (bkend-compat)
    if (key === '_limit') {
      query = query.limit(Number(value))
    } else if (key === '_offset') {
      // Supabase range needs (from, to). Applied after _limit if both present.
      const limit = params._limit ? Number(params._limit) : 100
      query = query.range(Number(value), Number(value) + limit - 1)
    } else if (key === '_sort') {
      const desc = value.startsWith('-')
      const col = desc ? value.slice(1) : value
      query = query.order(col, { ascending: !desc })
    } else if (key.endsWith('_gte')) {
      const col = key.slice(0, -4)
      query = query.gte(col, value)
    } else if (key.endsWith('_lte')) {
      const col = key.slice(0, -4)
      query = query.lte(col, value)
    } else if (key.startsWith('metadata.')) {
      const field = key.slice('metadata.'.length)
      query = query.eq(`metadata->>${field}`, value)
    } else {
      query = query.eq(key, value)
    }
  }
  return query
}

// ---------------------------------------------------------------------------
// Context-aware Supabase client selection
//   Browser → browser client (session from cookies automatically)
//   Server + Supabase auth cookies → server client (user-level RLS)
//   Server + no auth cookies → service client (bypasses RLS for cron/webhook)
// ---------------------------------------------------------------------------
async function getClient(service = false): Promise<SupabaseClient> {
  if (service) {
    return getSupabaseServiceClient()
  }
  if (typeof window !== 'undefined') {
    return getSupabaseBrowserClient()
  }
  try {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll()
    const hasSupabaseAuth = allCookies.some(
      (c) => c.name.startsWith('sb-') && c.name.includes('auth-token'),
    )
    if (hasSupabaseAuth) {
      return await getSupabaseServerClient()
    }
    // No Supabase auth cookies — cron job, webhook, or server-to-server call
    return getSupabaseServiceClient()
  } catch {
    return getSupabaseServiceClient()
  }
}

// ---------------------------------------------------------------------------
// Core query executor
// ---------------------------------------------------------------------------
async function supabaseQuery<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  options: BkendRequestOptions & { body?: Record<string, unknown>; service?: boolean } = {},
): Promise<T> {
  const client = await getClient(options.service)
  const { table, id, subPath } = parsePath(path)
  const { body, params } = options

  // Special case: aggregate endpoint (/usage-records/aggregate)
  if (subPath === 'aggregate') {
    let query = client.from(table).select('cost')
    if (params) query = applyParams(query, params)
    const { data, error } = await query
    if (error) throw new Error(error.message)
    const totalCost = (data ?? []).reduce(
      (sum: number, r: Record<string, unknown>) => sum + (Number(r.cost) || 0),
      0,
    )
    return { totalCost } as T
  }

  // Special case: sub-resource (e.g. /api-keys/{id}/secret)
  if (subPath && id) {
    const { data, error } = await client.from(table).select('*').eq('id', id).single()
    if (error) throw new Error(error.message)
    return data as T
  }

  switch (method) {
    case 'GET': {
      const selectCols = params?._select || '*'
      if (id) {
        const { data, error } = await client.from(table).select(selectCols).eq('id', id).single()
        if (error) throw new Error(error.message)
        return data as T
      }
      let query = client.from(table).select(selectCols)
      if (params) query = applyParams(query, params)
      const { data, error } = await query
      if (error) throw new Error(error.message)
      return (data ?? []) as T
    }
    case 'POST': {
      const { data, error } = await client.from(table).insert(body!).select().single()
      if (error) throw new Error(error.message)
      return data as T
    }
    case 'PUT':
    case 'PATCH': {
      if (!id) throw new Error(`${method} requires an ID in path: ${path}`)
      const { data, error } = await client.from(table).update(body!).eq('id', id).select().single()
      if (error) throw new Error(error.message)
      return data as T
    }
    case 'DELETE': {
      if (!id) throw new Error(`DELETE requires an ID in path: ${path}`)
      const { error } = await client.from(table).delete().eq('id', id)
      if (error) throw new Error(error.message)
      return {} as T
    }
  }
}

// ---------------------------------------------------------------------------
// Public API (same interface as before)
// ---------------------------------------------------------------------------
export const bkend = {
  get: <T>(path: string, options?: BkendRequestOptions) =>
    supabaseQuery<T>('GET', path, options),

  post: <T>(path: string, body: Record<string, unknown>, options?: BkendRequestOptions) =>
    supabaseQuery<T>('POST', path, { ...options, body }),

  put: <T>(path: string, body: Record<string, unknown>, options?: BkendRequestOptions) =>
    supabaseQuery<T>('PUT', path, { ...options, body }),

  patch: <T>(path: string, body: Record<string, unknown>, options?: BkendRequestOptions) =>
    supabaseQuery<T>('PATCH', path, { ...options, body }),

  delete: <T>(path: string, options?: BkendRequestOptions) =>
    supabaseQuery<T>('DELETE', path, options),
}

// Service-level client (for webhooks — bypasses RLS)
export const bkendService = {
  get: <T>(path: string, options?: BkendRequestOptions) =>
    supabaseQuery<T>('GET', path, { ...options, service: true }),

  post: <T>(path: string, body: Record<string, unknown>, options?: BkendRequestOptions) =>
    supabaseQuery<T>('POST', path, { ...options, body, service: true }),

  put: <T>(path: string, body: Record<string, unknown>, options?: BkendRequestOptions) =>
    supabaseQuery<T>('PUT', path, { ...options, body, service: true }),

  patch: <T>(path: string, body: Record<string, unknown>, options?: BkendRequestOptions) =>
    supabaseQuery<T>('PATCH', path, { ...options, body, service: true }),

  delete: <T>(path: string, options?: BkendRequestOptions) =>
    supabaseQuery<T>('DELETE', path, { ...options, service: true }),

  rpc: async <T>(fnName: string, params: Record<string, unknown> = {}): Promise<T> => {
    const client = await getClient(true)
    const { data, error } = await client.rpc(fnName, params)
    if (error) throw new Error(error.message)
    return data as T
  },
}
