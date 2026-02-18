import type { ProviderType } from '@/types/provider'
import type { ResolvedProxyKey } from '@/types/proxy'

/**
 * Default fallback chains by provider
 * When a provider fails, try the next one in the chain
 */
const DEFAULT_FALLBACK_CHAINS: Partial<Record<ProviderType, ProviderType[]>> = {
  openai: ['anthropic', 'google'],
  anthropic: ['openai', 'google'],
  google: ['openai', 'anthropic'],
}

/**
 * Model equivalents across providers for fallback routing
 * Maps a model to its closest equivalent on another provider
 */
const MODEL_EQUIVALENTS: Record<string, Partial<Record<ProviderType, string>>> = {
  // OpenAI flagship
  'gpt-4o': { openai: 'gpt-4o', anthropic: 'claude-sonnet-4-5-20250514', google: 'gemini-2.0-flash' },
  'gpt-4o-mini': { openai: 'gpt-4o-mini', anthropic: 'claude-haiku-4-5-20251001', google: 'gemini-2.0-flash' },
  'gpt-4-turbo': { openai: 'gpt-4-turbo', anthropic: 'claude-sonnet-4-5-20250514', google: 'gemini-2.0-pro' },
  'o1': { openai: 'o1', anthropic: 'claude-opus-4-6-20250610', google: 'gemini-2.0-pro' },
  'o3-mini': { openai: 'o3-mini', anthropic: 'claude-haiku-4-5-20251001', google: 'gemini-2.0-flash' },
  // Anthropic flagship
  'claude-opus-4-6-20250610': { openai: 'o1', anthropic: 'claude-opus-4-6-20250610', google: 'gemini-2.0-pro' },
  'claude-sonnet-4-5-20250514': { openai: 'gpt-4o', anthropic: 'claude-sonnet-4-5-20250514', google: 'gemini-2.0-flash' },
  'claude-haiku-4-5-20251001': { openai: 'gpt-4o-mini', anthropic: 'claude-haiku-4-5-20251001', google: 'gemini-2.0-flash' },
  // Google flagship
  'gemini-2.0-pro': { openai: 'gpt-4-turbo', anthropic: 'claude-sonnet-4-5-20250514', google: 'gemini-2.0-pro' },
  'gemini-2.0-flash': { openai: 'gpt-4o-mini', anthropic: 'claude-haiku-4-5-20251001', google: 'gemini-2.0-flash' },
  'gemini-1.5-pro': { openai: 'gpt-4-turbo', anthropic: 'claude-sonnet-4-5-20250514', google: 'gemini-1.5-pro' },
  'gemini-1.5-flash': { openai: 'gpt-4o-mini', anthropic: 'claude-haiku-4-5-20251001', google: 'gemini-1.5-flash' },
}

/**
 * Retryable HTTP status codes (server errors, rate limits)
 */
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504])

/**
 * Check if a response status is retryable
 */
export function isRetryableError(status: number): boolean {
  return RETRYABLE_STATUS_CODES.has(status)
}

/**
 * Get fallback providers for a given provider
 * Only returns providers that have API keys available
 */
export function getFallbackProviders(
  currentProvider: ProviderType,
  resolvedKey: ResolvedProxyKey
): ProviderType[] {
  // Only multi-provider (auto) keys can fallback to other providers
  if (resolvedKey.providerType !== 'auto' || !resolvedKey.providerApiKeys) {
    return []
  }

  const chain = DEFAULT_FALLBACK_CHAINS[currentProvider] || []
  return chain.filter((p) => {
    const key = resolvedKey.providerApiKeys?.[p]
    return key && key.length > 0
  })
}

/**
 * Get the equivalent model on a different provider
 */
export function getEquivalentModel(
  originalModel: string,
  targetProvider: ProviderType
): string | null {
  // Direct lookup
  const equiv = MODEL_EQUIVALENTS[originalModel]
  if (equiv?.[targetProvider]) {
    return equiv[targetProvider]
  }

  // Fuzzy match: try to find a model that starts with the same prefix
  for (const [key, mapping] of Object.entries(MODEL_EQUIVALENTS)) {
    if (originalModel.startsWith(key) || key.startsWith(originalModel)) {
      return mapping[targetProvider] || null
    }
  }

  return null
}

/**
 * Transform request body for a different provider
 * Converts between OpenAI, Anthropic, and Google message formats
 */
export function transformRequestBody(
  body: Record<string, unknown>,
  fromProvider: ProviderType,
  toProvider: ProviderType,
  targetModel: string
): Record<string, unknown> {
  // Same provider - just swap model
  if (fromProvider === toProvider) {
    return { ...body, model: targetModel }
  }

  // Extract messages in a normalized form
  const messages = extractNormalizedMessages(body, fromProvider)
  if (!messages.length) {
    return { ...body, model: targetModel }
  }

  // Build target format
  if (toProvider === 'openai') {
    return buildOpenAIBody(messages, targetModel, body)
  } else if (toProvider === 'anthropic') {
    return buildAnthropicBody(messages, targetModel, body)
  } else if (toProvider === 'google') {
    return buildGoogleBody(messages, targetModel, body)
  }

  return { ...body, model: targetModel }
}

interface NormalizedMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

function extractNormalizedMessages(
  body: Record<string, unknown>,
  provider: ProviderType
): NormalizedMessage[] {
  const messages: NormalizedMessage[] = []

  if (provider === 'openai' || provider === 'anthropic') {
    // System prompt for Anthropic
    if (typeof body.system === 'string') {
      messages.push({ role: 'system', content: body.system })
    }

    if (Array.isArray(body.messages)) {
      for (const msg of body.messages) {
        const role = msg.role === 'system' ? 'system' : msg.role === 'assistant' ? 'assistant' : 'user'
        let content = ''
        if (typeof msg.content === 'string') {
          content = msg.content
        } else if (Array.isArray(msg.content)) {
          content = msg.content
            .map((b: { text?: string; type?: string }) => b.text || '')
            .filter(Boolean)
            .join('\n')
        }
        if (content) {
          messages.push({ role, content })
        }
      }
    }
  } else if (provider === 'google') {
    if (Array.isArray(body.contents)) {
      for (const content of body.contents) {
        const role = content.role === 'model' ? 'assistant' : 'user'
        if (Array.isArray(content.parts)) {
          const text = content.parts
            .map((p: { text?: string }) => p.text || '')
            .filter(Boolean)
            .join('\n')
          if (text) {
            messages.push({ role, content: text })
          }
        }
      }
    }
    // Google systemInstruction
    if (body.systemInstruction && typeof body.systemInstruction === 'object') {
      const si = body.systemInstruction as { parts?: Array<{ text?: string }> }
      if (Array.isArray(si.parts)) {
        const text = si.parts.map((p) => p.text || '').filter(Boolean).join('\n')
        if (text) messages.unshift({ role: 'system', content: text })
      }
    }
  }

  return messages
}

function buildOpenAIBody(
  messages: NormalizedMessage[],
  model: string,
  original: Record<string, unknown>
): Record<string, unknown> {
  return {
    model,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    ...(original.temperature !== undefined ? { temperature: original.temperature } : {}),
    ...(original.max_tokens !== undefined ? { max_tokens: original.max_tokens } : {}),
    ...(original.stream !== undefined ? { stream: original.stream } : {}),
  }
}

function buildAnthropicBody(
  messages: NormalizedMessage[],
  model: string,
  original: Record<string, unknown>
): Record<string, unknown> {
  const systemMessages = messages.filter((m) => m.role === 'system')
  const nonSystemMessages = messages.filter((m) => m.role !== 'system')

  return {
    model,
    ...(systemMessages.length ? { system: systemMessages.map((m) => m.content).join('\n') } : {}),
    messages: nonSystemMessages.map((m) => ({ role: m.role, content: m.content })),
    max_tokens: (original.max_tokens as number) || 4096,
    ...(original.temperature !== undefined ? { temperature: original.temperature } : {}),
    ...(original.stream !== undefined ? { stream: original.stream } : {}),
  }
}

function buildGoogleBody(
  messages: NormalizedMessage[],
  _model: string,
  original: Record<string, unknown>
): Record<string, unknown> {
  const systemMessages = messages.filter((m) => m.role === 'system')
  const nonSystemMessages = messages.filter((m) => m.role !== 'system')

  const result: Record<string, unknown> = {
    contents: nonSystemMessages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
  }

  if (systemMessages.length) {
    result.systemInstruction = {
      parts: systemMessages.map((m) => ({ text: m.content })),
    }
  }

  if (original.temperature !== undefined || original.max_tokens !== undefined) {
    result.generationConfig = {
      ...(original.temperature !== undefined ? { temperature: original.temperature } : {}),
      ...(original.max_tokens !== undefined ? { maxOutputTokens: original.max_tokens } : {}),
    }
  }

  return result
}

/**
 * Compute a short delay before retry (exponential backoff)
 */
export function getRetryDelay(attempt: number): number {
  // 200ms, 400ms, 800ms
  return Math.min(200 * Math.pow(2, attempt), 2000)
}

/**
 * Sleep for a given duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
