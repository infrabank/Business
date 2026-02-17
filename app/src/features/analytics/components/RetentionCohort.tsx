'use client'

import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { cn } from '@/lib/utils'
import type { RetentionCohort as RetentionCohortType } from '@/types/analytics'

interface RetentionCohortProps {
  data: RetentionCohortType[]
  isLoading: boolean
}

function getRetentionColor(rate: number): string {
  if (rate >= 75) return 'bg-indigo-600 text-white'
  if (rate >= 50) return 'bg-indigo-400 text-white'
  if (rate >= 25) return 'bg-indigo-200 text-indigo-900'
  if (rate > 0) return 'bg-indigo-100 text-indigo-700'
  return 'bg-slate-50 text-slate-400'
}

export function RetentionCohort({ data, isLoading }: RetentionCohortProps) {
  if (isLoading) {
    return <div className="h-64 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader><h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">리텐션 코호트</h3></CardHeader>
        <CardContent><p className="text-sm text-slate-500 dark:text-slate-400">데이터가 충분하지 않습니다.</p></CardContent>
      </Card>
    )
  }

  const maxWeeks = Math.max(...data.map((d) => d.retention.length))

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">리텐션 코호트</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">주간 코호트별 재방문율</p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">코호트</th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">크기</th>
                {Array.from({ length: maxWeeks }).map((_, i) => (
                  <th key={i} className="px-3 py-2 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
                    W{i}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((cohort) => (
                <tr key={cohort.cohortWeek}>
                  <td className="px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    {cohort.cohortWeek}
                  </td>
                  <td className="px-3 py-2 text-center text-xs text-slate-600 dark:text-slate-400">
                    {cohort.cohortSize}
                  </td>
                  {cohort.retention.map((rate, i) => (
                    <td key={i} className="px-1 py-1">
                      <div
                        className={cn(
                          'flex h-8 items-center justify-center rounded-lg text-xs font-medium',
                          getRetentionColor(rate),
                        )}
                      >
                        {rate.toFixed(0)}%
                      </div>
                    </td>
                  ))}
                  {Array.from({ length: maxWeeks - cohort.retention.length }).map((_, i) => (
                    <td key={`empty-${i}`} className="px-1 py-1">
                      <div className="flex h-8 items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-800 text-xs text-slate-300">
                        -
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
