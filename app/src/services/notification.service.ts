import { bkend } from '@/lib/bkend'
import { encrypt, decrypt, maskKey } from './encryption.service'
import { sendEmail } from './notification-email.service'
import { sendSlack } from './notification-slack.service'
import { sendWebhook } from './notification-webhook.service'
import type { Alert } from '@/types'
import type {
  NotificationChannel,
  NotificationPreferences,
  NotificationLog,
  ChannelSendPayload,
  ChannelSendResult,
  EmailConfig,
  SlackConfig,
  WebhookConfig,
  ChannelType,
} from '@/types/notification'
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@/types/notification'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.llmcost.app'
const MAX_RETRY = 3
const RETRY_DELAYS = [1000, 4000, 16000]

// ---- Preferences CRUD ----

export async function getPreferences(orgId: string, token: string): Promise<NotificationPreferences> {
  const results = await bkend.get<NotificationPreferences[]>('/notification-preferences', {
    token,
    params: { orgId },
  })
  if (results.length > 0) return results[0]

  const now = new Date().toISOString()
  return bkend.post<NotificationPreferences>('/notification-preferences', {
    orgId,
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    createdAt: now,
    updatedAt: now,
  } as Record<string, unknown>, { token })
}

export async function updatePreferences(
  prefsId: string,
  updates: Partial<Pick<NotificationPreferences, 'enabled' | 'digestEnabled' | 'digestTime' | 'timezone' | 'deliveryMode'>>,
  token: string,
): Promise<NotificationPreferences> {
  return bkend.patch<NotificationPreferences>(`/notification-preferences/${prefsId}`, {
    ...updates,
    updatedAt: new Date().toISOString(),
  }, { token })
}

// ---- Channel CRUD ----

export async function getChannels(orgId: string, token: string): Promise<NotificationChannel[]> {
  return bkend.get<NotificationChannel[]>('/notification-channels', {
    token,
    params: { orgId },
  })
}

export async function createChannel(
  orgId: string,
  data: { type: ChannelType; name: string; config: EmailConfig | SlackConfig | WebhookConfig; alertTypes: string[]; severityFilter?: string[] },
  token: string,
): Promise<NotificationChannel> {
  const encryptedConfig = encryptConfig(data.type, data.config)
  const now = new Date().toISOString()

  return bkend.post<NotificationChannel>('/notification-channels', {
    orgId,
    type: data.type,
    name: data.name,
    enabled: true,
    config: encryptedConfig,
    alertTypes: data.alertTypes,
    severityFilter: data.severityFilter || [],
    createdAt: now,
    updatedAt: now,
  } as Record<string, unknown>, { token })
}

export async function updateChannel(
  channelId: string,
  updates: Partial<Pick<NotificationChannel, 'name' | 'enabled' | 'config' | 'alertTypes' | 'severityFilter'>>,
  channelType: ChannelType,
  token: string,
): Promise<NotificationChannel> {
  const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() }
  if (updates.name !== undefined) patch.name = updates.name
  if (updates.enabled !== undefined) patch.enabled = updates.enabled
  if (updates.alertTypes !== undefined) patch.alertTypes = updates.alertTypes
  if (updates.severityFilter !== undefined) patch.severityFilter = updates.severityFilter
  if (updates.config !== undefined) patch.config = encryptConfig(channelType, updates.config)

  return bkend.patch<NotificationChannel>(`/notification-channels/${channelId}`, patch, { token })
}

export async function deleteChannel(channelId: string, token: string): Promise<void> {
  await bkend.delete(`/notification-channels/${channelId}`, { token })
}

// ---- Test Channel ----

export async function testChannel(
  channel: NotificationChannel,
  orgName: string,
): Promise<ChannelSendResult> {
  const payload: ChannelSendPayload = {
    alert: {
      id: 'test',
      type: 'budget_warning',
      title: '테스트 알림',
      message: '이것은 알림 채널 테스트 메시지입니다. 정상적으로 수신되면 채널이 올바르게 설정된 것입니다.',
      sentAt: new Date().toISOString(),
    },
    orgName,
    dashboardUrl: APP_URL + '/dashboard',
  }

  const config = decryptConfig(channel.type, channel.config)
  return sendToChannel(channel.type, config, payload)
}

// ---- Core: Dispatch Notification ----

export async function dispatchNotification(
  alert: Alert,
  orgId: string,
  token: string,
): Promise<void> {
  const prefs = await getPreferences(orgId, token)
  if (!prefs.enabled) return
  if (prefs.deliveryMode === 'digest') return

  const channels = await getChannels(orgId, token)
  const active = channels.filter((ch) => ch.enabled && ch.alertTypes.includes(alert.type))

  // Get org name for payload
  let orgName = 'My Organization'
  try {
    const orgs = await bkend.get<Array<{ name: string }>>('/organizations', { token, params: { id: orgId } })
    if (orgs.length > 0) orgName = orgs[0].name
  } catch { /* fallback to default */ }

  const payload: ChannelSendPayload = {
    alert: {
      id: alert.id,
      type: alert.type,
      title: alert.title,
      message: alert.message,
      metadata: alert.metadata,
      sentAt: alert.sentAt,
    },
    orgName,
    dashboardUrl: APP_URL + '/dashboard',
  }

  for (const channel of active) {
    // Check severity filter
    if (channel.severityFilter && channel.severityFilter.length > 0) {
      const severity = alert.metadata?.severity as 'warning' | 'critical' | undefined
      if (severity && !channel.severityFilter.includes(severity)) continue
    }

    // Check 24h dedup
    const recent = await bkend.get<NotificationLog[]>('/notification-logs', {
      token,
      params: {
        orgId,
        alertId: alert.id,
        channelId: channel.id,
        status: 'sent',
      },
    })
    if (recent.length > 0) continue

    const config = decryptConfig(channel.type, channel.config)
    await sendWithRetry(channel, config, payload, orgId, alert.id, token)
  }
}

// ---- Retry Logic ----

async function sendWithRetry(
  channel: NotificationChannel,
  config: EmailConfig | SlackConfig | WebhookConfig,
  payload: ChannelSendPayload,
  orgId: string,
  alertId: string,
  token: string,
): Promise<void> {
  let attempts = 0
  let lastError = ''

  for (let i = 0; i < MAX_RETRY; i++) {
    attempts++
    const result = await sendToChannel(channel.type, config, payload)

    if (result.success) {
      await createLog(orgId, alertId, channel.id, channel.type, 'sent', attempts, token)
      return
    }

    lastError = result.error || 'Unknown error'

    if (i < MAX_RETRY - 1) {
      await sleep(RETRY_DELAYS[i])
    }
  }

  await createLog(orgId, alertId, channel.id, channel.type, 'failed', attempts, token, lastError)
}

// ---- Channel Router ----

async function sendToChannel(
  type: ChannelType,
  config: EmailConfig | SlackConfig | WebhookConfig,
  payload: ChannelSendPayload,
): Promise<ChannelSendResult> {
  switch (type) {
    case 'email':
      return sendEmail(config as EmailConfig, payload)
    case 'slack':
      return sendSlack(config as SlackConfig, payload)
    case 'webhook':
      return sendWebhook(config as WebhookConfig, payload)
  }
}

// ---- Log CRUD ----

async function createLog(
  orgId: string,
  alertId: string,
  channelId: string,
  channelType: ChannelType,
  status: 'sent' | 'failed',
  attempts: number,
  token: string,
  error?: string,
): Promise<void> {
  const now = new Date().toISOString()
  await bkend.post('/notification-logs', {
    orgId,
    alertId,
    channelId,
    channelType,
    status,
    attempts,
    lastAttemptAt: now,
    error: error || null,
    sentAt: status === 'sent' ? now : null,
    createdAt: now,
  } as Record<string, unknown>, { token })
}

export async function getLogs(
  orgId: string,
  token: string,
  days: number = 30,
): Promise<NotificationLog[]> {
  const from = new Date()
  from.setDate(from.getDate() - days)
  return bkend.get<NotificationLog[]>('/notification-logs', {
    token,
    params: {
      orgId,
      createdAt_gte: from.toISOString(),
      _sort: 'createdAt',
      _order: 'desc',
    },
  })
}

// ---- Config Encryption Helpers ----

function encryptConfig(type: ChannelType, config: EmailConfig | SlackConfig | WebhookConfig): EmailConfig | SlackConfig | WebhookConfig {
  if (type === 'slack') {
    const c = config as SlackConfig
    return { ...c, webhookUrl: encrypt(c.webhookUrl) }
  }
  if (type === 'webhook') {
    const c = config as WebhookConfig
    const encrypted: WebhookConfig = { ...c }
    if (c.secret) encrypted.secret = encrypt(c.secret)
    if (c.headers) {
      encrypted.headers = {}
      for (const [k, v] of Object.entries(c.headers)) {
        encrypted.headers[k] = encrypt(v)
      }
    }
    return encrypted
  }
  return config
}

function decryptConfig(type: ChannelType, config: EmailConfig | SlackConfig | WebhookConfig): EmailConfig | SlackConfig | WebhookConfig {
  if (type === 'slack') {
    const c = config as SlackConfig
    return { ...c, webhookUrl: decrypt(c.webhookUrl) }
  }
  if (type === 'webhook') {
    const c = config as WebhookConfig
    const decrypted: WebhookConfig = { ...c }
    if (c.secret) decrypted.secret = decrypt(c.secret)
    if (c.headers) {
      decrypted.headers = {}
      for (const [k, v] of Object.entries(c.headers)) {
        try { decrypted.headers[k] = decrypt(v) } catch { decrypted.headers[k] = v }
      }
    }
    return decrypted
  }
  return config
}

export function maskConfig(type: ChannelType, config: EmailConfig | SlackConfig | WebhookConfig): EmailConfig | SlackConfig | WebhookConfig {
  if (type === 'slack') {
    const c = config as SlackConfig
    return { ...c, webhookUrl: maskKey(c.webhookUrl) }
  }
  if (type === 'webhook') {
    const c = config as WebhookConfig
    return {
      ...c,
      secret: c.secret ? '****' : undefined,
      headers: c.headers
        ? Object.fromEntries(Object.entries(c.headers).map(([k]) => [k, '****']))
        : undefined,
    }
  }
  return config
}

// ---- Helpers ----

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
