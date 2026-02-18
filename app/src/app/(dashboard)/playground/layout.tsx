import type { Metadata } from 'next'

export const metadata: Metadata = { title: '플레이그라운드' }

export default function PlaygroundPageLayout({ children }: { children: React.ReactNode }) {
  return children
}
