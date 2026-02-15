import { bkend } from '@/lib/bkend'
import { createAdapter } from '@/services/providers'
import { decrypt } from '@/services/encryption.service'
import type { Provider, ApiKey, ProviderType } from '@/types'

interface SyncResult {
  providerId: string
  recordsCreated: number
  error?: string
}

export async function syncProviderUsage(
  provider: Provider,
  apiKeys: ApiKey[],
  from: Date,
  to: Date,
  token: string,
): Promise<SyncResult> {
  const adapter = createAdapter(provider.type as ProviderType)
  let totalRecords = 0

  for (const key of apiKeys) {
    if (!key.isActive) continue

    try {
      // Fetch encrypted key from server and decrypt
      const keyData = await bkend.get<{ encryptedKey: string }>(`/api-keys/${key.id}/secret`, { token })
      const plainKey = decrypt(keyData.encryptedKey)

      const usageData = await adapter.fetchUsage(plainKey, from, to)

      for (const record of usageData) {
        await bkend.post('/usage-records', {
          apiKeyId: key.id,
          orgId: provider.orgId,
          providerType: provider.type,
          model: record.model,
          inputTokens: record.inputTokens,
          outputTokens: record.outputTokens,
          totalTokens: record.inputTokens + record.outputTokens,
          cost: record.cost,
          requestCount: record.requestCount,
          date: record.date,
        }, { token })

        totalRecords++
      }
    } catch (err) {
      return {
        providerId: provider.id,
        recordsCreated: totalRecords,
        error: err instanceof Error ? err.message : 'Unknown error',
      }
    }
  }

  // Update provider lastSyncAt
  await bkend.patch(`/providers/${provider.id}`, { lastSyncAt: new Date().toISOString() }, { token })

  return { providerId: provider.id, recordsCreated: totalRecords }
}

export async function syncAllProviders(orgId: string, token: string): Promise<SyncResult[]> {
  const providers = await bkend.get<Provider[]>('/providers', { token, params: { orgId } })
  const results: SyncResult[] = []

  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 1) // Sync last 24 hours

  for (const provider of providers) {
    if (!provider.isActive) continue
    const keys = await bkend.get<ApiKey[]>('/api-keys', { token, params: { providerId: provider.id } })
    const result = await syncProviderUsage(provider, keys, from, to, token)
    results.push(result)
  }

  return results
}
