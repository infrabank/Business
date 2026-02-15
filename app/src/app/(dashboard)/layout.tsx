import { NavBar } from '@/components/layout/NavBar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="mx-auto max-w-7xl px-4 pt-20 pb-8 lg:px-6">
        {children}
      </main>
    </div>
  )
}
