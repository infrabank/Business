export type ProviderType = 'openai' | 'anthropic' | 'google' | 'azure' | 'custom'

export interface Provider {
  id: string
  orgId: string
  type: ProviderType
  name: string
  isActive: boolean
  lastSyncAt?: string
  createdAt: string
}

export interface ApiKey {
  id: string
  providerId: string
  projectId?: string
  label: string
  keyPrefix: string
  isActive: boolean
  createdAt: string
}
