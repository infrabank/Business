import { NextRequest } from 'next/server'
import { resolveProxyKey } from '@/services/proxy/proxy-key.service'
import { forwardRequest } from '@/services/proxy/proxy-forward.service'
import { checkBudget, buildBudgetExceededResponse } from '@/services/proxy/budget-check.service'
import { checkRateLimit, buildRateLimitResponse } from '@/services/proxy/rate-limiter'
import { detectProvider } from '@/services/proxy/provider-detect.service'
import type { ProviderType } from '@/types/provider'

function extractProxyKey(req: NextRequest): string | null {
  const auth = req.headers.get('authorization')
  if (!auth) return null
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth
  return token.startsWith('lmc_') ? token : null
}

function errorResponse(message: string, type: string, status: number) {
  return new Response(JSON.stringify({ error: { message, type } }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const rawKey = extractProxyKey(req)
  if (!rawKey) {
    return errorResponse('Invalid or missing proxy key. Use Authorization: Bearer lmc_xxx', 'authentication_error', 401)
  }

  const resolved = await resolveProxyKey(rawKey)
  if (!resolved) {
    return errorResponse('Invalid proxy key', 'authentication_error', 401)
  }

  // Rate limit + budget check in parallel
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

  // Determine provider
  let providerType: ProviderType
  if (resolved.providerType === 'auto') {
    if (!body) {
      return errorResponse('Request body required for auto-detect provider mode', 'invalid_request_error', 400)
    }
    const detected = detectProvider(body, path)
    if (!detected) {
      return errorResponse(
        'Cannot detect provider from request. Include a model field (gpt-*, claude-*, gemini-*) or use provider-specific format.',
        'invalid_request_error',
        400,
      )
    }
    providerType = detected

    // Resolve the correct API key for this provider
    if (resolved.providerApiKeys?.[providerType]) {
      resolved.decryptedApiKey = resolved.providerApiKeys[providerType]
    }
  } else {
    providerType = resolved.providerType as ProviderType
  }

  return forwardRequest({
    resolvedKey: resolved,
    path,
    method: 'POST',
    body,
    providerType,
  })
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const rawKey = extractProxyKey(req)
  if (!rawKey) {
    return errorResponse('Invalid or missing proxy key', 'authentication_error', 401)
  }

  const resolved = await resolveProxyKey(rawKey)
  if (!resolved) {
    return errorResponse('Invalid proxy key', 'authentication_error', 401)
  }

  const rateResult = await checkRateLimit(resolved.id, resolved.rateLimit)
  if (!rateResult.allowed) return buildRateLimitResponse(rateResult)

  const { path: pathSegments } = await params
  const path = pathSegments.join('/')

  // For GET requests on auto keys, try to detect from path
  let providerType: ProviderType
  if (resolved.providerType === 'auto') {
    const detected = detectProvider({}, path)
    if (!detected) {
      return errorResponse(
        'Cannot detect provider from GET request path. Use a provider-specific endpoint instead.',
        'invalid_request_error',
        400,
      )
    }
    providerType = detected
    if (resolved.providerApiKeys?.[providerType]) {
      resolved.decryptedApiKey = resolved.providerApiKeys[providerType]
    }
  } else {
    providerType = resolved.providerType as ProviderType
  }

  return forwardRequest({
    resolvedKey: resolved,
    path,
    method: 'GET',
    body: null,
    providerType,
  })
}
