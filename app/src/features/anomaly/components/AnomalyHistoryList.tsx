'use client'

import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Activity, XCircle } from 'lucide-react'
import { useAnomalyHistory } from '../hooks/useAnomalyHistory'

interface AnomalyHistoryListProps {
  orgId: string | null
}

const TYPE_LABELS: Record<string, string> = {
  daily_cost_spike: '일별 비용 급증',
  hourly_spike: '시간별 스파이크',
  model_anomaly: '모델 이상 사용',
  dormant_model_activation: '미사용 모델 활성화',
}

export function AnomalyHistoryList({ orgId }: AnomalyHistoryListProps) {
  const { events, isLoading, suppressEvent } = useAnomalyHistory(orgId)

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-indigo-500" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">이상 감지 이력</h3>
          <Badge variant="default">{events.length}건</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">최근 30일 간 감지된 이상이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-start gap-3 rounded-xl border border-slate-100 dark:border-slate-800 p-4 hover:bg-slate-50 dark:bg-slate-800/50/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={event.severity === 'critical' ? 'danger' : 'warning'}>
                      {event.severity}
                    </Badge>
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {TYPE_LABELS[event.type] ?? event.type}
                    </span>
                    {event.model && (
                      <span className="text-xs text-slate-500 dark:text-slate-400">{event.model}</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    감지값: ${event.detectedValue.toFixed(2)} / 기준값: ${event.baselineValue.toFixed(2)}
                    {event.zScore > 0 && ` (Z-score: ${event.zScore})`}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {new Date(event.detectedAt).toLocaleString('ko-KR')}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => suppressEvent(`${event.type}:${event.model ?? 'all'}`)}
                  title="이 패턴 무시"
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
