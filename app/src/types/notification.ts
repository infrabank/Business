import type { AlertType } from './alert'

// ---- Channel Types ----

export type ChannelType = 'email' | 'slack' | 'webhook'
export type DeliveryStatus = 'pending' | 'sent' | 'failed' | 'retrying'
export type DeliveryMode = 'instant' | 'digest' | 'both'

export interface EmailConfig {
  recipients: string[]
}

export interface SlackConfig {
  webhookUrl: string
  channel?: string
}

export interface WebhookConfig {
  url: string
  headers?: Record<string, string>
  secret?: string
}

export interface NotificationChannel {
  id: string
  orgId: string
  type: ChannelType
  name: string
  enabled: boolean
  config: EmailConfig | SlackConfig | WebhookConfig
  alertTypes: AlertType[]
  severityFilter?: ('warning' | 'critical')[]
  createdAt: string
  updatedAt: string
}

// ---- Preferences ----

export interface NotificationPreferences {
  id: string
  orgId: string
  enabled: boolean
  digestEnabled: boolean
  digestTime: string
  timezone: string
  deliveryMode: DeliveryMode
  createdAt: string
  updatedAt: string
}

export const DEFAULT_NOTIFICATION_PREFERENCES: Omit<NotificationPreferences, 'id' | 'orgId'> = {
  enabled: true,
  digestEnabled: false,
  digestTime: '09:00',
  timezone: 'Asia/Seoul',
  deliveryMode: 'instant',
  createdAt: '',
  updatedAt: '',
}

// ---- Notification Log ----

export interface NotificationLog {
  id: string
  orgId: string
  alertId: string
  channelId: string
  channelType: ChannelType
  status: DeliveryStatus
  attempts: number
  lastAttemptAt: string
  error?: string
  sentAt?: string
  createdAt: string
}

// ---- Channel Adapter Interface ----

export interface ChannelSendPayload {
  alert: {
    id: string
    type: AlertType
    title: string
    message: string
    metadata?: Record<string, unknown>
    sentAt: string
  }
  orgName: string
  dashboardUrl: string
}

export interface ChannelSendResult {
  success: boolean
  error?: string
}
