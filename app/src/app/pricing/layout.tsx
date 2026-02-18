import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '요금제',
  description: 'LLM Cost Manager 요금제. Free 플랜으로 시작하고 Growth로 업그레이드하세요. 커미션 기반 — 절감한 만큼만 지불합니다.',
  openGraph: {
    title: '요금제 | LLM Cost Manager',
    description: 'Free 플랜으로 시작하고 Growth로 업그레이드하세요. 커미션 기반 과금.',
  },
}

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children
}
