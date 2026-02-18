import type { ProviderType } from './provider'

export interface Project {
  id: string
  orgId: string
  name: string
  description?: string
  color?: string
  createdAt: string
}

export interface ProjectSummary {
  totalCost: number
  totalTokens: number
  totalRequests: number
  costChange: number
  byProvider: {
    type: ProviderType
    cost: number
    tokenCount: number
    requestCount: number
  }[]
  byModel: {
    model: string
    cost: number
    tokenCount: number
  }[]
  dailyCosts: {
    date: string
    cost: number
  }[]
  recentRecords: {
    id: string
    model: string
    providerType: ProviderType
    cost: number
    totalTokens: number
    requestCount: number
    date: string
  }[]
}
