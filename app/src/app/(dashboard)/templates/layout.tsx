import type { Metadata } from 'next'

export const metadata: Metadata = { title: '템플릿' }

export default function TemplatesPageLayout({ children }: { children: React.ReactNode }) {
  return children
}
