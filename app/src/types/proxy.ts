import type { ProviderType } from './provider'

export interface ProxyKey {
  id: string
  orgId: string
  name: string
  keyHash: string
  keyPrefix: string
  providerType: ProviderType
  encryptedApiKey: string
  isActive: boolean
  budgetLimit: number | null
  rateLimit: number | null
  requestCount: number
  lastUsedAt: string | null
  createdAt: string
  updatedAt: string
  enableCache: boolean
  cacheTtl: number | null
  enableModelRouting: boolean
}

export interface ProxyLog {
  id: string
  orgId: string
  proxyKeyId: string
  providerType: ProviderType
  model: string
  path: string
  statusCode: number
  inputTokens: number
  outputTokens: number
  totalTokens: number
  cost: number
  originalCost: number
  latencyMs: number
  isStreaming: boolean
  errorMessage: string | null
  createdAt: string
  cacheHit: boolean
  savedAmount: number
  originalModel: string | null
}

export interface ResolvedProxyKey {
  id: string
  orgId: string
  providerType: ProviderType
  decryptedApiKey: string
  budgetLimit: number | null
  rateLimit: number | null
  isActive: boolean
  enableCache: boolean
  cacheTtl: number | null
  enableModelRouting: boolean
}

export interface CreateProxyKeyRequest {
  name: string
  providerType: ProviderType
  apiKey: string
  budgetLimit?: number
  rateLimit?: number
  enableCache?: boolean
  cacheTtl?: number
  enableModelRouting?: boolean
}

export interface ProxyKeyDisplay {
  id: string
  name: string
  keyPrefix: string
  providerType: ProviderType
  isActive: boolean
  budgetLimit: number | null
  rateLimit: number | null
  requestCount: number
  lastUsedAt: string | null
  createdAt: string
  enableCache: boolean
  cacheTtl: number | null
  enableModelRouting: boolean
}

export interface ProxyLogQuery {
  orgId: string
  proxyKeyId?: string
  providerType?: ProviderType
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}

export interface SavingsSummary {
  totalSaved: number
  cacheHits: number
  cacheHitRate: number
  modelRoutings: number
  cacheSavings: number
  routingSavings: number
  totalOriginalCost: number
  totalActualCost: number
  periodStart: string
  periodEnd: string
}

export interface OptimizationRecommendation {
  type: 'cache' | 'routing' | 'budget'
  title: string
  description: string
  potentialSavings: number
  confidence: 'high' | 'medium' | 'low'
}
