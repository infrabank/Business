import { createHash, randomBytes } from 'crypto'
import { encrypt, decrypt } from '@/services/encryption.service'
import { bkendService } from '@/lib/bkend'
import { getRedis } from './redis'
import type { ProxyKey, ResolvedProxyKey, ProxyKeyDisplay, ObservabilitySettings } from '@/types/proxy'
import type { ProviderType } from '@/types/provider'

const PROXY_KEY_PREFIX = 'lmc_'

function encryptObsSettings(settings: ObservabilitySettings | null | undefined): ObservabilitySettings | null {
  if (!settings) return null
  return {
    ...settings,
    apiKey: settings.apiKey ? encrypt(settings.apiKey) : settings.apiKey,
    secretKey: settings.secretKey ? encrypt(settings.secretKey) : settings.secretKey,
  }
}

function decryptObsSettings(settings: ObservabilitySettings | null | undefined): ObservabilitySettings | null {
  if (!settings) return null
  const result = { ...settings }
  try {
    if (result.apiKey) result.apiKey = decrypt(result.apiKey)
  } catch { /* leave as-is if not encrypted */ }
  try {
    if (result.secretKey) result.secretKey = decrypt(result.secretKey)
  } catch { /* leave as-is if not encrypted */ }
  return result
}

function generateProxyKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const bytes = randomBytes(43)
  let result = PROXY_KEY_PREFIX
  for (let i = 0; i < 43; i++) {
    result += chars[bytes[i] % chars.length]
  }
  return result
}

function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

export async function createProxyKey(params: {
  orgId: string
  name: string
  providerType: ProviderType | 'auto'
  apiKey: string
  providerApiKeys?: Record<string, string>
  budgetLimit?: number
  rateLimit?: number
  enableCache?: boolean
  cacheTtl?: number
  enableModelRouting?: boolean
  budgetAlertsEnabled?: boolean
  budgetAlertThresholds?: number[]
  routingMode?: 'auto' | 'manual' | 'off'
  routingRules?: Array<{ fromModel: string; toModel: string; condition: 'always' | 'simple-only' | 'short-only' }>
  enableFallback?: boolean
  enableGuardrails?: boolean
  guardrailSettings?: Record<string, unknown>
  observabilitySettings?: Record<string, unknown>
}): Promise<{ proxyKey: string; display: ProxyKeyDisplay }> {
  const rawKey = generateProxyKey()
  const keyHash = hashKey(rawKey)
  const keyPrefix = rawKey.slice(0, 8) + '...'
  const encryptedApiKey = encrypt(params.apiKey)

  // Encrypt per-provider API keys for 'auto' type
  let encryptedProviderKeys: Record<string, string> | null = null
  if (params.providerType === 'auto' && params.providerApiKeys) {
    encryptedProviderKeys = {}
    for (const [provider, key] of Object.entries(params.providerApiKeys)) {
      if (key) encryptedProviderKeys[provider] = encrypt(key)
    }
  }

  const record = await bkendService.post<ProxyKey>('/proxy-keys', {
    orgId: params.orgId,
    name: params.name,
    keyHash,
    keyPrefix,
    providerType: params.providerType,
    encryptedApiKey,
    providerApiKeys: encryptedProviderKeys,
    isActive: true,
    budgetLimit: params.budgetLimit ?? null,
    rateLimit: params.rateLimit ?? null,
    requestCount: 0,
    enableCache: params.enableCache ?? true,
    cacheTtl: params.cacheTtl ?? null,
    enableModelRouting: params.enableModelRouting ?? false,
    budgetAlertsEnabled: params.budgetAlertsEnabled ?? false,
    budgetAlertThresholds: params.budgetAlertThresholds ?? [0.8, 0.9, 1.0],
    routingMode: params.routingMode ?? 'auto',
    routingRules: params.routingRules ?? [],
    enableFallback: params.enableFallback ?? false,
    enableGuardrails: params.enableGuardrails ?? false,
    guardrailSettings: params.guardrailSettings ?? null,
    observabilitySettings: encryptObsSettings(params.observabilitySettings as ObservabilitySettings | undefined) ?? null,
  })

  return {
    proxyKey: rawKey,
    display: {
      id: record.id,
      name: record.name,
      keyPrefix: record.keyPrefix,
      providerType: record.providerType,
      isActive: record.isActive,
      budgetLimit: record.budgetLimit,
      rateLimit: record.rateLimit,
      requestCount: record.requestCount,
      lastUsedAt: record.lastUsedAt,
      createdAt: record.createdAt,
      enableCache: record.enableCache,
      cacheTtl: record.cacheTtl,
      enableModelRouting: record.enableModelRouting,
      budgetAlertThresholds: record.budgetAlertThresholds ?? [0.8, 0.9, 1.0],
      budgetAlertsEnabled: record.budgetAlertsEnabled ?? false,
      routingMode: record.routingMode ?? 'auto',
      routingRules: record.routingRules ?? [],
      enableFallback: record.enableFallback ?? false,
      enableGuardrails: record.enableGuardrails ?? false,
      guardrailSettings: record.guardrailSettings ?? null,
      observabilitySettings: record.observabilitySettings ?? null,
    },
  }
}

export async function resolveProxyKey(rawKey: string): Promise<ResolvedProxyKey | null> {
  if (!rawKey.startsWith(PROXY_KEY_PREFIX)) return null

  const keyHash = hashKey(rawKey)

  try {
    const records = await bkendService.get<ProxyKey[]>('/proxy-keys', {
      params: { keyHash },
    })

    if (records.length === 0) return null
    const record = records[0]
    if (!record.isActive) return null

    // Decrypt per-provider keys for 'auto' type
    let decryptedProviderKeys: Record<string, string> | undefined
    if (record.providerType === 'auto' && record.providerApiKeys) {
      decryptedProviderKeys = {}
      for (const [provider, encKey] of Object.entries(record.providerApiKeys)) {
        try {
          decryptedProviderKeys[provider] = decrypt(encKey)
        } catch {
          // Skip invalid keys
        }
      }
    }

    return {
      id: record.id,
      orgId: record.orgId,
      providerType: record.providerType,
      decryptedApiKey: decrypt(record.encryptedApiKey),
      providerApiKeys: decryptedProviderKeys,
      budgetLimit: record.budgetLimit,
      rateLimit: record.rateLimit,
      isActive: record.isActive,
      enableCache: record.enableCache,
      cacheTtl: record.cacheTtl,
      enableModelRouting: record.enableModelRouting,
      budgetAlertsEnabled: record.budgetAlertsEnabled ?? false,
      budgetAlertThresholds: record.budgetAlertThresholds ?? [0.8, 0.9, 1.0],
      routingMode: record.routingMode ?? 'auto',
      routingRules: record.routingRules ?? [],
      enableFallback: record.enableFallback ?? false,
      enableGuardrails: record.enableGuardrails ?? false,
      guardrailSettings: record.guardrailSettings ?? null,
      observabilitySettings: decryptObsSettings(record.observabilitySettings) ?? null,
    }
  } catch {
    return null
  }
}

export async function incrementRequestCount(proxyKeyId: string): Promise<void> {
  try {
    const r = getRedis()
    if (r) {
      // O(1) Redis INCR — no DB round-trip on the hot path
      const redisKey = `lcm:reqcount:${proxyKeyId}`
      await r.incr(redisKey)
      await r.expire(redisKey, 86400) // 24h TTL, reconciled by cron
    }
    // Update lastUsedAt only (no read required)
    bkendService.patch<ProxyKey>(`/proxy-keys/${proxyKeyId}`, {
      lastUsedAt: new Date().toISOString(),
    }).catch(() => {})
  } catch {
    // Non-critical, don't block the request
  }
}

export async function listProxyKeys(orgId: string): Promise<ProxyKeyDisplay[]> {
  const records = await bkendService.get<ProxyKey[]>('/proxy-keys', {
    params: { orgId, _sort: '-createdAt' },
  })

  return records.map((r) => ({
    id: r.id,
    name: r.name,
    keyPrefix: r.keyPrefix,
    providerType: r.providerType,
    isActive: r.isActive,
    budgetLimit: r.budgetLimit,
    rateLimit: r.rateLimit,
    requestCount: r.requestCount,
    lastUsedAt: r.lastUsedAt,
    createdAt: r.createdAt,
    enableCache: r.enableCache,
    cacheTtl: r.cacheTtl,
    enableModelRouting: r.enableModelRouting,
    budgetAlertThresholds: r.budgetAlertThresholds ?? [0.8, 0.9, 1.0],
    budgetAlertsEnabled: r.budgetAlertsEnabled ?? false,
    routingMode: r.routingMode ?? 'auto',
    routingRules: r.routingRules ?? [],
    enableFallback: r.enableFallback ?? false,
    enableGuardrails: r.enableGuardrails ?? false,
    guardrailSettings: r.guardrailSettings ?? null,
    observabilitySettings: r.observabilitySettings ?? null,
  }))
}

export async function updateProxyKey(
  id: string,
  data: { name?: string; isActive?: boolean; budgetLimit?: number | null; rateLimit?: number | null },
): Promise<ProxyKeyDisplay> {
  const record = await bkendService.patch<ProxyKey>(`/proxy-keys/${id}`, data as Record<string, unknown>)
  return {
    id: record.id,
    name: record.name,
    keyPrefix: record.keyPrefix,
    providerType: record.providerType,
    isActive: record.isActive,
    budgetLimit: record.budgetLimit,
    rateLimit: record.rateLimit,
    requestCount: record.requestCount,
    lastUsedAt: record.lastUsedAt,
    createdAt: record.createdAt,
    enableCache: record.enableCache,
    cacheTtl: record.cacheTtl,
    enableModelRouting: record.enableModelRouting,
    budgetAlertThresholds: record.budgetAlertThresholds ?? [0.8, 0.9, 1.0],
    budgetAlertsEnabled: record.budgetAlertsEnabled ?? false,
    routingMode: record.routingMode ?? 'auto',
    routingRules: record.routingRules ?? [],
    enableFallback: record.enableFallback ?? false,
    enableGuardrails: record.enableGuardrails ?? false,
    guardrailSettings: record.guardrailSettings ?? null,
    observabilitySettings: record.observabilitySettings ?? null,
  }
}

export async function deleteProxyKey(id: string): Promise<void> {
  await bkendService.delete(`/proxy-keys/${id}`)
}
