import { bkend } from '@/lib/bkend'
import { createAdapter, ProviderApiError } from '@/services/providers'
import type { FetchUsageResult } from '@/services/providers'
import { decrypt } from '@/services/encryption.service'
import type { Provider, ApiKey, ProviderType, SyncHistory, SyncResult, SyncStatus } from '@/types'
import { SYNC_CONFIG } from '@/lib/constants'

interface SyncOptions {
  orgId: string
  token: string
  providerId?: string
  fromDate?: Date
  toDate?: Date
  syncType: 'manual' | 'scheduled' | 'retry'
}

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = SYNC_CONFIG.maxRetries,
  baseDelayMs: number = SYNC_CONFIG.retryBaseDelayMs,
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      if (attempt === maxRetries) throw err
      if (err instanceof ProviderApiError && err.statusCode === 401) throw err
      if (err instanceof ProviderApiError && err.statusCode === 403) throw err
      if (err instanceof ProviderApiError && err.statusCode === 501) throw err
      const delay = baseDelayMs * Math.pow(2, attempt)
      await new Promise(r => setTimeout(r, delay))
    }
  }
  throw new Error('Unreachable')
}

async function rateLimitDelay(delayMs: number): Promise<void> {
  if (delayMs > 0) await new Promise(r => setTimeout(r, delayMs))
}

async function upsertUsageRecord(
  record: Record<string, unknown>,
  token: string,
): Promise<'created' | 'updated'> {
  const existing = await bkend.get<Array<{ id: string }>>('/usage-records', {
    token,
    params: {
      orgId: record.orgId as string,
      apiKeyId: record.apiKeyId as string,
      model: record.model as string,
      date: record.date as string,
    },
  })

  if (existing.length > 0) {
    await bkend.patch(`/usage-records/${existing[0].id}`, {
      inputTokens: record.inputTokens,
      outputTokens: record.outputTokens,
      totalTokens: record.totalTokens,
      cost: record.cost,
      requestCount: record.requestCount,
      syncHistoryId: record.syncHistoryId,
    }, { token })
    return 'updated'
  }

  await bkend.post('/usage-records', record, { token })
  return 'created'
}

async function createSyncHistory(
  data: Omit<SyncHistory, 'id' | 'completedAt'>,
  token: string,
): Promise<SyncHistory> {
  return bkend.post<SyncHistory>('/sync-histories', data as Record<string, unknown>, { token })
}

async function completeSyncHistory(
  id: string,
  updates: Partial<SyncHistory>,
  token: string,
): Promise<void> {
  await bkend.patch(`/sync-histories/${id}`, {
    ...updates,
    completedAt: new Date().toISOString(),
  } as Record<string, unknown>, { token })
}

async function syncSingleProvider(
  provider: Provider,
  apiKeys: ApiKey[],
  from: Date,
  to: Date,
  syncHistoryId: string,
  token: string,
): Promise<{ created: number; updated: number }> {
  const adapter = createAdapter(provider.type as ProviderType)
  let totalCreated = 0
  let totalUpdated = 0

  for (const key of apiKeys) {
    if (!key.isActive) continue

    const keyData = await bkend.get<{ encryptedKey: string }>(`/api-keys/${key.id}/secret`, { token })
    const plainKey = decrypt(keyData.encryptedKey)

    let page: number | undefined
    let hasMore = true

    while (hasMore) {
      await rateLimitDelay(adapter.rateLimitConfig.delayBetweenRequestsMs)

      const result: FetchUsageResult = await withRetry(() =>
        adapter.fetchUsage(plainKey, from, to, { page }),
      )

      for (const record of result.data) {
        const action = await upsertUsageRecord({
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
          syncHistoryId,
        }, token)

        if (action === 'created') totalCreated++
        else totalUpdated++
      }

      hasMore = result.hasMore
      page = result.nextPage
    }
  }

  await bkend.patch(`/providers/${provider.id}`, {
    lastSyncAt: new Date().toISOString(),
  }, { token })

  return { created: totalCreated, updated: totalUpdated }
}

export async function syncProviderUsage(options: SyncOptions): Promise<SyncResult[]> {
  const { orgId, token, syncType } = options
  const to = options.toDate ?? new Date()
  const from = options.fromDate ?? new Date(to.getTime() - SYNC_CONFIG.defaultSyncDays * 86400000)
  const results: SyncResult[] = []

  let providers: Provider[]
  if (options.providerId) {
    const provider = await bkend.get<Provider>(`/providers/${options.providerId}`, { token })
    providers = [provider]
  } else {
    providers = await bkend.get<Provider[]>('/providers', { token, params: { orgId } })
  }

  for (const provider of providers) {
    if (!provider.isActive) continue

    const adapter = createAdapter(provider.type as ProviderType)
    if (!adapter.supportsUsageApi()) {
      results.push({
        providerId: provider.id,
        providerType: provider.type as ProviderType,
        recordsCreated: 0,
        recordsUpdated: 0,
        status: 'failed' as SyncStatus,
        error: `${provider.type} does not support usage API`,
        durationMs: 0,
      })
      continue
    }

    const startTime = Date.now()
    const syncHistory = await createSyncHistory({
      orgId,
      providerId: provider.id,
      providerType: provider.type as ProviderType,
      syncType,
      status: 'running',
      fromDate: from.toISOString().split('T')[0],
      toDate: to.toISOString().split('T')[0],
      recordsCreated: 0,
      recordsUpdated: 0,
      durationMs: 0,
      startedAt: new Date().toISOString(),
    }, token)

    try {
      const keys = await bkend.get<ApiKey[]>('/api-keys', {
        token,
        params: { providerId: provider.id },
      })

      const { created, updated } = await syncSingleProvider(
        provider, keys, from, to, syncHistory.id, token,
      )

      const durationMs = Date.now() - startTime
      await completeSyncHistory(syncHistory.id, {
        status: 'success',
        recordsCreated: created,
        recordsUpdated: updated,
        durationMs,
      }, token)

      results.push({
        providerId: provider.id,
        providerType: provider.type as ProviderType,
        recordsCreated: created,
        recordsUpdated: updated,
        status: 'success',
        durationMs,
      })
    } catch (err) {
      const durationMs = Date.now() - startTime
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'

      await completeSyncHistory(syncHistory.id, {
        status: 'failed',
        errorMessage,
        durationMs,
      }, token)

      results.push({
        providerId: provider.id,
        providerType: provider.type as ProviderType,
        recordsCreated: 0,
        recordsUpdated: 0,
        status: 'failed',
        error: errorMessage,
        durationMs,
      })
    }
  }

  return results
}
