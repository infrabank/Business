import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '대시보드',
}

export default function DashboardPageLayout({ children }: { children: React.ReactNode }) {
  return children
}
