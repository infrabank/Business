'use client'

import { useEffect } from 'react'
import { Check, Loader2 } from 'lucide-react'

interface SyncStepProps {
  syncStatus: 'idle' | 'syncing' | 'done' | 'error'
  syncSummary: { totalCost: number; totalRequests: number } | null
  onStartSync: () => Promise<void>
}

export function SyncStep({ syncStatus, syncSummary, onStartSync }: SyncStepProps) {
  // Auto-start sync on mount
  useEffect(() => {
    if (syncStatus === 'idle') {
      onStartSync()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (syncStatus === 'idle' || syncStatus === 'syncing') {
    return (
      <div className="text-center">
        <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-500" />
        <h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-slate-100">데이터를 가져오고 있습니다</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">잠시만 기다려 주세요...</p>
        <div className="mx-auto mt-6 h-2 w-64 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div className="h-full animate-pulse rounded-full bg-blue-500" style={{ width: '60%' }} />
        </div>
      </div>
    )
  }

  const hasData = syncSummary && (syncSummary.totalCost > 0 || syncSummary.totalRequests > 0)

  return (
    <div className="text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
        <Check className="h-8 w-8 text-green-600" />
      </div>
      <h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-slate-100">동기화 완료!</h2>

      {hasData ? (
        <div className="mx-auto mt-6 grid max-w-xs grid-cols-2 gap-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm">
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">${syncSummary!.totalCost.toFixed(2)}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">총 비용</p>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm">
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{syncSummary!.totalRequests.toLocaleString()}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">요청 수</p>
          </div>
        </div>
      ) : (
        <div className="mx-auto mt-6 max-w-sm rounded-xl border border-blue-100 bg-blue-50 dark:bg-blue-950/50/50 p-4">
          <p className="text-sm text-blue-700 dark:text-blue-400">
            아직 API 사용 이력이 없습니다.
          </p>
          <p className="mt-1 text-xs text-blue-500">
            괜찮습니다! API를 사용하기 시작하면 자동으로 추적됩니다.
          </p>
        </div>
      )}
    </div>
  )
}
