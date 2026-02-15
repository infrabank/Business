export type AlertType = 'budget_warning' | 'budget_exceeded' | 'anomaly' | 'optimization'

export interface Alert {
  id: string
  orgId: string
  type: AlertType
  title: string
  message: string
  metadata?: Record<string, unknown>
  isRead: boolean
  sentAt: string
}
