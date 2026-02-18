import { create } from 'zustand'
import type { CurrencyCode, DateFormatType, NumberFormatType, DashboardPeriod } from '@/types/settings'
import type { Theme } from '@/types/theme'
import type { Locale } from '@/lib/i18n'

interface User {
  id: string
  email: string
  name: string
  plan?: string
}

interface Preferences {
  currency: CurrencyCode
  dateFormat: DateFormatType
  numberFormat: NumberFormatType
  dashboardPeriod: DashboardPeriod
  theme: Theme
}

interface AppState {
  currentUser: User | null
  currentOrgId: string | null
  sidebarOpen: boolean
  preferences: Preferences
  locale: Locale
  preferencesLoaded: boolean
  setCurrentUser: (user: User | null) => void
  setCurrentOrgId: (id: string | null) => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  clearSession: () => void
  setLocale: (locale: Locale) => void
  setPreferences: (prefs: Partial<Preferences>) => void
  setPreferencesLoaded: (loaded: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  currentUser: null,
  currentOrgId: null,
  sidebarOpen: true,
  preferences: {
    currency: 'USD',
    dateFormat: 'YYYY-MM-DD',
    numberFormat: '1,000.00',
    dashboardPeriod: 30,
    theme: 'system',
  },
  locale: (typeof globalThis !== 'undefined' && 'localStorage' in globalThis
    ? (localStorage.getItem('locale') as Locale) || 'ko'
    : 'ko') as Locale,
  preferencesLoaded: false,
  setCurrentUser: (user) => set({ currentUser: user }),
  setCurrentOrgId: (id) => set({ currentOrgId: id }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  clearSession: () => set({ currentUser: null, currentOrgId: null }),
  setLocale: (locale) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem('locale', locale)
    set({ locale })
  },
  setPreferences: (prefs) => set((s) => ({
    preferences: { ...s.preferences, ...prefs },
  })),
  setPreferencesLoaded: (loaded) => set({ preferencesLoaded: loaded }),
}))
