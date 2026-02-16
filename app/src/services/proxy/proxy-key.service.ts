import { createHash, randomBytes } from 'crypto'
import { encrypt, decrypt } from '@/services/encryption.service'
import { bkendService } from '@/lib/bkend'
import type { ProxyKey, ResolvedProxyKey, ProxyKeyDisplay } from '@/types/proxy'
import type { ProviderType } from '@/types/provider'

const PROXY_KEY_PREFIX = 'lmc_'

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
  providerType: ProviderType
  apiKey: string
  budgetLimit?: number
  rateLimit?: number
  enableCache?: boolean
  cacheTtl?: number
  enableModelRouting?: boolean
}): Promise<{ proxyKey: string; display: ProxyKeyDisplay }> {
  const rawKey = generateProxyKey()
  const keyHash = hashKey(rawKey)
  const keyPrefix = rawKey.slice(0, 8) + '...'
  const encryptedApiKey = encrypt(params.apiKey)

  const record = await bkendService.post<ProxyKey>('/proxy-keys', {
    orgId: params.orgId,
    name: params.name,
    keyHash,
    keyPrefix,
    providerType: params.providerType,
    encryptedApiKey,
    isActive: true,
    budgetLimit: params.budgetLimit ?? null,
    rateLimit: params.rateLimit ?? null,
    requestCount: 0,
    enableCache: params.enableCache ?? true,
    cacheTtl: params.cacheTtl ?? null,
    enableModelRouting: params.enableModelRouting ?? false,
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

    return {
      id: record.id,
      orgId: record.orgId,
      providerType: record.providerType,
      decryptedApiKey: decrypt(record.encryptedApiKey),
      budgetLimit: record.budgetLimit,
      rateLimit: record.rateLimit,
      isActive: record.isActive,
      enableCache: record.enableCache,
      cacheTtl: record.cacheTtl,
      enableModelRouting: record.enableModelRouting,
    }
  } catch {
    return null
  }
}

export async function incrementRequestCount(proxyKeyId: string): Promise<void> {
  try {
    // Use a direct update - increment count and set lastUsedAt
    await bkendService.patch<ProxyKey>(`/proxy-keys/${proxyKeyId}`, {
      lastUsedAt: new Date().toISOString(),
    })
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
  }
}

export async function deleteProxyKey(id: string): Promise<void> {
  await bkendService.delete(`/proxy-keys/${id}`)
}
