'use client'

import { StatCard } from '@/features/dashboard/components/StatCard'
import { CostTrendChart } from '@/features/dashboard/components/CostTrendChart'
import { ProviderPieChart } from '@/features/dashboard/components/ProviderPieChart'
import { ModelBarChart } from '@/features/dashboard/components/ModelBarChart'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { generateMockDashboardSummary, generateMockChartData } from '@/lib/mock-data'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { Lightbulb, AlertTriangle } from 'lucide-react'

const summary = generateMockDashboardSummary()
const chartData = generateMockChartData(30)

export default function DashboardPage() {
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
          value={`${summary.budgetStatus[0]?.percentage.toFixed(0)}%`}
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
              {summary.recentAlerts.map((alert) => (
                <div key={alert.id} className="rounded-lg border border-gray-100 p-3">
                  <div className="flex items-center gap-2">
                    <Badge variant={alert.type === 'budget_warning' ? 'warning' : 'info'}>
                      {alert.type.replace('_', ' ')}
                    </Badge>
                    <span className="text-sm font-medium text-gray-900">{alert.title}</span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">{alert.message}</p>
                </div>
              ))}
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
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                <p className="text-sm font-medium text-blue-900">Switch gpt-4o to gpt-4o-mini for simple tasks</p>
                <p className="mt-1 text-sm text-blue-700">Potential saving: ~$230/month</p>
              </div>
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                <p className="text-sm font-medium text-blue-900">2 unused API keys detected</p>
                <p className="mt-1 text-sm text-blue-700">Deactivate to reduce risk and simplify management</p>
              </div>
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                <p className="text-sm font-medium text-blue-900">Enable request caching for repeated queries</p>
                <p className="mt-1 text-sm text-blue-700">Potential saving: ~$85/month</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
