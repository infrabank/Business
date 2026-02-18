'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, DollarSign, Zap, Hash, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { StatCard } from '@/features/dashboard/components/StatCard'
import { CostTrendChart } from '@/features/dashboard/components/CostTrendChart'
import { ProviderPieChart } from '@/features/dashboard/components/ProviderPieChart'
import { ModelBarChart } from '@/features/dashboard/components/ModelBarChart'
import { useProjectSummary } from '@/features/projects/hooks/useProjectSummary'
import { useProjects } from '@/features/projects/hooks/useProjects'
import { useAppStore } from '@/lib/store'
import { useSession } from '@/hooks/useSession'
import { formatCurrency, formatNumber, formatDate } from '@/lib/utils'
import { PROVIDER_LABELS } from '@/lib/constants'
import type { ProviderType } from '@/types'

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params)
  const router = useRouter()
  const { isReady } = useSession()
  const orgId = useAppStore((s) => s.currentOrgId)
  const { projects } = useProjects(orgId)
  const { summary, isLoading } = useProjectSummary({ projectId, orgId })

  const project = projects.find((p) => p.id === projectId)

  if (!isReady || isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 animate-pulse rounded-lg bg-gray-200 dark:bg-slate-700" />
          <div className="h-8 w-48 animate-pulse rounded-lg bg-gray-200 dark:bg-slate-700" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-100 dark:bg-slate-800" />
          ))}
        </div>
        <div className="h-80 animate-pulse rounded-xl bg-gray-100 dark:bg-slate-800" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-gray-500 dark:text-slate-400">프로젝트를 찾을 수 없습니다.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/projects')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> 프로젝트 목록
        </Button>
      </div>
    )
  }

  const chartData = summary?.dailyCosts.map((d) => ({
    date: d.date,
    cost: d.cost,
    tokens: 0,
    requests: 0,
  })) ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push('/projects')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${project.color ?? '#6B7280'}20` }}
          >
            <div className="h-4 w-4 rounded-full" style={{ backgroundColor: project.color ?? '#6B7280' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{project.name}</h1>
            {project.description && (
              <p className="text-sm text-gray-500 dark:text-slate-400">{project.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Stat cards */}
      {summary && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="총 비용"
              value={formatCurrency(summary.totalCost)}
              change={summary.costChange}
              icon={<DollarSign className="h-4 w-4 text-indigo-500" />}
            />
            <StatCard
              title="총 토큰"
              value={formatNumber(summary.totalTokens)}
              icon={<Zap className="h-4 w-4 text-amber-500" />}
            />
            <StatCard
              title="총 요청"
              value={formatNumber(summary.totalRequests)}
              icon={<Hash className="h-4 w-4 text-emerald-500" />}
            />
            <StatCard
              title="일 평균 비용"
              value={formatCurrency(summary.dailyCosts.length > 0 ? summary.totalCost / summary.dailyCosts.length : 0)}
              icon={<TrendingUp className="h-4 w-4 text-blue-500" />}
            />
          </div>

          {/* Cost trend chart */}
          {chartData.length > 0 && (
            <CostTrendChart data={chartData} title="비용 추이" />
          )}

          {/* Charts row */}
          <div className="grid gap-4 md:grid-cols-2">
            {summary.byProvider.length > 0 && (
              <ProviderPieChart data={summary.byProvider} />
            )}
            {summary.byModel.length > 0 && (
              <ModelBarChart
                data={summary.byModel.map((m) => ({
                  model: m.model,
                  cost: m.cost,
                  tokenCount: m.tokenCount,
                }))}
              />
            )}
          </div>

          {/* Recent usage records */}
          {summary.recentRecords.length > 0 && (
            <Card>
              <CardHeader>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">최근 사용 기록</h3>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-slate-700">
                        <th className="pb-3 text-left font-medium text-gray-500 dark:text-slate-400">날짜</th>
                        <th className="pb-3 text-left font-medium text-gray-500 dark:text-slate-400">프로바이더</th>
                        <th className="pb-3 text-left font-medium text-gray-500 dark:text-slate-400">모델</th>
                        <th className="pb-3 text-right font-medium text-gray-500 dark:text-slate-400">토큰</th>
                        <th className="pb-3 text-right font-medium text-gray-500 dark:text-slate-400">요청</th>
                        <th className="pb-3 text-right font-medium text-gray-500 dark:text-slate-400">비용</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.recentRecords.map((r) => (
                        <tr key={r.id} className="border-b border-gray-100 dark:border-slate-800 last:border-0">
                          <td className="py-3 text-gray-700 dark:text-slate-300">{formatDate(r.date)}</td>
                          <td className="py-3">
                            <Badge variant="default">
                              {PROVIDER_LABELS[r.providerType as ProviderType] ?? r.providerType}
                            </Badge>
                          </td>
                          <td className="py-3 font-mono text-xs text-gray-600 dark:text-slate-400">{r.model}</td>
                          <td className="py-3 text-right text-gray-700 dark:text-slate-300">{formatNumber(r.totalTokens)}</td>
                          <td className="py-3 text-right text-gray-700 dark:text-slate-300">{r.requestCount}</td>
                          <td className="py-3 text-right font-medium text-gray-900 dark:text-slate-100">{formatCurrency(r.cost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty state */}
          {summary.totalCost === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <DollarSign className="h-12 w-12 text-gray-300 dark:text-slate-600" />
                <p className="mt-3 text-gray-500 dark:text-slate-400">아직 이 프로젝트에 사용 기록이 없습니다.</p>
                <p className="mt-1 text-sm text-gray-400 dark:text-slate-500">
                  Usage Record에 프로젝트를 할당하면 여기에 비용이 표시됩니다.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
