'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'

interface SavingsData {
  summary: {
    totalSaved: number
    cacheHits: number
    cacheHitRate: number
    modelRoutings: number
    cacheSavings: number
    routingSavings: number
    totalOriginalCost: number
    totalActualCost: number
  }
  recommendations: Array<{
    type: string
    title: string
    description: string
    potentialSavings: number
    confidence: string
  }>
  cacheStats: {
    totalHits: number
    totalMisses: number
    totalSaved: number
    entries: number
    hitRate: number
  }
}

const RECOMMENDATION_COLORS = {
  cache: 'border-blue-500',
  routing: 'border-purple-500',
  budget: 'border-amber-500',
} as const

const CONFIDENCE_STYLES = {
  high: 'bg-emerald-100 text-emerald-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-gray-100 text-gray-800',
} as const

export function SavingsDashboard() {
  const [data, setData] = useState<SavingsData | null>(null)
  const [period, setPeriod] = useState('30d')
  const [loading, setLoading] = useState(true)
  const orgId = useAppStore((s) => s.currentOrgId)

  useEffect(() => {
    if (!orgId) return
    setLoading(true)
    fetch(`/api/proxy/savings?orgId=${orgId}&period=${period}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [orgId, period])

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Skeleton for metric cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="py-6">
                <div className="h-4 w-24 rounded bg-gray-200" />
                <div className="mt-2 h-8 w-32 rounded bg-gray-200" />
              </CardContent>
            </Card>
          ))}
        </div>
        {/* Skeleton for recommendations */}
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 w-48 rounded bg-gray-200" />
          </CardHeader>
          <CardContent>
            <div className="h-24 rounded bg-gray-200" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-400">
          No savings data available
        </CardContent>
      </Card>
    )
  }

  const { summary, recommendations, cacheStats } = data

  return (
    <div className="space-y-6">
      {/* Before vs After Comparison - Hero Section */}
      <Card className="overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-3">
          {/* Without LCM */}
          <div className="bg-gray-50 p-6 text-center">
            <div className="text-sm font-medium text-gray-500">Without LCM</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">
              ${summary.totalOriginalCost.toFixed(2)}
            </div>
            <div className="mt-1 text-xs text-gray-400">What you would have paid</div>
          </div>
          {/* Arrow / Savings */}
          <div className="flex flex-col items-center justify-center bg-emerald-50 p-6">
            <div className="text-sm font-medium text-emerald-600">You Saved</div>
            <div className="mt-2 text-4xl font-bold text-emerald-600">
              ${summary.totalSaved.toFixed(2)}
            </div>
            {summary.totalOriginalCost > 0 && (
              <div className="mt-2 rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
                {((summary.totalSaved / summary.totalOriginalCost) * 100).toFixed(1)}% less
              </div>
            )}
          </div>
          {/* With LCM */}
          <div className="bg-blue-50 p-6 text-center">
            <div className="text-sm font-medium text-blue-600">With LCM</div>
            <div className="mt-2 text-3xl font-bold text-blue-700">
              ${summary.totalActualCost.toFixed(2)}
            </div>
            <div className="mt-1 text-xs text-blue-400">What you actually paid</div>
          </div>
        </div>
      </Card>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Saved */}
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="py-6">
            <div className="text-sm font-medium text-gray-600">Total Saved</div>
            <div className="mt-2 text-3xl font-bold text-emerald-600">
              ${summary.totalSaved.toFixed(2)}
            </div>
            {summary.totalOriginalCost > 0 && (
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${Math.min(100, (summary.totalSaved / summary.totalOriginalCost) * 100)}%` }}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cache Hit Rate */}
        <Card>
          <CardContent className="py-6">
            <div className="text-sm font-medium text-gray-600">Cache Hit Rate</div>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-3xl font-bold text-gray-900">
                {summary.cacheHitRate.toFixed(1)}%
              </span>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-300"
                style={{ width: `${summary.cacheHitRate}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Cache Savings */}
        <Card>
          <CardContent className="py-6">
            <div className="text-sm font-medium text-gray-600">Cache Savings</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">
              ${summary.cacheSavings.toFixed(2)}
            </div>
            <div className="mt-1 text-xs text-gray-500">
              {cacheStats.totalHits.toLocaleString()} hits
            </div>
          </CardContent>
        </Card>

        {/* Routing Savings */}
        <Card>
          <CardContent className="py-6">
            <div className="text-sm font-medium text-gray-600">Routing Savings</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">
              ${summary.routingSavings.toFixed(2)}
            </div>
            <div className="mt-1 text-xs text-gray-500">
              {summary.modelRoutings.toLocaleString()} routings
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Period Selector */}
      <div className="flex items-center justify-center gap-2">
        {['7d', '30d', '90d'].map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              period === p
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {p === '7d' ? 'Last 7 days' : p === '30d' ? 'Last 30 days' : 'Last 90 days'}
          </button>
        ))}
      </div>

      {/* Optimization Recommendations */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">
            Optimization Recommendations
          </h3>
        </CardHeader>
        <CardContent>
          {recommendations.length === 0 ? (
            <div className="py-8 text-center text-gray-400">
              No recommendations at this time
            </div>
          ) : (
            <div className="space-y-4">
              {recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className={`rounded-lg border-l-4 bg-gray-50 p-4 ${
                    RECOMMENDATION_COLORS[rec.type as keyof typeof RECOMMENDATION_COLORS] ||
                    'border-gray-500'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-gray-900">{rec.title}</h4>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            CONFIDENCE_STYLES[
                              rec.confidence as keyof typeof CONFIDENCE_STYLES
                            ] || CONFIDENCE_STYLES.low
                          }`}
                        >
                          {rec.confidence}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-600">{rec.description}</p>
                    </div>
                    <div className="ml-4 text-right">
                      <div className="text-sm font-medium text-gray-600">
                        Potential Savings
                      </div>
                      <div className="mt-1 text-xl font-bold text-emerald-600">
                        ${rec.potentialSavings.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
