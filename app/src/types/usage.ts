import type { ProviderType } from './provider'

export interface UsageRecord {
  id: string
  apiKeyId: string
  orgId: string
  providerType: ProviderType
  model: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  cost: number
  requestCount: number
  date: string
  createdAt: string
}

export interface UsageSummary {
  totalCost: number
  totalTokens: number
  totalRequests: number
  costChange: number
}
