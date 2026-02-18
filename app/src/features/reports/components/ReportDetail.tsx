'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Download, TrendingUp, TrendingDown, Minus, Lock } from 'lucide-react'
import type { ReportSummary, ReportFormat } from '@/types/report'

interface ReportDetailProps {
  summary: ReportSummary
  planGated: boolean
  isGrowth: boolean
  onExport: (format: ReportFormat) => void
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function ChangeIndicator({ value }: { value: number }) {
  if (value > 0) return <span className="flex items-center text-xs text-red-500 dark:text-red-400"><TrendingUp className="mr-0.5 h-3 w-3" />+{value.toFixed(1)}%</span>
  if (value < 0) return <span className="flex items-center text-xs text-green-500 dark:text-green-400"><TrendingDown className="mr-0.5 h-3 w-3" />{value.toFixed(1)}%</span>
  return <span className="flex items-center text-xs text-gray-400 dark:text-slate-500"><Minus className="mr-0.5 h-3 w-3" />0%</span>
}

export function ReportDetail({ summary, planGated, isGrowth, onExport }: ReportDetailProps) {
  const [exporting, setExporting] = useState<ReportFormat | null>(null)
  const { overview } = summary

  const handleExport = async (format: ReportFormat) => {
    setExporting(format)
    try {
      onExport(format)
    } finally {
      setTimeout(() => setExporting(null), 1000)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with export buttons */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
          {summary.period.from} ~ {summary.period.to}
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport('csv')} disabled={exporting === 'csv'}>
            <Download className="mr-1 h-3 w-3" />
            {exporting === 'csv' ? '...' : 'CSV'}
          </Button>
          {isGrowth ? (
            <>
              <Button variant="outline" size="sm" onClick={() => handleExport('json')} disabled={exporting === 'json'}>
                <Download className="mr-1 h-3 w-3" />
                {exporting === 'json' ? '...' : 'JSON'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExport('pdf')} disabled={exporting === 'pdf'}>
                <Download className="mr-1 h-3 w-3" />
                {exporting === 'pdf' ? '...' : 'PDF'}
              </Button>
            </>
          ) : (
            <Badge variant="info" className="text-xs">Growth: JSON, PDF</Badge>
          )}
        </div>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-xs text-gray-500 dark:text-slate-400">총 비용</p>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-slate-100">${overview.totalCost.toFixed(2)}</p>
            <ChangeIndicator value={overview.changePercent} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-xs text-gray-500 dark:text-slate-400">총 토큰</p>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-slate-100">{formatTokens(overview.totalTokens)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-xs text-gray-500 dark:text-slate-400">총 요청</p>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-slate-100">{overview.totalRequests.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-xs text-gray-500 dark:text-slate-400">일 평균</p>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-slate-100">${overview.dailyAverage.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown sections - gated for free */}
      {planGated ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Lock className="mx-auto h-8 w-8 text-gray-300 dark:text-slate-600" />
            <p className="mt-3 text-sm font-medium text-gray-700 dark:text-slate-300">상세 분석은 Growth 플랜 전용입니다</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">프로바이더별, 모델별, 프로젝트별 비용 분석을 확인하세요</p>
            <Button variant="primary" size="sm" className="mt-4" onClick={() => window.location.href = '/settings'}>
              Growth 업그레이드
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* By Provider */}
          {summary.byProvider.length > 0 && (
            <Card>
              <CardContent className="py-5">
                <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-slate-100">프로바이더별 비용</h3>
                <div className="space-y-3">
                  {summary.byProvider.map((p) => (
                    <div key={p.type} className="flex items-center gap-3">
                      <span className="w-24 text-sm font-medium text-gray-700 dark:text-slate-300">{p.type}</span>
                      <div className="flex-1">
                        <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-slate-700">
                          <div
                            className="h-2 rounded-full bg-indigo-500"
                            style={{ width: `${Math.min(p.percentage, 100)}%` }}
                          />
                        </div>
                      </div>
                      <span className="w-20 text-right text-sm font-semibold text-gray-900 dark:text-slate-100">${p.cost.toFixed(2)}</span>
                      <span className="w-12 text-right text-xs text-gray-500 dark:text-slate-400">{p.percentage.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* By Model Top 10 */}
          {summary.byModel.length > 0 && (
            <Card>
              <CardContent className="py-5">
                <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-slate-100">모델별 비용 (Top 10)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-slate-700 text-left text-xs text-gray-500 dark:text-slate-400">
                        <th className="pb-2 font-medium">#</th>
                        <th className="pb-2 font-medium">모델</th>
                        <th className="pb-2 font-medium">프로바이더</th>
                        <th className="pb-2 text-right font-medium">비용</th>
                        <th className="pb-2 text-right font-medium">토큰</th>
                        <th className="pb-2 text-right font-medium">요청</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.byModel.map((m, i) => (
                        <tr key={m.model} className="border-b border-gray-50 dark:border-slate-800">
                          <td className="py-2 text-gray-400 dark:text-slate-500">{i + 1}</td>
                          <td className="py-2 font-medium text-gray-900 dark:text-slate-100">{m.model}</td>
                          <td className="py-2 text-gray-500 dark:text-slate-400">{m.provider}</td>
                          <td className="py-2 text-right font-semibold text-gray-900 dark:text-slate-100">${m.cost.toFixed(2)}</td>
                          <td className="py-2 text-right text-gray-600 dark:text-slate-400">{formatTokens(m.tokenCount)}</td>
                          <td className="py-2 text-right text-gray-600 dark:text-slate-400">{m.requestCount.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* By Project */}
          {summary.byProject.length > 0 && (
            <Card>
              <CardContent className="py-5">
                <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-slate-100">프로젝트별 비용</h3>
                <div className="space-y-3">
                  {summary.byProject.map((p) => (
                    <div key={p.projectId} className="flex items-center gap-3">
                      <span className="w-32 truncate text-sm font-medium text-gray-700 dark:text-slate-300">{p.name}</span>
                      <div className="flex-1">
                        <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-slate-700">
                          <div
                            className="h-2 rounded-full bg-emerald-500"
                            style={{ width: `${Math.min(p.percentage, 100)}%` }}
                          />
                        </div>
                      </div>
                      <span className="w-20 text-right text-sm font-semibold text-gray-900 dark:text-slate-100">${p.cost.toFixed(2)}</span>
                      <span className="w-12 text-right text-xs text-gray-500 dark:text-slate-400">{p.percentage.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
