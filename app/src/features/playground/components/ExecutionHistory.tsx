'use client'

import { PROVIDER_LABELS, PROVIDER_COLORS } from '@/lib/constants'
import { Button } from '@/components/ui/Button'
import type { PlaygroundHistory } from '@/types/playground'

interface ExecutionHistoryProps {
  history: PlaygroundHistory[]
  onSelect: (item: PlaygroundHistory) => void
  onLoadMore: () => void
  hasMore: boolean
  loading: boolean
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return '방금'
  if (mins < 60) return `${mins}분 전`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  return `${days}일 전`
}

export function ExecutionHistory({ history, onSelect, onLoadMore, hasMore, loading }: ExecutionHistoryProps) {
  if (history.length === 0 && !loading) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 p-6 text-center">
        <p className="text-sm text-slate-400">실행 기록이 없습니다</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-900 shadow-sm">
      <div className="border-b border-slate-100 dark:border-slate-800 px-5 py-3">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">실행 기록</h3>
      </div>
      <div className="divide-y divide-slate-50 dark:divide-slate-800">
        {history.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item)}
            className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-slate-50/50 dark:hover:bg-slate-800 transition-colors"
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: PROVIDER_COLORS[item.provider] || '#6B7280' }}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-medium text-slate-600 dark:text-slate-400">
                {item.userPrompt.slice(0, 60)}{item.userPrompt.length > 60 ? '...' : ''}
              </span>
              <span className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-400">
                <span>{PROVIDER_LABELS[item.provider] || item.provider}</span>
                <span>{item.model}</span>
              </span>
            </span>
            <span className="shrink-0 text-right">
              <span className="block text-xs font-mono text-slate-500 dark:text-slate-400">
                {(item.inputTokens + item.outputTokens).toLocaleString()} tok
              </span>
              <span className="block text-[11px] text-emerald-500 dark:text-emerald-400 font-medium">
                ${item.cost.toFixed(4)}
              </span>
            </span>
            <span className="shrink-0 text-[11px] text-slate-300 dark:text-slate-500 w-16 text-right">
              {timeAgo(item.createdAt)}
            </span>
          </button>
        ))}
      </div>

      {hasMore && (
        <div className="border-t border-slate-100 dark:border-slate-800 px-5 py-3 text-center">
          <Button variant="outline" onClick={onLoadMore} disabled={loading} className="text-xs">
            {loading ? '로딩 중...' : '더 보기'}
          </Button>
        </div>
      )}
    </div>
  )
}
