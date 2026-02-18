import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'API 프록시',
}

export default function ProxyPageLayout({ children }: { children: React.ReactNode }) {
  return children
}
