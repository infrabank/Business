import { bkendService } from '@/lib/bkend'
import { extractTokensFromJson, extractTokensFromSSEChunks, mergeAnthropicStreamTokens } from './token-counter'
import { incrementRequestCount } from './proxy-key.service'
import { incrementBudgetSpend } from './budget-check.service'
import { checkBudgetAlerts } from './budget-alert.service'
import { routeModel, calculateRoutingSavings } from './model-router.service'
import { buildCacheKey, getCachedResponse, setCachedResponse, getNormalizedCachedResponse, setNormalizedMapping } from './cache.service'
import { buildNormalizedCacheKey, findSemanticMatch, storeSemanticEntry } from './semantic-cache.service'
import { isRetryableError, getFallbackProviders, getEquivalentModel, transformRequestBody, getRetryDelay, sleep } from './fallback.service'
import { runGuardrails, buildGuardrailBlockedResponse } from './guardrails.service'
import type { GuardrailConfig } from './guardrails.service'
import { computeCost } from '@/services/pricing.service'
import type { ProviderType } from '@/types/provider'
import type { ResolvedProxyKey } from '@/types/proxy'

interface ProviderConfig {
  baseUrl: string
  buildHeaders: (apiKey: string) => Record<string, string>
  isStreaming: (body: Record<string, unknown>, url: URL) => boolean
  injectStreamUsage?: (body: Record<string, unknown>) => Record<string, unknown>
}

const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
  openai: {
    baseUrl: 'https://api.openai.com',
    buildHeaders: (apiKey) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    }),
    isStreaming: (body) => body.stream === true,
    injectStreamUsage: (body) => ({
      ...body,
      stream_options: { ...(body.stream_options as Record<string, unknown> || {}), include_usage: true },
    }),
  },
  anthropic: {
    baseUrl: 'https://api.anthropic.com',
    buildHeaders: (apiKey) => ({
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
    }),
    isStreaming: (body) => body.stream === true,
  },
  google: {
    baseUrl: 'https://generativelanguage.googleapis.com',
    buildHeaders: () => ({
      'Content-Type': 'application/json',
    }),
    isStreaming: (_body, url) => url.searchParams.get('alt') === 'sse',
  },
  azure: {
    baseUrl: '', // Dynamic: parsed from apiKey (endpoint|key format)
    buildHeaders: (apiKey) => ({
      'api-key': apiKey,
      'Content-Type': 'application/json',
    }),
    isStreaming: (body) => body.stream === true,
    injectStreamUsage: (body) => ({
      ...body,
      stream_options: { ...(body.stream_options as Record<string, unknown> || {}), include_usage: true },
    }),
  },
}

export function getProviderConfig(providerType: ProviderType): ProviderConfig | null {
  return PROVIDER_CONFIGS[providerType] ?? null
}

export async function forwardRequest(params: {
  resolvedKey: ResolvedProxyKey
  path: string
  method: string
  body: Record<string, unknown> | null
  providerType: ProviderType
}): Promise<Response> {
  const { resolvedKey, path, method, body, providerType } = params
  const config = getProviderConfig(providerType)
  if (!config) {
    return new Response(JSON.stringify({ error: `Unsupported provider: ${providerType}` }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Build target URL
  let targetUrl: URL
  if (providerType === 'google') {
    targetUrl = new URL(`${config.baseUrl}/${path}`)
    targetUrl.searchParams.set('key', resolvedKey.decryptedApiKey)
  } else {
    targetUrl = new URL(`${config.baseUrl}/${path}`)
  }

  // Step 1: Model Routing
  let finalBody = body
  let wasRouted = false
  let originalModel: string | null = null
  let routedModel: string | null = null

  let routingDecisionData: { intent: string; confidence: number; reason: string; wasRouted: boolean } | null = null

  if (resolvedKey.enableModelRouting && body && body.model && typeof body.model === 'string') {
    const routingResult = await routeModel(
      body.model,
      body,
      resolvedKey.enableModelRouting,
      resolvedKey.routingMode,
      resolvedKey.routingRules,
    )
    routingDecisionData = {
      intent: routingResult.intent ?? 'unknown',
      confidence: 0,
      reason: routingResult.reason,
      wasRouted: routingResult.wasRouted,
    }
    if (routingResult.wasRouted) {
      wasRouted = true
      originalModel = routingResult.originalModel
      routedModel = routingResult.routedModel
      finalBody = { ...body, model: routedModel }
    }
  }

  // Determine if streaming
  const isStream = finalBody ? config.isStreaming(finalBody, targetUrl) : false

  // Step 1.5: Guardrails check (before cache to catch blocked content)
  if (finalBody) {
    const guardrailConfig: GuardrailConfig = {
      enablePiiMasking: resolvedKey.enableCache, // PII masking when cache is on (prevents PII in cache)
      enableKeywordBlock: true, // Always check for prompt injection
    }
    const guardrailResult = await runGuardrails(finalBody, guardrailConfig)
    if (!guardrailResult.allowed) {
      return buildGuardrailBlockedResponse(guardrailResult.reason || 'Request blocked by guardrails')
    }
    if (guardrailResult.modified && guardrailResult.maskedBody) {
      finalBody = guardrailResult.maskedBody
    }
  }

  // Step 2: Multi-level Cache Check (only for non-streaming)
  if (resolvedKey.enableCache && !isStream && finalBody) {
    const currentModel = (finalBody.model as string) || 'unknown'

    // Level 1: Exact match
    const cacheKey = buildCacheKey(providerType, currentModel, finalBody)
    let cachedEntry = await getCachedResponse(cacheKey)
    let cacheLevel: 'exact' | 'normalized' | 'semantic' = 'exact'

    // Level 2: Normalized match (catches formatting differences)
    if (!cachedEntry) {
      const normalizedKey = buildNormalizedCacheKey(providerType, currentModel, finalBody)
      cachedEntry = await getNormalizedCachedResponse(normalizedKey)
      if (cachedEntry) cacheLevel = 'normalized'
    }

    // Level 3: Semantic similarity match
    let semanticSimilarity = 0
    if (!cachedEntry) {
      const semanticResult = await findSemanticMatch(providerType, currentModel, finalBody)
      if (semanticResult) {
        cachedEntry = semanticResult.entry
        semanticSimilarity = semanticResult.similarity
        cacheLevel = 'semantic'
      }
    }

    if (cachedEntry) {
      // Cache HIT (any level) - return immediately
      const totalTokens = cachedEntry.inputTokens + cachedEntry.outputTokens
      logProxyRequest({
        orgId: resolvedKey.orgId,
        proxyKeyId: resolvedKey.id,
        providerType,
        model: currentModel,
        path,
        statusCode: 200,
        inputTokens: cachedEntry.inputTokens,
        outputTokens: cachedEntry.outputTokens,
        totalTokens,
        cost: cachedEntry.cost,
        latencyMs: 0,
        isStreaming: false,
        errorMessage: null,
        cacheHit: true,
        savedAmount: cachedEntry.cost,
        originalModel: wasRouted ? originalModel : null,
        originalCost: cachedEntry.cost,
        routingDecision: routingDecisionData,
      })

      incrementRequestCount(resolvedKey.id)
      incrementBudgetSpend(resolvedKey.id, cachedEntry.cost).catch(() => {})
      if (resolvedKey.budgetAlertsEnabled && resolvedKey.budgetLimit) {
        checkBudgetAlerts(resolvedKey.id, resolvedKey.orgId, cachedEntry.cost, resolvedKey.budgetLimit, resolvedKey.budgetAlertThresholds).catch(() => {})
      }

      return new Response(cachedEntry.responseBody, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'x-cache': 'HIT',
          'x-cache-level': cacheLevel,
          ...(cacheLevel === 'semantic' ? { 'x-cache-similarity': String(semanticSimilarity.toFixed(3)) } : {}),
          'x-proxy-latency-ms': '0',
        },
      })
    }
  }

  // Inject stream_options for OpenAI streaming
  if (isStream && config.injectStreamUsage && finalBody) {
    finalBody = config.injectStreamUsage(finalBody)
  }

  // Build headers
  const headers = config.buildHeaders(resolvedKey.decryptedApiKey)

  // Record start time
  const startTime = Date.now()

  // Forward request
  let upstreamResponse = await fetch(targetUrl.toString(), {
    method,
    headers,
    body: finalBody ? JSON.stringify(finalBody) : undefined,
  })

  let latencyMs = Date.now() - startTime
  let fallbackUsed: { provider: ProviderType; model: string } | null = null

  // Fallback: if upstream fails with retryable error, try other providers
  if (!upstreamResponse.ok && isRetryableError(upstreamResponse.status) && finalBody) {
    const fallbackProviders = getFallbackProviders(providerType, resolvedKey)
    const originalRequestModel = (finalBody.model as string) || 'unknown'

    for (let i = 0; i < fallbackProviders.length; i++) {
      const fbProvider = fallbackProviders[i]
      const fbModel = getEquivalentModel(originalRequestModel, fbProvider)
      if (!fbModel) continue

      const fbConfig = getProviderConfig(fbProvider)
      if (!fbConfig) continue

      // Get the API key for the fallback provider
      const fbApiKey = resolvedKey.providerApiKeys?.[fbProvider]
      if (!fbApiKey) continue

      await sleep(getRetryDelay(i))

      // Transform request body for the fallback provider
      const fbBody = transformRequestBody(finalBody, providerType, fbProvider, fbModel)

      // Build fallback URL and headers
      let fbUrl: URL
      if (fbProvider === 'google') {
        // Google uses a different path structure
        fbUrl = new URL(`${fbConfig.baseUrl}/v1beta/models/${fbModel}:generateContent`)
        fbUrl.searchParams.set('key', fbApiKey)
      } else if (fbProvider === 'openai') {
        fbUrl = new URL(`${fbConfig.baseUrl}/v1/chat/completions`)
      } else {
        fbUrl = new URL(`${fbConfig.baseUrl}/v1/messages`)
      }
      const fbHeaders = fbConfig.buildHeaders(fbApiKey)

      try {
        const fbResponse = await fetch(fbUrl.toString(), {
          method: 'POST',
          headers: fbHeaders,
          body: JSON.stringify(fbBody),
        })

        if (fbResponse.ok) {
          upstreamResponse = fbResponse
          latencyMs = Date.now() - startTime
          fallbackUsed = { provider: fbProvider, model: fbModel }
          break
        }
      } catch {
        // Continue to next fallback
      }
    }
  }

  if (isStream && upstreamResponse.ok && upstreamResponse.body) {
    return handleStreamingResponse({
      upstreamResponse,
      resolvedKey,
      providerType: fallbackUsed?.provider || providerType,
      path,
      startTime,
      latencyMs,
      requestModel: fallbackUsed?.model || (finalBody?.model as string) || 'unknown',
      wasRouted: wasRouted || !!fallbackUsed,
      originalModel: fallbackUsed ? (finalBody?.model as string) || originalModel : originalModel,
      routingDecision: routingDecisionData,
    })
  }

  // Non-streaming response
  const responseBody = await upstreamResponse.json()
  const totalLatency = Date.now() - startTime

  // Extract tokens and log asynchronously
  const tokens = extractTokensFromJson(responseBody, providerType)
  const model = tokens.model !== 'unknown' ? tokens.model : (finalBody?.model as string) || 'unknown'
  const cost = computeCost(model, tokens.inputTokens, tokens.outputTokens)

  // Step 3: Store in cache (exact + normalized + semantic index)
  if (resolvedKey.enableCache && upstreamResponse.ok && finalBody) {
    const cacheKey = buildCacheKey(providerType, model, finalBody)
    const ttlSeconds = resolvedKey.cacheTtl ?? undefined
    const cacheEntry = {
      responseBody: JSON.stringify(responseBody),
      model,
      inputTokens: tokens.inputTokens,
      outputTokens: tokens.outputTokens,
      cost,
      ttlSeconds: ttlSeconds ?? 3600,
    }

    // Level 1: Store exact cache
    setCachedResponse(cacheKey, cacheEntry, ttlSeconds)

    // Level 2: Store normalized mapping → exact key
    const normalizedKey = buildNormalizedCacheKey(providerType, model, finalBody)
    if (normalizedKey !== cacheKey) {
      setNormalizedMapping(normalizedKey, cacheKey, {
        ...cacheEntry,
        timestamp: Date.now(),
      }, ttlSeconds).catch(() => {})
    }

    // Level 3: Store semantic index entry
    storeSemanticEntry(providerType, model, finalBody, cacheKey).catch(() => {})
  }

  // Step 4: Calculate savings
  let savedAmount = 0
  if (wasRouted && originalModel && routedModel) {
    savedAmount = calculateRoutingSavings(
      originalModel,
      routedModel,
      tokens.inputTokens,
      tokens.outputTokens
    )
  }

  // Calculate original cost (what it would cost without optimizations)
  let originalCost = cost
  if (wasRouted && originalModel) {
    originalCost = computeCost(originalModel, tokens.inputTokens, tokens.outputTokens)
  }

  logProxyRequest({
    orgId: resolvedKey.orgId,
    proxyKeyId: resolvedKey.id,
    providerType,
    model,
    path,
    statusCode: upstreamResponse.status,
    inputTokens: tokens.inputTokens,
    outputTokens: tokens.outputTokens,
    totalTokens: tokens.totalTokens,
    cost,
    latencyMs: totalLatency,
    isStreaming: false,
    errorMessage: upstreamResponse.ok ? null : JSON.stringify(responseBody),
    cacheHit: false,
    savedAmount,
    originalModel: wasRouted ? originalModel : null,
    originalCost,
    routingDecision: routingDecisionData,
  })

  // Increment request count + budget spend
  incrementRequestCount(resolvedKey.id)
  incrementBudgetSpend(resolvedKey.id, cost).catch(() => {})
  if (resolvedKey.budgetAlertsEnabled && resolvedKey.budgetLimit) {
    checkBudgetAlerts(resolvedKey.id, resolvedKey.orgId, cost, resolvedKey.budgetLimit, resolvedKey.budgetAlertThresholds).catch(() => {})
  }

  return new Response(JSON.stringify(responseBody), {
    status: upstreamResponse.status,
    headers: {
      'Content-Type': 'application/json',
      'x-cache': 'MISS',
      'x-proxy-latency-ms': String(totalLatency),
      ...(fallbackUsed ? {
        'x-fallback-provider': fallbackUsed.provider,
        'x-fallback-model': fallbackUsed.model,
      } : {}),
    },
  })
}

function handleStreamingResponse(params: {
  upstreamResponse: Response
  resolvedKey: ResolvedProxyKey
  providerType: ProviderType
  path: string
  startTime: number
  latencyMs: number
  requestModel: string
  wasRouted: boolean
  originalModel: string | null
  routingDecision: { intent: string; confidence: number; reason: string; wasRouted: boolean } | null
}): Response {
  const { upstreamResponse, resolvedKey, providerType, path, startTime, requestModel, wasRouted, originalModel, routingDecision } = params

  const chunks: string[] = []
  const reader = upstreamResponse.body!.getReader()
  const decoder = new TextDecoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          // Pass through to client immediately
          controller.enqueue(value)

          // Accumulate for token counting
          const text = decoder.decode(value, { stream: true })
          chunks.push(text)
        }
        controller.close()

        // After stream completes, extract tokens and log
        const totalLatency = Date.now() - startTime
        let tokens
        if (providerType === 'anthropic') {
          tokens = mergeAnthropicStreamTokens(chunks)
        } else {
          tokens = extractTokensFromSSEChunks(chunks, providerType)
        }
        const model = tokens.model !== 'unknown' ? tokens.model : requestModel
        const cost = computeCost(model, tokens.inputTokens, tokens.outputTokens)

        // Calculate savings for routed models
        let savedAmount = 0
        if (wasRouted && originalModel) {
          savedAmount = calculateRoutingSavings(
            originalModel,
            model,
            tokens.inputTokens,
            tokens.outputTokens
          )
        }

        // Calculate original cost (what it would cost without optimizations)
        let originalCost = cost
        if (wasRouted && originalModel) {
          originalCost = computeCost(originalModel, tokens.inputTokens, tokens.outputTokens)
        }

        logProxyRequest({
          orgId: resolvedKey.orgId,
          proxyKeyId: resolvedKey.id,
          providerType,
          model,
          path,
          statusCode: upstreamResponse.status,
          inputTokens: tokens.inputTokens,
          outputTokens: tokens.outputTokens,
          totalTokens: tokens.totalTokens,
          cost,
          latencyMs: totalLatency,
          isStreaming: true,
          errorMessage: null,
          cacheHit: false,
          savedAmount,
          originalModel: wasRouted ? originalModel : null,
          originalCost,
          routingDecision,
        })

        incrementRequestCount(resolvedKey.id)
        incrementBudgetSpend(resolvedKey.id, cost).catch(() => {})
        if (resolvedKey.budgetAlertsEnabled && resolvedKey.budgetLimit) {
          checkBudgetAlerts(resolvedKey.id, resolvedKey.orgId, cost, resolvedKey.budgetLimit, resolvedKey.budgetAlertThresholds).catch(() => {})
        }
      } catch (err) {
        controller.error(err)
      }
    },
  })

  return new Response(stream, {
    status: upstreamResponse.status,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'x-proxy-latency-ms': String(params.latencyMs),
    },
  })
}

// Fire-and-forget logging
function logProxyRequest(data: {
  orgId: string
  proxyKeyId: string
  providerType: ProviderType | string
  model: string
  path: string
  statusCode: number
  inputTokens: number
  outputTokens: number
  totalTokens: number
  cost: number
  latencyMs: number
  isStreaming: boolean
  errorMessage: string | null
  cacheHit: boolean
  savedAmount: number
  originalModel: string | null
  originalCost: number
  routingDecision: { intent: string; confidence: number; reason: string; wasRouted: boolean } | null
}): void {
  // Separate originalCost to avoid insert failure if column doesn't exist yet
  const { originalCost, ...coreData } = data
  bkendService.post('/proxy-logs', coreData as unknown as Record<string, unknown>).catch(() => {
    // Logging failure should not impact the proxy response
  })
  // Try to update originalCost separately (will silently fail if column doesn't exist)
  if (originalCost > 0) {
    // Attempt insert with originalCost via a second call if the column exists
    // For now, originalCost is tracked in savedAmount (originalCost ≈ cost + savedAmount)
  }
}
