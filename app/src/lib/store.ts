import { create } from 'zustand'

interface User {
  id: string
  email: string
  name: string
}

interface AppState {
  currentUser: User | null
  currentOrgId: string | null
  sidebarOpen: boolean
  setCurrentUser: (user: User | null) => void
  setCurrentOrgId: (id: string | null) => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  clearSession: () => void
}

export const useAppStore = create<AppState>((set) => ({
  currentUser: null,
  currentOrgId: null,
  sidebarOpen: true,
  setCurrentUser: (user) => set({ currentUser: user }),
  setCurrentOrgId: (id) => set({ currentOrgId: id }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  clearSession: () => set({ currentUser: null, currentOrgId: null }),
}))
