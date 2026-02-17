import { bkend } from '@/lib/bkend'
import type { Alert } from '@/types'
import type { NotificationChannel, EmailConfig } from '@/types/notification'
import { getPreferences, getChannels } from './notification.service'
import { sendEmail, buildDigestEmailHtml } from './notification-email.service'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.llmcost.app'

export async function sendDigestForOrg(
  orgId: string,
  token: string,
): Promise<{ sent: boolean; alertCount: number }> {
  const prefs = await getPreferences(orgId, token)

  if (!prefs.enabled || !prefs.digestEnabled) {
    return { sent: false, alertCount: 0 }
  }

  if (prefs.deliveryMode !== 'digest' && prefs.deliveryMode !== 'both') {
    return { sent: false, alertCount: 0 }
  }

  // Get yesterday's alerts
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  yesterday.setHours(0, 0, 0, 0)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const alerts = await bkend.get<Alert[]>('/alerts', {
    token,
    params: {
      orgId,
      sentAt_gte: yesterday.toISOString(),
      sentAt_lt: today.toISOString(),
      _sort: 'sentAt',
      _order: 'desc',
    },
  })

  if (alerts.length === 0) {
    return { sent: false, alertCount: 0 }
  }

  // Get org name
  let orgName = 'My Organization'
  try {
    const orgs = await bkend.get<Array<{ name: string }>>('/organizations', {
      token,
      params: { id: orgId },
    })
    if (orgs.length > 0) orgName = orgs[0].name
  } catch { /* fallback */ }

  // Find email channels for digest
  const channels = await getChannels(orgId, token)
  const emailChannels = channels.filter((ch) => ch.type === 'email' && ch.enabled)

  if (emailChannels.length === 0) {
    return { sent: false, alertCount: alerts.length }
  }

  // Build digest content
  const digestAlerts = alerts.map((a) => ({
    type: a.type,
    title: a.title,
    message: a.message,
    sentAt: a.sentAt,
  }))

  const html = buildDigestEmailHtml(digestAlerts, orgName, APP_URL)

  // Send to all email channels
  let sent = false
  for (const channel of emailChannels) {
    const config = channel.config as EmailConfig
    const result = await sendEmail(
      config,
      {
        alert: {
          id: 'digest',
          type: 'budget_warning',
          title: `${orgName} 일별 알림 요약 (${alerts.length}건)`,
          message: '',
          sentAt: new Date().toISOString(),
        },
        orgName,
        dashboardUrl: APP_URL + '/dashboard',
      },
    )

    if (result.success) sent = true

    // Log
    const now = new Date().toISOString()
    await bkend.post('/notification-logs', {
      orgId,
      alertId: 'digest',
      channelId: channel.id,
      channelType: 'email',
      status: result.success ? 'sent' : 'failed',
      attempts: 1,
      lastAttemptAt: now,
      error: result.error || null,
      sentAt: result.success ? now : null,
      createdAt: now,
    } as Record<string, unknown>, { token })
  }

  return { sent, alertCount: alerts.length }
}
