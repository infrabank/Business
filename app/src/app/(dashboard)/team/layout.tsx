import type { Metadata } from 'next'

export const metadata: Metadata = { title: '팀' }

export default function TeamPageLayout({ children }: { children: React.ReactNode }) {
  return children
}
