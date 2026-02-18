'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import type { SyncHistory as SyncHistoryType } from '@/types'

interface SyncHistoryProps {
  orgId: string
  providerId: string
  refreshKey?: number
}

const STATUS_STYLES: Record<string, { dot: string; label: string }> = {
  success: { dot: 'bg-green-500', label: '성공' },
  failed: { dot: 'bg-red-500', label: '실패' },
  partial: { dot: 'bg-yellow-500', label: '부분 성공' },
  running: { dot: 'bg-blue-500 animate-pulse', label: '실행 중' },
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function SyncHistory({ orgId, providerId, refreshKey }: SyncHistoryProps) {
  const [history, setHistory] = useState<SyncHistoryType[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchHistory = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        orgId,
        providerId,
        limit: '5',
        offset: '0',
      })

      const res = await fetch(`/api/sync/history?${params}`)

      if (res.ok) {
        const data = await res.json()
        setHistory(data.data || [])
      }
    } catch {
      // Silently fail - history is non-critical
    } finally {
      setIsLoading(false)
    }
  }, [orgId, providerId])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory, refreshKey])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">동기화 기록</h3>
        </CardHeader>
        <CardContent>
          <div className="h-24 animate-pulse rounded bg-gray-100 dark:bg-slate-700" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">동기화 기록</h3>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-slate-400">동기화 기록이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {history.map((entry) => {
              const statusStyle = STATUS_STYLES[entry.status] || STATUS_STYLES.failed
              return (
                <div key={entry.id} className="flex items-center gap-3 text-sm">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${statusStyle.dot}`} />
                  <span className="w-36 shrink-0 text-gray-600 dark:text-slate-400">
                    {formatDate(entry.startedAt)}
                  </span>
                  <span className={`w-16 shrink-0 font-medium ${
                    entry.status === 'success' ? 'text-green-700 dark:text-green-400' :
                    entry.status === 'failed' ? 'text-red-700 dark:text-red-400' :
                    entry.status === 'partial' ? 'text-yellow-700 dark:text-yellow-400' :
                    'text-blue-700 dark:text-blue-400'
                  }`}>
                    {statusStyle.label}
                  </span>
                  <span className="text-gray-500 dark:text-slate-400">
                    {entry.status === 'failed' ? (
                      <span className="text-red-600 dark:text-red-400">{entry.errorMessage || '오류'}</span>
                    ) : (
                      <>+{entry.recordsCreated}건 / ~{entry.recordsUpdated}건</>
                    )}
                  </span>
                  <span className="ml-auto text-gray-400 dark:text-slate-500">
                    {formatDuration(entry.durationMs)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
