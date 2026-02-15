import type { ProviderType } from './provider'
import type { Alert } from './alert'

export type SyncType = 'manual' | 'scheduled' | 'retry'
export type SyncStatus = 'running' | 'success' | 'failed' | 'partial'

export interface SyncHistory {
  id: string
  orgId: string
  providerId: string
  providerType: ProviderType
  syncType: SyncType
  status: SyncStatus
  fromDate: string
  toDate: string
  recordsCreated: number
  recordsUpdated: number
  errorMessage?: string
  durationMs: number
  startedAt: string
  completedAt?: string
}

export interface ModelPricing {
  id: string
  providerType: ProviderType
  model: string
  inputPricePer1M: number
  outputPricePer1M: number
  effectiveFrom: string
  effectiveTo?: string
  createdAt: string
}

export interface SyncTriggerRequest {
  orgId: string
  providerId?: string
  fromDate?: string
  toDate?: string
}

export interface SyncTriggerResponse {
  syncHistoryIds: string[]
  sync: SyncResult[]
  alerts: Alert[]
  syncedAt: string
}

export interface SyncResult {
  providerId: string
  providerType: ProviderType
  recordsCreated: number
  recordsUpdated: number
  status: SyncStatus
  error?: string
  durationMs: number
}
