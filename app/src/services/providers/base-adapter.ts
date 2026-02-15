import type { ProviderType } from '@/types'

export interface UsageData {
  model: string
  inputTokens: number
  outputTokens: number
  cost: number
  requestCount: number
  date: string
}

export interface ProviderAdapter {
  type: ProviderType
  validateKey(apiKey: string): Promise<boolean>
  fetchUsage(apiKey: string, from: Date, to: Date): Promise<UsageData[]>
  getAvailableModels(): string[]
}
