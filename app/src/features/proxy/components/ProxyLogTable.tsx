'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { DataTable } from '@/components/ui/DataTable'
import { PROVIDER_LABELS } from '@/lib/constants'
import type { ProxyLog } from '@/types/proxy'

interface ProxyLogTableProps {
  logs: ProxyLog[]
  loading: boolean
  offset: number
  onNextPage: () => void
  onPrevPage: () => void
}

export function ProxyLogTable({ logs, loading, offset, onNextPage, onPrevPage }: ProxyLogTableProps) {
  const [feedbackState, setFeedbackState] = useState<Record<string, 'positive' | 'negative'>>({})

  const submitFeedback = async (logId: string, feedback: 'positive' | 'negative') => {
    try {
      const res = await fetch(`/api/proxy/logs/${logId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback }),
      })
      if (res.ok) setFeedbackState((prev) => ({ ...prev, [logId]: feedback }))
    } catch {
      // Silent fail
    }
  }

  const columns = [
    {
      key: 'createdAt',
      header: '시간',
      render: (log: ProxyLog) => (
        <span className="text-xs text-gray-500 dark:text-slate-400">
          {new Date(log.createdAt).toLocaleString('ko-KR')}
        </span>
      ),
    },
    {
      key: 'providerType',
      header: '프로바이더',
      render: (log: ProxyLog) => PROVIDER_LABELS[log.providerType] || log.providerType,
    },
    {
      key: 'model',
      header: '모델',
      render: (log: ProxyLog) => (
        <div>
          <code className="text-xs">{log.model}</code>
          {log.originalModel && (
            <div className="text-[10px] text-gray-400 dark:text-slate-500">
              원본: {log.originalModel}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'tokens',
      header: '토큰',
      align: 'right' as const,
      render: (log: ProxyLog) => (
        <span className="text-xs">
          {log.inputTokens.toLocaleString()} / {log.outputTokens.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'cost',
      header: '비용',
      align: 'right' as const,
      render: (log: ProxyLog) => {
        const hasSavings = log.savedAmount > 0
        return (
          <div className="text-right">
            <span className="font-mono text-xs">${Number(log.cost).toFixed(4)}</span>
            {hasSavings && (
              <div className="text-[10px] text-gray-400 dark:text-slate-500 line-through">
                ${Number(log.originalCost).toFixed(4)}
              </div>
            )}
          </div>
        )
      },
    },
    {
      key: 'savings',
      header: '절감',
      align: 'right' as const,
      render: (log: ProxyLog) => {
        if (log.savedAmount <= 0) {
          return <span className="text-xs text-gray-300 dark:text-slate-600">-</span>
        }
        const savingsPercent = log.originalCost > 0
          ? ((log.savedAmount / log.originalCost) * 100).toFixed(0)
          : '0'
        return (
          <div className="text-right">
            <span className="font-mono text-xs font-medium text-emerald-600">
              -${Number(log.savedAmount).toFixed(4)}
            </span>
            <div className="text-[10px] text-emerald-500">{savingsPercent}% 할인</div>
          </div>
        )
      },
    },
    {
      key: 'latencyMs',
      header: '지연시간',
      align: 'right' as const,
      render: (log: ProxyLog) => (
        <span className="text-xs">{log.latencyMs}ms</span>
      ),
    },
    {
      key: 'statusCode',
      header: '상태',
      align: 'center' as const,
      render: (log: ProxyLog) => (
        <div className="flex items-center gap-1">
          <Badge variant={log.statusCode < 400 ? 'default' : 'danger'}>
            {log.statusCode}
          </Badge>
          {log.cacheHit && (
            <span className="rounded bg-blue-100 dark:bg-blue-950/50 px-1 py-0.5 text-[10px] font-medium text-blue-700 dark:text-blue-400">
              CACHE
            </span>
          )}
          {log.fallbackProvider && (
            <span className="rounded bg-amber-100 dark:bg-amber-950/50 px-1 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400" title={`Fallback: ${log.fallbackProvider}/${log.fallbackModel}`}>
              FB
            </span>
          )}
          {log.errorMessage?.startsWith('[GUARDRAIL]') && (
            <span className="rounded bg-violet-100 dark:bg-violet-950/50 px-1 py-0.5 text-[10px] font-medium text-violet-700 dark:text-violet-400">
              BLOCK
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'feedback',
      header: '피드백',
      align: 'center' as const,
      render: (log: ProxyLog) => {
        if (!log.originalModel) return <span className="text-xs text-gray-300 dark:text-slate-600">-</span>
        const current = feedbackState[log.id] ?? log.userFeedback
        return (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => submitFeedback(log.id, 'positive')}
              className={`rounded px-1.5 py-0.5 text-xs transition-colors ${
                current === 'positive'
                  ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400'
                  : 'text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-600 dark:hover:text-slate-300'
              }`}
              title="라우팅 결과 만족"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => submitFeedback(log.id, 'negative')}
              className={`rounded px-1.5 py-0.5 text-xs transition-colors ${
                current === 'negative'
                  ? 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400'
                  : 'text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-600 dark:hover:text-slate-300'
              }`}
              title="라우팅 결과 불만족"
            >
              -
            </button>
          </div>
        )
      },
    },
  ]

  if (loading) {
    return <div className="py-8 text-center text-gray-400 dark:text-slate-500">로그 로딩 중...</div>
  }

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={logs}
        keyExtractor={(log) => log.id}
        emptyMessage="프록시 로그가 없습니다"
        ariaLabel="프록시 요청 로그"
      />
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrevPage}
          disabled={offset === 0}
        >
          이전
        </Button>
        <span className="text-sm text-gray-500 dark:text-slate-400">
          {offset + 1} - {offset + logs.length} 표시 중
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={onNextPage}
          disabled={logs.length < 50}
        >
          다음
        </Button>
      </div>
    </div>
  )
}
