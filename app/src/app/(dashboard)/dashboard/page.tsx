'use client'

import { useState, useEffect } from 'react'
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
} from 'lucide-react'
import type { DashboardPeriod } from '@/types/dashboard'
import type { ProviderType, OptimizationCategory } from '@/types'

const PERIOD_LABELS: Record<DashboardPeriod, string> = {
  '7d': '7 Days',
  '30d': '30 Days',
  '90d': '90 Days',
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

  const [period, setPeriod] = useState<DashboardPeriod>('30d')
  const [selectedProviders, setSelectedProviders] = useState<ProviderType[]>([])

  const { summary, chartData, isLoading } = useDashboard({
    orgId,
    period,
    providerTypes: selectedProviders.length > 0 ? selectedProviders : undefined,
    comparison: true,
  })
  const { tips, applyTip, dismissTip } = useOptimization(orgId)

  // Initialize provider filter from summary data
  useEffect(() => {
    if (summary && selectedProviders.length === 0) {
      setSelectedProviders(summary.byProvider.map((p) => p.type))
    }
  }, [summary, selectedProviders.length])

  if (!isReady || isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500">Your LLM spending at a glance</p>
          </div>
        </div>
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-xl bg-gray-100" />
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500">Your LLM spending at a glance</p>
          </div>
          <PeriodSelector value={period} onChange={setPeriod} />
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <p className="text-gray-500">No data yet. Add a provider to start tracking costs.</p>
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
    <div className="space-y-6">
      {/* Header with Period Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Your LLM spending at a glance</p>
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
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          title="Total Cost (This Month)"
          value={formatCurrency(summary.totalCost.current)}
          change={summary.totalCost.changePercent}
        />
        <StatCard
          title="Total Tokens"
          value={formatNumber(summary.byProvider.reduce((s, p) => s + p.tokenCount, 0))}
          subtitle="Across all providers"
        />
        <StatCard
          title="API Requests"
          value={formatNumber(summary.byProvider.reduce((s, p) => s + p.requestCount, 0))}
          subtitle="This month"
        />
        <StatCard
          title="Budget Usage"
          value={`${summary.budgetStatus[0]?.percentage.toFixed(0) ?? '0'}%`}
          subtitle={`${formatCurrency(summary.budgetStatus[0]?.spent ?? 0)} of ${formatCurrency(summary.budgetStatus[0]?.amount ?? 0)}`}
        />
        <StatCard
          title="Projected Cost"
          value={formatCurrency(summary.forecast.projectedMonthly)}
          subtitle={`${summary.forecast.daysRemaining}d remaining, ~${formatCurrency(summary.forecast.dailyAverage)}/day`}
          variant={forecastVariant}
          icon={<TrendingUp className="h-4 w-4 text-gray-400" />}
        />
      </div>

      {/* Cost Trend Chart */}
      <CostTrendChart
        data={chartData}
        title={`Daily Cost (Last ${PERIOD_LABELS[period]})`}
        showComparison
      />

      {/* Provider + Model Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ProviderPieChart data={summary.byProvider} />
        <ModelBarChart data={summary.topModels} />
      </div>

      {/* Project Breakdown */}
      <ProjectBreakdownChart data={summary.byProject} />

      {/* Alerts + Optimization Tips */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <h3 className="text-lg font-semibold text-gray-900">Recent Alerts</h3>
              <Badge variant="warning">{summary.recentAlerts.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {summary.recentAlerts.length === 0 ? (
                <p className="text-sm text-gray-500">No recent alerts</p>
              ) : (
                summary.recentAlerts.map((alert) => (
                  <div key={alert.id} className="rounded-lg border border-gray-100 p-3">
                    <div className="flex items-center gap-2">
                      <Badge variant={alert.type === 'budget_warning' ? 'warning' : 'info'}>
                        {alert.type.replace('_', ' ')}
                      </Badge>
                      <span className="text-sm font-medium text-gray-900">{alert.title}</span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">{alert.message}</p>
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
                <Lightbulb className="h-5 w-5 text-blue-500" />
                <h3 className="text-lg font-semibold text-gray-900">Optimization Tips</h3>
                {summary.optimizationSummary.tipsCount > 0 && (
                  <Badge variant="info">{summary.optimizationSummary.tipsCount}</Badge>
                )}
              </div>
              {summary.optimizationSummary.totalSavings > 0 && (
                <span className="text-sm font-medium text-green-600">
                  Save ~{formatCurrency(summary.optimizationSummary.totalSavings)}/mo
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingTips.length === 0 ? (
                <p className="text-sm text-gray-500">No optimization tips yet. Tips will appear based on your usage patterns.</p>
              ) : (
                pendingTips.map((tip) => {
                  const CategoryIcon = CATEGORY_ICONS[tip.category] ?? Lightbulb
                  return (
                    <div key={tip.id} className="rounded-lg border border-gray-100 p-3">
                      <div className="flex items-start gap-3">
                        <CategoryIcon className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900">{tip.suggestion}</p>
                          <p className="mt-0.5 text-sm text-green-600">
                            Save ~{formatCurrency(tip.potentialSaving)}/month
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <Button size="sm" variant="outline" onClick={() => applyTip(tip.id)}>
                            Apply
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
