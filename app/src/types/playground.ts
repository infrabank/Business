import type { ProviderType } from '@/types'

// === Execute Request/Response ===

export interface PlaygroundExecuteRequest {
  providerId: string
  model: string
  systemPrompt?: string
  userPrompt: string
  temperature: number
  maxTokens: number
}

export interface PlaygroundExecuteResponse {
  response: string
  inputTokens: number
  outputTokens: number
  cost: number
  responseTimeMs: number
  model: string
  provider: ProviderType
}

// === Estimate Request/Response ===

export interface PlaygroundEstimateRequest {
  provider: ProviderType
  model: string
  systemPrompt?: string
  userPrompt: string
}

export interface PlaygroundEstimateResponse {
  estimatedInputTokens: number
  estimatedCost: number
  modelPricing: {
    input: number
    output: number
  }
}

// === History ===

export interface PlaygroundHistory {
  id: string
  orgId: string
  userId: string
  provider: ProviderType
  model: string
  systemPrompt?: string
  userPrompt: string
  response: string
  inputTokens: number
  outputTokens: number
  cost: number
  responseTimeMs: number
  temperature: number
  maxTokens: number
  createdAt: string
}

// === Model Info ===

export interface ModelInfo {
  id: string
  provider: ProviderType
  label: string
  inputPrice: number
  outputPrice: number
}

// === Comparison Mode ===

export interface ComparisonResult {
  left: PlaygroundExecuteResponse | null
  right: PlaygroundExecuteResponse | null
  leftModel: string
  rightModel: string
  leftLoading: boolean
  rightLoading: boolean
}

// === UI State ===

export type PlaygroundMode = 'single' | 'compare'
