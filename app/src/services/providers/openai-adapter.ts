import type { ProviderAdapter, UsageData, FetchUsageOptions, FetchUsageResult, RateLimitConfig } from './base-adapter'
import { ProviderApiError } from './base-adapter'

const OPENAI_MODELS: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 2.5, output: 10 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4-turbo': { input: 10, output: 30 },
  'o1': { input: 15, output: 60 },
  'o1-mini': { input: 3, output: 12 },
  'o3-mini': { input: 1.1, output: 4.4 },
}

export class OpenAIAdapter implements ProviderAdapter {
  type = 'openai' as const

  rateLimitConfig: RateLimitConfig = {
    maxRequestsPerMinute: 60,
    delayBetweenRequestsMs: 1000,
  }

  async validateKey(apiKey: string): Promise<boolean> {
    try {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      return res.ok
    } catch {
      return false
    }
  }

  async fetchUsage(apiKey: string, from: Date, to: Date, options?: FetchUsageOptions): Promise<FetchUsageResult> {
    const params = new URLSearchParams({
      start_time: String(Math.floor(from.getTime() / 1000)),
      end_time: String(Math.floor(to.getTime() / 1000)),
      group_by: 'model',
      bucket_width: options?.bucketWidth ?? '1d',
      limit: String(options?.limit ?? 100),
    })
    if (options?.page) params.set('page', String(options.page))

    const res = await fetch(
      `https://api.openai.com/v1/organization/usage/completions?${params}`,
      { headers: { Authorization: `Bearer ${apiKey}` } },
    )

    if (res.status === 401) {
      throw new ProviderApiError(401, 'Invalid API key. Please check your OpenAI API key.', 'openai')
    }
    if (res.status === 403) {
      throw new ProviderApiError(403, 'Admin API key required for usage data. Please use an Organization Admin key.', 'openai')
    }
    if (res.status === 429) {
      throw new ProviderApiError(429, 'Rate limit exceeded. Will retry automatically.', 'openai')
    }
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}))
      throw new ProviderApiError(
        res.status,
        (errBody as { error?: { message?: string } }).error?.message ?? `OpenAI API error: ${res.statusText}`,
        'openai',
      )
    }

    const data = await res.json()
    return {
      data: this.parseUsageData(data as OpenAIUsageResponse),
      hasMore: (data as { has_more?: boolean }).has_more ?? false,
      nextPage: (data as { next_page?: number }).next_page,
    }
  }

  getAvailableModels(): string[] {
    return Object.keys(OPENAI_MODELS)
  }

  supportsUsageApi(): boolean {
    return true
  }

  private parseUsageData(data: OpenAIUsageResponse): UsageData[] {
    const results: UsageData[] = []
    const buckets = data.data ?? []
    for (const bucket of buckets) {
      const items = bucket.results ?? []
      for (const r of items) {
        const model = r.model ?? 'unknown'
        const inputTokens = r.input_tokens ?? 0
        const outputTokens = r.output_tokens ?? 0
        const pricing = OPENAI_MODELS[model] ?? { input: 1, output: 2 }
        results.push({
          model,
          inputTokens,
          outputTokens,
          cost: (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000,
          requestCount: r.num_requests ?? 0,
          date: new Date((bucket.start_time ?? 0) * 1000).toISOString().split('T')[0],
        })
      }
    }
    return results
  }
}

interface OpenAIUsageResponse {
  data?: Array<{
    start_time?: number
    results?: Array<{
      model?: string
      input_tokens?: number
      output_tokens?: number
      num_requests?: number
    }>
  }>
  has_more?: boolean
  next_page?: number
}
