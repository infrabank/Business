// ---- User Preferences ----

export type CurrencyCode = 'USD' | 'KRW' | 'EUR' | 'JPY'
export type DateFormatType = 'YYYY-MM-DD' | 'MM/DD/YYYY' | 'DD/MM/YYYY'
export type NumberFormatType = '1,000.00' | '1.000,00'
export type DashboardPeriod = 7 | 30 | 90

export interface UserPreferences {
  id: string
  userId: string
  currency: CurrencyCode
  dateFormat: DateFormatType
  numberFormat: NumberFormatType
  dashboardPeriod: DashboardPeriod
  createdAt: string
  updatedAt: string
}

export const DEFAULT_PREFERENCES: Omit<UserPreferences, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
  currency: 'USD',
  dateFormat: 'YYYY-MM-DD',
  numberFormat: '1,000.00',
  dashboardPeriod: 30,
}

// ---- Settings Tab ----

export type SettingsTab = 'general' | 'organization' | 'notifications' | 'subscription' | 'security'

export const SETTINGS_TABS: { id: SettingsTab; label: string; icon: string }[] = [
  { id: 'general', label: '일반', icon: 'Settings' },
  { id: 'organization', label: '조직', icon: 'Building' },
  { id: 'notifications', label: '알림', icon: 'Bell' },
  { id: 'subscription', label: '구독', icon: 'CreditCard' },
  { id: 'security', label: '보안', icon: 'Shield' },
]

// ---- Password Change ----

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

// ---- Danger Zone ----

export interface DeleteAccountRequest {
  confirmation: string
}

export interface ResetDataRequest {
  confirmation: string
  orgId: string
}
