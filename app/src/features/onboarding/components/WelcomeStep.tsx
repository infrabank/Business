'use client'

import { DollarSign, BarChart3, Bell, Zap } from 'lucide-react'

const FEATURES = [
  { icon: DollarSign, title: '비용 통합 관리', desc: 'OpenAI, Anthropic, Google 비용을 한눈에' },
  { icon: BarChart3, title: '실시간 분석', desc: '사용량 트렌드, 모델별 비교, 최적화 제안' },
  { icon: Bell, title: '예산 알림', desc: '예산 초과 시 즉시 알림, 이상 지출 감지' },
]

export function WelcomeStep() {
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100">
        <Zap className="h-8 w-8 text-blue-600" />
      </div>
      <h2 className="text-2xl font-bold text-slate-900">LLM 비용, 이제 똑똑하게 관리하세요</h2>
      <p className="mt-2 text-slate-500">API 비용을 통합 관리하고 최적화할 준비를 해볼까요?</p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm">
            <f.icon className="mx-auto h-6 w-6 text-blue-500" />
            <h3 className="mt-2 text-sm font-semibold text-slate-800">{f.title}</h3>
            <p className="mt-1 text-xs text-slate-500">{f.desc}</p>
          </div>
        ))}
      </div>

      <p className="mt-6 text-sm text-slate-400">약 2분이면 설정을 완료할 수 있습니다</p>
    </div>
  )
}
