import type { ProviderType } from '@/types'

export interface UsageData {
  model: string
  inputTokens: number
  outputTokens: number
  cost: number
  requestCount: number
  date: string
}

export interface RateLimitConfig {
  maxRequestsPerMinute: number
  delayBetweenRequestsMs: number
}

export interface FetchUsageOptions {
  bucketWidth?: '1h' | '1d'
  page?: number
  limit?: number
}

export interface FetchUsageResult {
  data: UsageData[]
  hasMore: boolean
  nextPage?: number
}

export class ProviderApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public provider: string,
  ) {
    super(message)
    this.name = 'ProviderApiError'
  }
}

export interface PromptRequest {
  model: string
  systemPrompt?: string
  userPrompt: string
  temperature: number
  maxTokens: number
}

export interface PromptResponse {
  content: string
  inputTokens: number
  outputTokens: number
  model: string
}

export interface ProviderAdapter {
  type: ProviderType
  rateLimitConfig: RateLimitConfig
  validateKey(apiKey: string): Promise<boolean>
  fetchUsage(apiKey: string, from: Date, to: Date, options?: FetchUsageOptions): Promise<FetchUsageResult>
  getAvailableModels(): string[]
  getModelPricing(model: string): { input: number; output: number }
  supportsUsageApi(): boolean
  executePrompt(apiKey: string, request: PromptRequest): Promise<PromptResponse>
}
