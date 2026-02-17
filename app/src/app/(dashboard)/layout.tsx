'use client'

import { NavBar } from '@/components/layout/NavBar'
import { ToastContainer } from '@/components/ui/Toast'
import { AnalyticsProvider } from '@/features/analytics/providers/AnalyticsProvider'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <NavBar />
      <ToastContainer />
      <AnalyticsProvider>
        <main className="mx-auto max-w-7xl px-4 pt-20 pb-8 lg:px-6">
          {children}
        </main>
      </AnalyticsProvider>
    </div>
  )
}
