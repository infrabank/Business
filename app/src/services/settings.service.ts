import { bkend } from '@/lib/bkend'
import type { UserPreferences } from '@/types/settings'
import { DEFAULT_PREFERENCES } from '@/types/settings'

// ---- Preferences CRUD ----

export async function getPreferences(userId: string): Promise<UserPreferences> {
  const rows = await bkend.get<UserPreferences[]>('/user_preferences', {
    params: { userId },
  })
  if (rows.length > 0) return rows[0]

  return await bkend.post<UserPreferences>('/user_preferences', {
    userId,
    ...DEFAULT_PREFERENCES,
  })
}

export async function updatePreferences(
  prefsId: string,
  updates: Partial<Pick<UserPreferences, 'currency' | 'dateFormat' | 'numberFormat' | 'dashboardPeriod'>>,
): Promise<UserPreferences> {
  return await bkend.patch<UserPreferences>(`/user_preferences/${prefsId}`, updates)
}

// ---- Data Reset ----

export async function resetOrgData(orgId: string): Promise<{ deleted: number }> {
  const records = await bkend.get<{ id: string }[]>('/usage_records', {
    params: { orgId },
  })
  let deleted = 0
  for (const r of records) {
    await bkend.delete(`/usage_records/${r.id}`)
    deleted++
  }
  return { deleted }
}

// ---- Account Deletion ----

export async function deleteAccount(userId: string, orgId: string): Promise<void> {
  // 1. usage_records 삭제
  await resetOrgData(orgId)

  // 2. 관련 데이터 삭제 (FK 의존성 순서)
  const tables = [
    'notification_logs',
    'notification_channels',
    'notification_preferences',
    'anomaly_events',
    'anomaly_detection_settings',
    'alerts',
    'budgets',
    'optimization_tips',
    'proxy_logs',
    'proxy_keys',
    'api_keys',
    'providers',
    'projects',
    'members',
    'user_preferences',
  ]

  for (const table of tables) {
    try {
      const rows = await bkend.get<{ id: string }[]>(`/${table}`, { params: { orgId } })
      for (const row of rows) {
        await bkend.delete(`/${table}/${row.id}`)
      }
    } catch {
      // 테이블이 없거나 데이터 없으면 skip
    }
  }

  // 3. 조직 삭제
  await bkend.delete(`/organizations/${orgId}`)

  // 4. 사용자 삭제
  await bkend.delete(`/users/${userId}`)
}

// ---- API Key Summary ----

export interface ApiKeySummary {
  providerId: string
  providerType: string
  providerName: string
  keyId: string
  label: string
  keyPrefix: string
  isActive: boolean
  lastSyncAt?: string
}

export async function getApiKeySummary(orgId: string): Promise<ApiKeySummary[]> {
  const providers = await bkend.get<{
    id: string; type: string; name: string; lastSyncAt?: string
  }[]>('/providers', { params: { orgId } })

  const summaries: ApiKeySummary[] = []

  for (const p of providers) {
    const keys = await bkend.get<{
      id: string; label: string; keyPrefix: string; isActive: boolean
    }[]>('/api_keys', { params: { providerId: p.id } })

    for (const k of keys) {
      summaries.push({
        providerId: p.id,
        providerType: p.type,
        providerName: p.name,
        keyId: k.id,
        label: k.label,
        keyPrefix: k.keyPrefix,
        isActive: k.isActive,
        lastSyncAt: p.lastSyncAt,
      })
    }
  }

  return summaries
}
