/**
 * Observability Service
 *
 * Sends proxy request/response data to external observability tools.
 * Supports Langfuse, custom webhooks, and structured log export.
 * All sends are fire-and-forget to avoid impacting proxy latency.
 */

import { getRedis } from './redis'

export type ObservabilityProvider = 'langfuse' | 'webhook' | 'logflare'

export interface ObservabilityConfig {
  provider: ObservabilityProvider
  enabled: boolean
  endpoint: string // URL for webhook, or Langfuse host
  apiKey?: string  // Auth key/token
  secretKey?: string // Langfuse secret key (paired with apiKey as public key)
  headers?: Record<string, string> // Additional headers for webhook
  events?: ObservabilityEvent[] // Which events to send (default: all)
}

export type ObservabilityEvent = 'request' | 'response' | 'error' | 'cache_hit' | 'budget_exceeded' | 'guardrail_blocked'

export interface ObservabilityPayload {
  event: ObservabilityEvent
  timestamp: string
  traceId: string
  orgId: string
  proxyKeyId: string
  providerType: string
  model: string
  path: string
  statusCode: number
  inputTokens: number
  outputTokens: number
  cost: number
  latencyMs: number
  isStreaming: boolean
  cacheHit: boolean
  cacheLevel?: string
  savedAmount: number
  originalModel?: string | null
  errorMessage?: string | null
  metadata?: Record<string, unknown>
}

// Rate limit: max events per minute per org to prevent abuse
const RATE_LIMIT_KEY_PREFIX = 'lcm:obs:rate:'
const MAX_EVENTS_PER_MINUTE = 600

// In-memory queue for batching (flush every 5 seconds)
const eventQueue: Array<{ config: ObservabilityConfig; payload: ObservabilityPayload }> = []
let flushTimer: ReturnType<typeof setTimeout> | null = null
const FLUSH_INTERVAL_MS = 5000
const MAX_QUEUE_SIZE = 100

/**
 * Generate a trace ID for request correlation
 */
export function generateTraceId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).slice(2, 10)
  return `lcm_${timestamp}_${random}`
}

/**
 * Send an observability event (fire-and-forget with batching)
 */
export function sendObservabilityEvent(
  config: ObservabilityConfig,
  payload: ObservabilityPayload
): void {
  if (!config.enabled || !config.endpoint) return

  // Filter by configured events
  if (config.events && config.events.length > 0 && !config.events.includes(payload.event)) {
    return
  }

  // Add to queue
  eventQueue.push({ config, payload })

  // Flush if queue is full
  if (eventQueue.length >= MAX_QUEUE_SIZE) {
    flushQueue()
    return
  }

  // Start flush timer if not already running
  if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushQueue()
      flushTimer = null
    }, FLUSH_INTERVAL_MS)
  }
}

/**
 * Flush queued events to their destinations
 */
async function flushQueue(): Promise<void> {
  if (eventQueue.length === 0) return

  // Drain queue
  const batch = eventQueue.splice(0, eventQueue.length)

  // Group by config endpoint for batching
  const grouped = new Map<string, typeof batch>()
  for (const item of batch) {
    const key = `${item.config.provider}:${item.config.endpoint}`
    const list = grouped.get(key) || []
    list.push(item)
    grouped.set(key, list)
  }

  // Send each group
  for (const [, items] of grouped) {
    const config = items[0].config
    const payloads = items.map((i) => i.payload)

    try {
      await sendBatch(config, payloads)
    } catch {
      // Observability errors should never affect the proxy
    }
  }
}

/**
 * Send a batch of events to the configured provider
 */
async function sendBatch(
  config: ObservabilityConfig,
  payloads: ObservabilityPayload[]
): Promise<void> {
  switch (config.provider) {
    case 'langfuse':
      await sendToLangfuse(config, payloads)
      break
    case 'webhook':
      await sendToWebhook(config, payloads)
      break
    case 'logflare':
      await sendToWebhook(config, payloads) // Logflare uses webhook-compatible API
      break
  }
}

/**
 * Send events to Langfuse using their ingestion API
 * https://langfuse.com/docs/api
 */
async function sendToLangfuse(
  config: ObservabilityConfig,
  payloads: ObservabilityPayload[]
): Promise<void> {
  const host = config.endpoint.replace(/\/$/, '')
  const auth = Buffer.from(`${config.apiKey}:${config.secretKey}`).toString('base64')

  const events = payloads.map((p) => ({
    id: p.traceId,
    type: 'generation-create',
    timestamp: p.timestamp,
    body: {
      traceId: p.traceId,
      name: `${p.providerType}/${p.model}`,
      model: p.model,
      input: { path: p.path, provider: p.providerType },
      output: p.errorMessage ? { error: p.errorMessage } : undefined,
      usage: {
        input: p.inputTokens,
        output: p.outputTokens,
        total: p.inputTokens + p.outputTokens,
        unit: 'TOKENS',
      },
      metadata: {
        orgId: p.orgId,
        proxyKeyId: p.proxyKeyId,
        statusCode: p.statusCode,
        latencyMs: p.latencyMs,
        cacheHit: p.cacheHit,
        cacheLevel: p.cacheLevel,
        savedAmount: p.savedAmount,
        originalModel: p.originalModel,
        isStreaming: p.isStreaming,
        ...p.metadata,
      },
      statusMessage: p.statusCode < 400 ? 'SUCCESS' : 'ERROR',
      level: p.statusCode < 400 ? 'DEFAULT' : 'ERROR',
      costInUsd: p.cost,
      startTime: p.timestamp,
      completionStartTime: p.timestamp,
      endTime: new Date(new Date(p.timestamp).getTime() + p.latencyMs).toISOString(),
    },
  }))

  await fetch(`${host}/api/public/ingestion`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${auth}`,
    },
    body: JSON.stringify({ batch: events }),
  })
}

/**
 * Send events to a custom webhook endpoint
 */
async function sendToWebhook(
  config: ObservabilityConfig,
  payloads: ObservabilityPayload[]
): Promise<void> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...config.headers,
  }

  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`
  }

  await fetch(config.endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      source: 'llm-cost-manager',
      timestamp: new Date().toISOString(),
      events: payloads,
    }),
  })
}

/**
 * Check rate limit for observability events (per org)
 */
export async function checkObservabilityRateLimit(orgId: string): Promise<boolean> {
  const r = getRedis()
  if (!r) return true // No Redis = no rate limiting

  try {
    const key = `${RATE_LIMIT_KEY_PREFIX}${orgId}`
    const count = await r.incr(key)
    if (count === 1) {
      await r.expire(key, 60) // 1 minute window
    }
    return count <= MAX_EVENTS_PER_MINUTE
  } catch {
    return true // Fail open
  }
}

/**
 * Build an observability payload from proxy request data
 */
export function buildObservabilityPayload(data: {
  traceId: string
  event: ObservabilityEvent
  orgId: string
  proxyKeyId: string
  providerType: string
  model: string
  path: string
  statusCode: number
  inputTokens: number
  outputTokens: number
  cost: number
  latencyMs: number
  isStreaming: boolean
  cacheHit: boolean
  cacheLevel?: string
  savedAmount: number
  originalModel?: string | null
  errorMessage?: string | null
  metadata?: Record<string, unknown>
}): ObservabilityPayload {
  return {
    ...data,
    timestamp: new Date().toISOString(),
  }
}
