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
  latencyMs: number
  isStreaming: boolean
  errorMessage: string | null
  createdAt: string
}

export interface ResolvedProxyKey {
  id: string
  orgId: string
  providerType: ProviderType
  decryptedApiKey: string
  budgetLimit: number | null
  rateLimit: number | null
  isActive: boolean
}

export interface CreateProxyKeyRequest {
  name: string
  providerType: ProviderType
  apiKey: string
  budgetLimit?: number
  rateLimit?: number
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
