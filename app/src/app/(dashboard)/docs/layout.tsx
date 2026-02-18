import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'API 문서',
  description: 'LLM Cost Manager 프록시 API 문서. SDK 예제, 엔드포인트 레퍼런스, 기능 가이드.',
}

export default function DocsPageLayout({ children }: { children: React.ReactNode }) {
  return children
}
