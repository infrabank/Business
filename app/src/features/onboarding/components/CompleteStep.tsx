'use client'

import { PartyPopper, Wallet, Bell, FileText } from 'lucide-react'

const NEXT_ACTIONS = [
  { icon: Wallet, title: '예산 설정', desc: '월별 예산 한도를 설정하세요' },
  { icon: Bell, title: '알림 설정', desc: '예산 초과 알림을 받으세요' },
  { icon: FileText, title: '리포트 확인', desc: '비용 분석 리포트를 확인하세요' },
]

export function CompleteStep() {
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
        <PartyPopper className="h-8 w-8 text-green-600" />
      </div>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">설정이 완료되었습니다!</h2>
      <p className="mt-2 text-slate-500 dark:text-slate-400 dark:text-slate-500">이제 LLM 비용을 효율적으로 관리할 준비가 되었습니다</p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {NEXT_ACTIONS.map((a) => (
          <div
            key={a.title}
            className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900 p-4 shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50 dark:bg-blue-950/50/30"
          >
            <a.icon className="mx-auto h-6 w-6 text-blue-500" />
            <h3 className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-200">{a.title}</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">{a.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
