import { create } from 'zustand'
import type { CurrencyCode, DateFormatType, NumberFormatType, DashboardPeriod } from '@/types/settings'

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
}

interface AppState {
  currentUser: User | null
  currentOrgId: string | null
  sidebarOpen: boolean
  preferences: Preferences
  preferencesLoaded: boolean
  setCurrentUser: (user: User | null) => void
  setCurrentOrgId: (id: string | null) => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  clearSession: () => void
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
  },
  preferencesLoaded: false,
  setCurrentUser: (user) => set({ currentUser: user }),
  setCurrentOrgId: (id) => set({ currentOrgId: id }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  clearSession: () => set({ currentUser: null, currentOrgId: null }),
  setPreferences: (prefs) => set((s) => ({
    preferences: { ...s.preferences, ...prefs },
  })),
  setPreferencesLoaded: (loaded) => set({ preferencesLoaded: loaded }),
}))
