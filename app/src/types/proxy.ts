import type { ProviderType } from './provider'

export interface GuardrailSettings {
  enablePiiMasking: boolean
  enableKeywordBlock: boolean
  blockedKeywords: string[]
  maxInputLength: number | null
}

export interface ObservabilitySettings {
  provider: 'langfuse' | 'webhook' | 'logflare'
  enabled: boolean
  endpoint: string
  apiKey: string
  secretKey: string
  events: string[]
}

export interface ProxyKey {
  id: string
  orgId: string
  name: string
  keyHash: string
  keyPrefix: string
  providerType: ProviderType | 'auto'
  encryptedApiKey: string
  providerApiKeys?: Record<string, string>
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
  budgetAlertThresholds: number[]
  budgetAlertsEnabled: boolean
  routingMode: 'auto' | 'manual' | 'off'
  routingRules: RoutingRule[]
  enableFallback: boolean
  enableGuardrails: boolean
  guardrailSettings: GuardrailSettings | null
  observabilitySettings: ObservabilitySettings | null
}

export interface RoutingRule {
  fromModel: string
  toModel: string
  condition: 'always' | 'simple-only' | 'short-only'
}

export interface RoutingDecision {
  intent: string
  confidence: number
  reason: string
  wasRouted: boolean
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
  routingDecision: RoutingDecision | null
  userFeedback: 'positive' | 'negative' | null
  fallbackProvider: string | null
  fallbackModel: string | null
}

export interface ResolvedProxyKey {
  id: string
  orgId: string
  providerType: ProviderType | 'auto'
  decryptedApiKey: string
  providerApiKeys?: Record<string, string>
  budgetLimit: number | null
  rateLimit: number | null
  isActive: boolean
  enableCache: boolean
  cacheTtl: number | null
  enableModelRouting: boolean
  budgetAlertThresholds: number[]
  budgetAlertsEnabled: boolean
  routingMode: 'auto' | 'manual' | 'off'
  routingRules: RoutingRule[]
  enableFallback: boolean
  enableGuardrails: boolean
  guardrailSettings: GuardrailSettings | null
  observabilitySettings: ObservabilitySettings | null
}

export interface CreateProxyKeyRequest {
  name: string
  providerType: ProviderType | 'auto'
  apiKey: string
  providerApiKeys?: Record<string, string>
  budgetLimit?: number
  rateLimit?: number
  enableCache?: boolean
  cacheTtl?: number
  enableModelRouting?: boolean
  budgetAlertThresholds?: number[]
  budgetAlertsEnabled?: boolean
  routingMode?: 'auto' | 'manual' | 'off'
  routingRules?: RoutingRule[]
  enableFallback?: boolean
  enableGuardrails?: boolean
  guardrailSettings?: GuardrailSettings
  observabilitySettings?: ObservabilitySettings
}

export interface ProxyKeyDisplay {
  id: string
  name: string
  keyPrefix: string
  providerType: ProviderType | 'auto'
  isActive: boolean
  budgetLimit: number | null
  rateLimit: number | null
  requestCount: number
  lastUsedAt: string | null
  createdAt: string
  enableCache: boolean
  cacheTtl: number | null
  enableModelRouting: boolean
  budgetAlertThresholds: number[]
  budgetAlertsEnabled: boolean
  routingMode: 'auto' | 'manual' | 'off'
  routingRules: RoutingRule[]
  enableFallback: boolean
  enableGuardrails: boolean
  guardrailSettings: GuardrailSettings | null
  observabilitySettings: ObservabilitySettings | null
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
