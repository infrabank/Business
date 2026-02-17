import type { SlackConfig, ChannelSendPayload, ChannelSendResult } from '@/types/notification'
import { decrypt } from './encryption.service'

const ALERT_EMOJI: Record<string, string> = {
  budget_warning: ':warning:',
  budget_exceeded: ':rotating_light:',
  anomaly: ':chart_with_upwards_trend:',
  optimization: ':bulb:',
}

const ALERT_COLOR: Record<string, string> = {
  budget_warning: '#F59E0B',
  budget_exceeded: '#EF4444',
  anomaly: '#DC2626',
  optimization: '#3B82F6',
}

export async function sendSlack(
  config: SlackConfig,
  payload: ChannelSendPayload,
): Promise<ChannelSendResult> {
  try {
    const webhookUrl = decrypt(config.webhookUrl)
    const emoji = ALERT_EMOJI[payload.alert.type] || ':bell:'
    const color = ALERT_COLOR[payload.alert.type] || '#6B7280'

    const body = {
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: `${emoji} ${payload.alert.title}`, emoji: true },
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: payload.alert.message },
        },
        {
          type: 'context',
          elements: [
            { type: 'mrkdwn', text: `*${payload.orgName}* · ${new Date(payload.alert.sentAt).toLocaleString('ko-KR')}` },
          ],
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: '대시보드에서 확인' },
              url: payload.dashboardUrl,
              style: 'primary',
            },
          ],
        },
      ],
      attachments: [{ color, fallback: payload.alert.title }],
    }

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      return { success: true }
    }

    const text = await res.text()
    return { success: false, error: `Slack ${res.status}: ${text}` }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}
