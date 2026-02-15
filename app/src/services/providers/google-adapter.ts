import type { ProviderAdapter, FetchUsageResult, RateLimitConfig } from './base-adapter'
import { ProviderApiError } from './base-adapter'

const GOOGLE_MODELS: Record<string, { input: number; output: number }> = {
  'gemini-2.0-flash': { input: 0.1, output: 0.4 },
  'gemini-2.0-pro': { input: 1.25, output: 5 },
  'gemini-1.5-pro': { input: 1.25, output: 5 },
  'gemini-1.5-flash': { input: 0.075, output: 0.3 },
}

export class GoogleAdapter implements ProviderAdapter {
  type = 'google' as const

  rateLimitConfig: RateLimitConfig = {
    maxRequestsPerMinute: 300,
    delayBetweenRequestsMs: 500,
  }

  async validateKey(apiKey: string): Promise<boolean> {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      )
      return res.ok
    } catch {
      return false
    }
  }

  async fetchUsage(): Promise<FetchUsageResult> {
    throw new ProviderApiError(
      501,
      'Google AI does not provide a standard usage API. Usage data can be imported via CSV or entered manually.',
      'google',
    )
  }

  getAvailableModels(): string[] {
    return Object.keys(GOOGLE_MODELS)
  }

  supportsUsageApi(): boolean {
    return false
  }
}
