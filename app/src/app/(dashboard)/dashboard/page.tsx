'use client'

import { StatCard } from '@/features/dashboard/components/StatCard'
import { CostTrendChart } from '@/features/dashboard/components/CostTrendChart'
import { ProviderPieChart } from '@/features/dashboard/components/ProviderPieChart'
import { ModelBarChart } from '@/features/dashboard/components/ModelBarChart'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useDashboard } from '@/features/dashboard/hooks/useDashboard'
import { useAppStore } from '@/lib/store'
import { useSession } from '@/hooks/useSession'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { Lightbulb, AlertTriangle } from 'lucide-react'

export default function DashboardPage() {
  const { isReady } = useSession()
  const orgId = useAppStore((s) => s.currentOrgId)
  const { summary, chartData, isLoading } = useDashboard({ orgId, period: '30d' })

  if (!isReady || isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Your LLM spending at a glance</p>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Your LLM spending at a glance</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <p className="text-gray-500">No data yet. Add a provider to start tracking costs.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Your LLM spending at a glance</p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Total Cost (This Month)" value={formatCurrency(summary.totalCost.current)} change={summary.totalCost.changePercent} />
        <StatCard title="Total Tokens" value={formatNumber(summary.byProvider.reduce((s, p) => s + p.tokenCount, 0))} subtitle="Across all providers" />
        <StatCard title="API Requests" value={formatNumber(summary.byProvider.reduce((s, p) => s + p.requestCount, 0))} subtitle="This month" />
        <StatCard
          title="Budget Usage"
          value={`${summary.budgetStatus[0]?.percentage.toFixed(0) ?? '0'}%`}
          subtitle={`${formatCurrency(summary.budgetStatus[0]?.spent ?? 0)} of ${formatCurrency(summary.budgetStatus[0]?.amount ?? 0)}`}
        />
      </div>

      {/* Cost Trend Chart */}
      <CostTrendChart data={chartData} title="Daily Cost (Last 30 Days)" />

      {/* Provider + Model Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ProviderPieChart data={summary.byProvider} />
        <ModelBarChart data={summary.topModels} />
      </div>

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
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-blue-500" />
              <h3 className="text-lg font-semibold text-gray-900">Optimization Tips</h3>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-gray-500">Tips will appear here based on your usage patterns.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
