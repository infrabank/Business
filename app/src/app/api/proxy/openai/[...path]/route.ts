import { NextRequest } from 'next/server'
import { resolveProxyKey } from '@/services/proxy/proxy-key.service'
import { forwardRequest } from '@/services/proxy/proxy-forward.service'
import { checkBudget, buildBudgetExceededResponse } from '@/services/proxy/budget-check.service'
import { checkRateLimit, buildRateLimitResponse } from '@/services/proxy/rate-limiter'

const PROVIDER_TYPE = 'openai' as const

function extractProxyKey(req: NextRequest): string | null {
  const auth = req.headers.get('authorization')
  if (!auth) return null
  // Support both "Bearer lmc_xxx" and plain "lmc_xxx"
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth
  return token.startsWith('lmc_') ? token : null
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const rawKey = extractProxyKey(req)
  if (!rawKey) {
    return new Response(JSON.stringify({ error: { message: 'Invalid or missing proxy key. Use Authorization: Bearer lmc_xxx', type: 'authentication_error' } }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const resolved = await resolveProxyKey(rawKey)
  if (!resolved) {
    return new Response(JSON.stringify({ error: { message: 'Invalid proxy key', type: 'authentication_error' } }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (resolved.providerType !== PROVIDER_TYPE) {
    return new Response(JSON.stringify({ error: { message: `This key is for ${resolved.providerType}, not ${PROVIDER_TYPE}`, type: 'invalid_request_error' } }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Rate limit check
  const [rateResult, budgetResult] = await Promise.all([
    checkRateLimit(resolved.id, resolved.rateLimit),
    checkBudget(resolved.orgId, resolved.id, resolved.budgetLimit),
  ])
  if (!rateResult.allowed) return buildRateLimitResponse(rateResult)
  if (!budgetResult.allowed) return buildBudgetExceededResponse(budgetResult)

  const { path: pathSegments } = await params
  const path = pathSegments.join('/')
  let body: Record<string, unknown> | null = null
  try {
    body = await req.json()
  } catch {
    // No body or invalid JSON
  }

  return forwardRequest({
    resolvedKey: resolved,
    path,
    method: 'POST',
    body,
    providerType: PROVIDER_TYPE,
  })
}

// Support GET for some endpoints (models list, etc.)
export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const rawKey = extractProxyKey(req)
  if (!rawKey) {
    return new Response(JSON.stringify({ error: { message: 'Invalid or missing proxy key', type: 'authentication_error' } }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const resolved = await resolveProxyKey(rawKey)
  if (!resolved || resolved.providerType !== PROVIDER_TYPE) {
    return new Response(JSON.stringify({ error: { message: 'Invalid proxy key', type: 'authentication_error' } }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const rateResult = await checkRateLimit(resolved.id, resolved.rateLimit)
  if (!rateResult.allowed) return buildRateLimitResponse(rateResult)

  const { path: pathSegments } = await params
  const path = pathSegments.join('/')

  return forwardRequest({
    resolvedKey: resolved,
    path,
    method: 'GET',
    body: null,
    providerType: PROVIDER_TYPE,
  })
}
