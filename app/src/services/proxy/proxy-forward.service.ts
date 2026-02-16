import { bkendService } from '@/lib/bkend'
import { extractTokensFromJson, extractTokensFromSSEChunks, mergeAnthropicStreamTokens } from './token-counter'
import { incrementRequestCount } from './proxy-key.service'
import { routeModel, calculateRoutingSavings } from './model-router.service'
import { buildCacheKey, getCachedResponse, setCachedResponse } from './cache.service'
import type { ProviderType } from '@/types/provider'
import type { ResolvedProxyKey } from '@/types/proxy'

// Re-export calculateCost from pricing.service for convenience
// We use a local FALLBACK_PRICING copy to avoid async DB lookup in hot path
const PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 2.5, output: 10 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4-turbo': { input: 10, output: 30 },
  'o1': { input: 15, output: 60 },
  'o1-mini': { input: 3, output: 12 },
  'o3-mini': { input: 1.1, output: 4.4 },
  'claude-opus-4-6': { input: 15, output: 75 },
  'claude-sonnet-4-5': { input: 3, output: 15 },
  'claude-haiku-4-5': { input: 0.8, output: 4 },
  'gemini-2.0-flash': { input: 0.1, output: 0.4 },
  'gemini-2.0-pro': { input: 1.25, output: 5 },
  'gemini-1.5-pro': { input: 1.25, output: 5 },
  'gemini-1.5-flash': { input: 0.075, output: 0.3 },
}

function computeCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = PRICING[model] ?? { input: 1, output: 2 }
  return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000
}

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

  if (resolvedKey.enableModelRouting && body && body.model && typeof body.model === 'string') {
    const routingResult = routeModel(body.model, body, resolvedKey.enableModelRouting)
    if (routingResult.wasRouted) {
      wasRouted = true
      originalModel = routingResult.originalModel
      routedModel = routingResult.routedModel
      finalBody = { ...body, model: routedModel }
    }
  }

  // Determine if streaming
  const isStream = finalBody ? config.isStreaming(finalBody, targetUrl) : false

  // Step 2: Cache Check (only for non-streaming)
  if (resolvedKey.enableCache && !isStream && finalBody) {
    const currentModel = (finalBody.model as string) || 'unknown'
    const cacheKey = buildCacheKey(providerType, currentModel, finalBody)
    const cachedEntry = await getCachedResponse(cacheKey)

    if (cachedEntry) {
      // Cache HIT - return immediately
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
      })

      incrementRequestCount(resolvedKey.id)

      return new Response(cachedEntry.responseBody, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'x-cache': 'HIT',
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
  const upstreamResponse = await fetch(targetUrl.toString(), {
    method,
    headers,
    body: finalBody ? JSON.stringify(finalBody) : undefined,
  })

  const latencyMs = Date.now() - startTime

  if (isStream && upstreamResponse.ok && upstreamResponse.body) {
    return handleStreamingResponse({
      upstreamResponse,
      resolvedKey,
      providerType,
      path,
      startTime,
      latencyMs,
      requestModel: (finalBody?.model as string) || 'unknown',
      wasRouted,
      originalModel,
    })
  }

  // Non-streaming response
  const responseBody = await upstreamResponse.json()
  const totalLatency = Date.now() - startTime

  // Extract tokens and log asynchronously
  const tokens = extractTokensFromJson(responseBody, providerType)
  const model = tokens.model !== 'unknown' ? tokens.model : (finalBody?.model as string) || 'unknown'
  const cost = computeCost(model, tokens.inputTokens, tokens.outputTokens)

  // Step 3: Store in cache (only if enabled and response OK)
  if (resolvedKey.enableCache && upstreamResponse.ok && finalBody) {
    const cacheKey = buildCacheKey(providerType, model, finalBody)
    const ttlSeconds = resolvedKey.cacheTtl ?? undefined
    setCachedResponse(
      cacheKey,
      {
        responseBody: JSON.stringify(responseBody),
        model,
        inputTokens: tokens.inputTokens,
        outputTokens: tokens.outputTokens,
        cost,
        ttlSeconds: ttlSeconds ?? 3600,
      },
      ttlSeconds
    )
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
  })

  // Increment request count
  incrementRequestCount(resolvedKey.id)

  return new Response(JSON.stringify(responseBody), {
    status: upstreamResponse.status,
    headers: {
      'Content-Type': 'application/json',
      'x-cache': 'MISS',
      'x-proxy-latency-ms': String(totalLatency),
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
}): Response {
  const { upstreamResponse, resolvedKey, providerType, path, startTime, requestModel, wasRouted, originalModel } = params

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
        })

        incrementRequestCount(resolvedKey.id)
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
}): void {
  bkendService.post('/proxy-logs', data as unknown as Record<string, unknown>).catch(() => {
    // Logging failure should not impact the proxy response
  })
}
