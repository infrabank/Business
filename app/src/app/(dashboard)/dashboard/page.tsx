'use client'

import { useState, useEffect, useCallback } from 'react'
import { OnboardingWizard } from '@/features/onboarding/components/OnboardingWizard'
import { StatCard } from '@/features/dashboard/components/StatCard'
import { CostTrendChart } from '@/features/dashboard/components/CostTrendChart'
import { ProviderPieChart } from '@/features/dashboard/components/ProviderPieChart'
import { ModelBarChart } from '@/features/dashboard/components/ModelBarChart'
import { PeriodSelector } from '@/features/dashboard/components/PeriodSelector'
import { ProviderFilter } from '@/features/dashboard/components/ProviderFilter'
import { ProjectBreakdownChart } from '@/features/dashboard/components/ProjectBreakdownChart'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useDashboard } from '@/features/dashboard/hooks/useDashboard'
import { useOptimization } from '@/features/optimization/hooks/useOptimization'
import { useAppStore } from '@/lib/store'
import { useSession } from '@/hooks/useSession'
import { formatCurrency, formatNumber } from '@/lib/utils'
import {
  Lightbulb,
  AlertTriangle,
  TrendingUp,
  ArrowDownCircle,
  Layers,
  Database,
  KeyRound,
  Shield,
} from 'lucide-react'
import { useAnomalyHistory } from '@/features/anomaly/hooks/useAnomalyHistory'
import type { DashboardPeriod } from '@/types/dashboard'
import type { ProviderType, OptimizationCategory } from '@/types'

const PERIOD_LABELS: Record<DashboardPeriod, string> = {
  '7d': '7일',
  '30d': '30일',
  '90d': '90일',
}

const CATEGORY_ICONS: Record<OptimizationCategory, typeof ArrowDownCircle> = {
  model_downgrade: ArrowDownCircle,
  batch_processing: Layers,
  caching: Database,
  unused_key: KeyRound,
}

export default function DashboardPage() {
  const { isReady } = useSession()
  const orgId = useAppStore((s) => s.currentOrgId)

  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null)
  const [period, setPeriod] = useState<DashboardPeriod>('30d')
  const [selectedProviders, setSelectedProviders] = useState<ProviderType[]>([])

  // Check onboarding status (localStorage fallback for when DB column is missing)
  useEffect(() => {
    if (typeof localStorage !== 'undefined' && localStorage.getItem('onboarding_completed') === 'true') {
      setShowOnboarding(false)
      return
    }
    fetch('/api/onboarding')
      .then((res) => res.json())
      .then((data) => setShowOnboarding(!data.onboardingCompleted))
      .catch(() => setShowOnboarding(false))
  }, [])

  const handleOnboardingComplete = useCallback(() => {
    if (typeof localStorage !== 'undefined') localStorage.setItem('onboarding_completed', 'true')
    setShowOnboarding(false)
  }, [])

  const { summary, chartData, isLoading, error: dashError } = useDashboard({
    orgId,
    period,
    providerTypes: selectedProviders.length > 0 ? selectedProviders : undefined,
    comparison: true,
  })
  const { tips, applyTip, dismissTip } = useOptimization(orgId)
  const { events: anomalyEvents } = useAnomalyHistory(orgId, 7)

  // Initialize provider filter from summary data
  useEffect(() => {
    if (summary && selectedProviders.length === 0) {
      setSelectedProviders(summary.byProvider.map((p) => p.type))
    }
  }, [summary, selectedProviders.length])

  // Show onboarding wizard for new users
  if (showOnboarding === true) {
    return (
      <div className="min-h-[80vh] bg-gradient-to-br from-slate-50 dark:from-slate-900 to-blue-50/30 dark:to-blue-950/30 -m-6 p-6">
        <OnboardingWizard onComplete={handleOnboardingComplete} />
      </div>
    )
  }

  if (!isReady || isLoading || showOnboarding === null) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">대시보드</h1>
            <p className="text-slate-500 dark:text-slate-400">LLM 지출 한눈에 보기</p>
          </div>
        </div>
        <div className="grid gap-5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="loading-skeleton h-28 rounded-2xl" />
          ))}
        </div>
        <div className="loading-skeleton h-64 rounded-2xl" />
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">대시보드</h1>
            <p className="text-slate-500 dark:text-slate-400">LLM 지출 한눈에 보기</p>
          </div>
          <PeriodSelector value={period} onChange={setPeriod} />
        </div>
        <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-900 p-12 text-center shadow-sm">
          <p className="text-slate-500 dark:text-slate-400">
            {dashError
              ? `대시보드 로딩 오류: ${dashError}`
              : '아직 데이터가 없습니다. 프로바이더를 추가하여 비용 추적을 시작하세요.'}
          </p>
          {dashError && (
            <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">orgId: {orgId || 'not set'}</p>
          )}
        </div>
      </div>
    )
  }

  const availableProviders = summary.byProvider.map((p) => p.type)
  const pendingTips = tips.filter((t) => t.status === 'pending').slice(0, 3)

  // Forecast variant
  const budgetAmount = summary.budgetStatus[0]?.amount ?? 0
  const forecastVariant = summary.forecast.budgetWarning
    ? summary.forecast.projectedMonthly > budgetAmount * 1.0
      ? 'danger' as const
      : 'warning' as const
    : 'default' as const

  return (
    <div className="space-y-8">
      {/* Header with Period Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">대시보드</h1>
          <p className="text-slate-500 dark:text-slate-400">LLM 지출 한눈에 보기</p>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* Provider Filter */}
      {availableProviders.length > 1 && (
        <ProviderFilter
          providers={availableProviders}
          selected={selectedProviders}
          onChange={setSelectedProviders}
        />
      )}

      {/* Stat Cards */}
      <div className="grid gap-5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          title="이번 달 총 비용"
          value={formatCurrency(summary.totalCost.current)}
          change={summary.totalCost.changePercent}
        />
        <StatCard
          title="총 토큰"
          value={formatNumber(summary.byProvider.reduce((s, p) => s + p.tokenCount, 0))}
          subtitle="모든 프로바이더 합산"
        />
        <StatCard
          title="API 요청 수"
          value={formatNumber(summary.byProvider.reduce((s, p) => s + p.requestCount, 0))}
          subtitle="이번 달"
        />
        <StatCard
          title="예산 사용률"
          value={`${summary.budgetStatus[0]?.percentage.toFixed(0) ?? '0'}%`}
          subtitle={`${formatCurrency(summary.budgetStatus[0]?.spent ?? 0)} of ${formatCurrency(summary.budgetStatus[0]?.amount ?? 0)}`}
        />
        <StatCard
          title="예상 비용"
          value={formatCurrency(summary.forecast.projectedMonthly)}
          subtitle={`${summary.forecast.daysRemaining}일 남음, ~${formatCurrency(summary.forecast.dailyAverage)}/일`}
          variant={forecastVariant}
          icon={<TrendingUp className="h-4 w-4 text-slate-400" />}
        />
        <StatCard
          title="이상 감지"
          value={`${anomalyEvents.length}건`}
          subtitle="최근 7일"
          variant={anomalyEvents.some((e) => e.severity === 'critical') ? 'danger' : anomalyEvents.length > 0 ? 'warning' : 'default'}
          icon={<Shield className="h-4 w-4 text-slate-400" />}
        />
      </div>

      {/* Cost Trend Chart */}
      <CostTrendChart
        data={chartData}
        title={`일별 비용 (최근 ${PERIOD_LABELS[period]})`}
        showComparison
        anomalyEvents={anomalyEvents}
      />

      {/* Provider + Model Charts */}
      <div className="grid gap-8 lg:grid-cols-2">
        <ProviderPieChart data={summary.byProvider} />
        <ModelBarChart data={summary.topModels} />
      </div>

      {/* Project Breakdown */}
      <ProjectBreakdownChart data={summary.byProject} />

      {/* Alerts + Optimization Tips */}
      <div className="grid gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500 dark:text-amber-400" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">최근 알림</h3>
              <Badge variant="warning">{summary.recentAlerts.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {summary.recentAlerts.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">최근 알림 없음</p>
              ) : (
                summary.recentAlerts.map((alert) => (
                  <div key={alert.id} className="rounded-xl border border-slate-100 dark:border-slate-800 p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800 transition-colors">
                    <div className="flex items-center gap-2">
                      <Badge variant={alert.type === 'budget_warning' ? 'warning' : 'info'}>
                        {alert.type.replace('_', ' ')}
                      </Badge>
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{alert.title}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{alert.message}</p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">최적화 팁</h3>
                {summary.optimizationSummary.tipsCount > 0 && (
                  <Badge variant="info">{summary.optimizationSummary.tipsCount}</Badge>
                )}
              </div>
              {summary.optimizationSummary.totalSavings > 0 && (
                <span className="text-sm font-medium text-green-600 dark:text-green-400">
                  ~{formatCurrency(summary.optimizationSummary.totalSavings)}/월 절약
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingTips.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">아직 최적화 팁이 없습니다. 사용 패턴에 따라 팁이 표시됩니다.</p>
              ) : (
                pendingTips.map((tip) => {
                  const CategoryIcon = CATEGORY_ICONS[tip.category] ?? Lightbulb
                  return (
                    <div key={tip.id} className="rounded-xl border border-slate-100 dark:border-slate-800 p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800 transition-colors">
                      <div className="flex items-start gap-3">
                        <CategoryIcon className="mt-0.5 h-5 w-5 shrink-0 text-indigo-500 dark:text-indigo-400" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{tip.suggestion}</p>
                          <p className="mt-0.5 text-sm text-green-600 dark:text-green-400">
                            ~{formatCurrency(tip.potentialSaving)}/월 절약
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <Button size="sm" variant="outline" onClick={() => applyTip(tip.id)}>
                            적용
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => dismissTip(tip.id)}>
                            ✕
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
