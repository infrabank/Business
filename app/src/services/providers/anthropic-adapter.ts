import type { ProviderAdapter, UsageData, FetchUsageResult, RateLimitConfig, PromptRequest, PromptResponse } from './base-adapter'
import { ProviderApiError } from './base-adapter'

const ANTHROPIC_MODELS: Record<string, { input: number; output: number }> = {
  'claude-opus-4-6': { input: 15, output: 75 },
  'claude-sonnet-4-5': { input: 3, output: 15 },
  'claude-haiku-4-5': { input: 0.8, output: 4 },
}

export class AnthropicAdapter implements ProviderAdapter {
  type = 'anthropic' as const

  rateLimitConfig: RateLimitConfig = {
    maxRequestsPerMinute: 60,
    delayBetweenRequestsMs: 1000,
  }

  async validateKey(apiKey: string): Promise<boolean> {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'test' }],
        }),
      })
      return res.status !== 401
    } catch {
      return false
    }
  }

  async fetchUsage(apiKey: string, from: Date, to: Date): Promise<FetchUsageResult> {
    const params = new URLSearchParams({
      start_date: from.toISOString().split('T')[0],
      end_date: to.toISOString().split('T')[0],
      group_by: 'model',
    })

    const res = await fetch(
      `https://api.anthropic.com/v1/organizations/usage?${params}`,
      {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
      },
    )

    if (res.status === 401 || res.status === 403) {
      throw new ProviderApiError(
        res.status,
        'Anthropic Admin API key required for usage data. Standard API keys cannot access usage information.',
        'anthropic',
      )
    }

    if (res.status === 429) {
      throw new ProviderApiError(429, 'Rate limit exceeded. Will retry automatically.', 'anthropic')
    }

    if (!res.ok) {
      throw new ProviderApiError(res.status, `Anthropic API error: ${res.statusText}`, 'anthropic')
    }

    const data = await res.json()
    return { data: this.parseUsageData(data as AnthropicUsageResponse), hasMore: false }
  }

  getAvailableModels(): string[] {
    return Object.keys(ANTHROPIC_MODELS)
  }

  getModelPricing(model: string): { input: number; output: number } {
    return ANTHROPIC_MODELS[model] ?? { input: 3, output: 15 }
  }

  supportsUsageApi(): boolean {
    return true
  }

  async executePrompt(apiKey: string, request: PromptRequest): Promise<PromptResponse> {
    const body: Record<string, unknown> = {
      model: request.model,
      max_tokens: request.maxTokens,
      temperature: request.temperature,
      messages: [{ role: 'user', content: request.userPrompt }],
    }
    if (request.systemPrompt) {
      body.system = request.systemPrompt
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new ProviderApiError(
        res.status,
        (err as { error?: { message?: string } }).error?.message || `Anthropic error: ${res.statusText}`,
        'anthropic',
      )
    }

    const data = await res.json() as AnthropicMessageResponse
    const content = data.content?.map(b => b.text).join('') || ''
    return {
      content,
      inputTokens: data.usage?.input_tokens || 0,
      outputTokens: data.usage?.output_tokens || 0,
      model: data.model || request.model,
    }
  }

  private parseUsageData(data: AnthropicUsageResponse): UsageData[] {
    const results: UsageData[] = []
    const entries = data.data ?? []
    for (const entry of entries) {
      const model = entry.model ?? 'unknown'
      const inputTokens = entry.input_tokens ?? 0
      const outputTokens = entry.output_tokens ?? 0
      const pricing = ANTHROPIC_MODELS[model] ?? { input: 3, output: 15 }
      results.push({
        model,
        inputTokens,
        outputTokens,
        cost: (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000,
        requestCount: entry.num_requests ?? 0,
        date: entry.date ?? new Date().toISOString().split('T')[0],
      })
    }
    return results
  }
}

interface AnthropicMessageResponse {
  content?: Array<{ type: string; text: string }>
  usage?: { input_tokens?: number; output_tokens?: number }
  model?: string
}

interface AnthropicUsageResponse {
  data?: Array<{
    model?: string
    date?: string
    input_tokens?: number
    output_tokens?: number
    num_requests?: number
  }>
}
