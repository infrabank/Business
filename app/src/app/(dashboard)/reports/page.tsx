'use client'

import { useState, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { useSession } from '@/hooks/useSession'
import { useReports } from '@/features/reports/hooks/useReports'
import { PeriodSelector } from '@/features/reports/components/PeriodSelector'
import { MonthlyReportList } from '@/features/reports/components/MonthlyReportList'
import { ReportDetail } from '@/features/reports/components/ReportDetail'
import { Card, CardContent } from '@/components/ui/Card'
import { FileText } from 'lucide-react'

export default function ReportsPage() {
  const { isReady, currentUser } = useSession()
  const orgId = useAppStore((s) => s.currentOrgId)
  const isGrowth = currentUser?.plan === 'growth'

  const {
    monthlyReports,
    summary,
    planGated,
    isLoading,
    isSummaryLoading,
    error,
    fetchSummary,
    exportReport,
  } = useReports(orgId)

  const [selectedPeriod, setSelectedPeriod] = useState<{ from: string; to: string } | null>(null)

  const handlePeriodChange = useCallback((from: string, to: string) => {
    setSelectedPeriod({ from, to })
    fetchSummary(from, to)
  }, [fetchSummary])

  const handleSelectMonth = useCallback((month: string) => {
    const [y, m] = month.split('-').map(Number)
    const from = `${month}-01`
    const lastDay = new Date(y, m, 0).getDate()
    const to = `${month}-${String(lastDay).padStart(2, '0')}`
    setSelectedPeriod({ from, to })
    fetchSummary(from, to)
  }, [fetchSummary])

  const handleExport = useCallback((format: 'csv' | 'json' | 'pdf') => {
    if (!selectedPeriod) return
    exportReport(format, selectedPeriod.from, selectedPeriod.to)
  }, [exportReport, selectedPeriod])

  if (!isReady) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">리포트</h1>
        <p className="text-gray-500">비용 분석 리포트 및 데이터 내보내기</p>
      </div>

      {/* Period selector */}
      <Card>
        <CardContent className="py-4">
          <p className="mb-2 text-sm font-medium text-gray-700">기간 선택</p>
          <PeriodSelector onPeriodChange={handlePeriodChange} isGrowth={isGrowth} />
        </CardContent>
      </Card>

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Monthly report list */}
      <MonthlyReportList
        reports={monthlyReports}
        isLoading={isLoading}
        isGrowth={isGrowth}
        onSelectMonth={handleSelectMonth}
      />

      {/* Report detail */}
      {isSummaryLoading && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
            <span className="ml-3 text-sm text-gray-500">리포트 생성 중...</span>
          </CardContent>
        </Card>
      )}

      {summary && !isSummaryLoading && (
        <ReportDetail
          summary={summary}
          planGated={planGated}
          isGrowth={isGrowth}
          onExport={handleExport}
        />
      )}

      {/* Empty state when no period selected */}
      {!summary && !isSummaryLoading && !isLoading && (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-2 text-sm text-gray-500">기간을 선택하거나 월별 카드를 클릭하여 상세 리포트를 확인하세요</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
