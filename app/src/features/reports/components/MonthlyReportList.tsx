'use client'

import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Calendar, ArrowRight } from 'lucide-react'
import type { MonthlyReport } from '@/types/report'

interface MonthlyReportListProps {
  reports: MonthlyReport[]
  isLoading: boolean
  isGrowth: boolean
  onSelectMonth: (month: string) => void
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export function MonthlyReportList({ reports, isLoading, isGrowth, onSelectMonth }: MonthlyReportListProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="py-5">
              <div className="animate-pulse space-y-3">
                <div className="h-4 w-24 rounded bg-gray-200" />
                <div className="h-6 w-32 rounded bg-gray-200" />
                <div className="h-4 w-20 rounded bg-gray-200" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (reports.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Calendar className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-2 text-sm text-gray-500">사용 데이터가 없습니다</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">월별 리포트</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {reports.map((r) => (
          <Card key={r.month} className="group cursor-pointer transition-shadow hover:shadow-md" onClick={() => onSelectMonth(r.month)}>
            <CardContent className="py-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-400">
                  <Calendar className="h-4 w-4" />
                  <span className="text-xs">{r.month}</span>
                </div>
                {r.isCurrentMonth && <Badge variant="info">진행 중</Badge>}
              </div>
              <h3 className="mt-2 font-semibold text-gray-900">{r.label}</h3>
              <p className="mt-1 text-2xl font-bold text-gray-900">${r.totalCost.toFixed(2)}</p>
              <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                <span>{formatTokens(r.totalTokens)} tokens</span>
                <span>{r.totalRequests.toLocaleString()} req</span>
                <span>{r.providerCount} providers</span>
              </div>
              <div className="mt-3 flex items-center text-sm font-medium text-indigo-600 opacity-0 transition-opacity group-hover:opacity-100">
                상세보기 <ArrowRight className="ml-1 h-3 w-3" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!isGrowth && reports.length === 1 && (
        <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-700">
          Free 플랜에서는 이번 달만 조회 가능합니다. Growth로 업그레이드하면 최근 12개월 리포트를 확인할 수 있습니다.
        </div>
      )}
    </div>
  )
}
