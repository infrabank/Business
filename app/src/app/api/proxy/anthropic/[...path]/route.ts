import { NextRequest } from 'next/server'
import { resolveProxyKey } from '@/services/proxy/proxy-key.service'
import { forwardRequest } from '@/services/proxy/proxy-forward.service'
import { checkBudget, buildBudgetExceededResponse } from '@/services/proxy/budget-check.service'
import { checkRateLimit, buildRateLimitResponse } from '@/services/proxy/rate-limiter'

const PROVIDER_TYPE = 'anthropic' as const

function extractProxyKey(req: NextRequest): string | null {
  // Anthropic clients may use x-api-key header
  const xApiKey = req.headers.get('x-api-key')
  if (xApiKey?.startsWith('lmc_')) return xApiKey

  const auth = req.headers.get('authorization')
  if (!auth) return null
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth
  return token.startsWith('lmc_') ? token : null
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const rawKey = extractProxyKey(req)
  if (!rawKey) {
    return new Response(JSON.stringify({ error: { message: 'Invalid or missing proxy key', type: 'authentication_error' } }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    })
  }

  const resolved = await resolveProxyKey(rawKey)
  if (!resolved) {
    return new Response(JSON.stringify({ error: { message: 'Invalid proxy key', type: 'authentication_error' } }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    })
  }

  if (resolved.providerType !== PROVIDER_TYPE) {
    return new Response(JSON.stringify({ error: { message: `This key is for ${resolved.providerType}, not ${PROVIDER_TYPE}`, type: 'invalid_request_error' } }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    })
  }

  const rateResult = checkRateLimit(resolved.id, resolved.rateLimit)
  if (!rateResult.allowed) return buildRateLimitResponse(rateResult)

  const budgetResult = await checkBudget(resolved.orgId, resolved.id, resolved.budgetLimit)
  if (!budgetResult.allowed) return buildBudgetExceededResponse(budgetResult)

  const { path: pathSegments } = await params
  const path = pathSegments.join('/')
  let body: Record<string, unknown> | null = null
  try { body = await req.json() } catch {}

  return forwardRequest({ resolvedKey: resolved, path, method: 'POST', body, providerType: PROVIDER_TYPE })
}
