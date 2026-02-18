import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '분석',
}

export default function AnalyticsPageLayout({ children }: { children: React.ReactNode }) {
  return children
}
