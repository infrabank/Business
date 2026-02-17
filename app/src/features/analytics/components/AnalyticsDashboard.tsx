'use client'

import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import { useAnalyticsDashboard } from '../hooks/useAnalyticsDashboard'
import { PeriodSelector } from '@/features/dashboard/components/PeriodSelector'
import { MetricCards } from './MetricCards'
import { ActiveUsersChart } from './ActiveUsersChart'
import { PageRankChart } from './PageRankChart'
import { FeatureUsageChart } from './FeatureUsageChart'
import { FunnelChart } from './FunnelChart'
import { RetentionCohort } from './RetentionCohort'
import type { AnalyticsPeriod } from '@/types/analytics'

export function AnalyticsDashboard() {
  const [period, setPeriod] = useState<AnalyticsPeriod>('30d')
  const orgId = useAppStore((s) => s.currentOrgId)
  const { summary, pages, features, funnel, retention, isLoading, error } =
    useAnalyticsDashboard({ orgId, period })

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">사용자 분석</h1>
          <p className="text-sm text-slate-500">서비스 사용 현황 및 Growth 지표</p>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* Metric Cards */}
      <MetricCards summary={summary} isLoading={isLoading} />

      {/* Active Users Trend */}
      <ActiveUsersChart data={summary?.dailyUsers ?? []} isLoading={isLoading} />

      {/* Page Rank + Feature Usage */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PageRankChart data={pages} isLoading={isLoading} />
        <FeatureUsageChart data={features} isLoading={isLoading} />
      </div>

      {/* Funnel */}
      <FunnelChart data={funnel} isLoading={isLoading} />

      {/* Retention Cohort */}
      <RetentionCohort data={retention} isLoading={isLoading} />
    </div>
  )
}
