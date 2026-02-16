'use client'

import { useState, useEffect, useCallback } from 'react'
import type { DashboardSummary, ChartDataPoint, DashboardPeriod } from '@/types/dashboard'
import type { ProviderType } from '@/types'

interface UseDashboardOptions {
  orgId?: string | null
  period?: DashboardPeriod
  providerTypes?: ProviderType[]
  comparison?: boolean
}

interface UseDashboardResult {
  summary: DashboardSummary | null
  chartData: ChartDataPoint[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export function useDashboard({
  orgId,
  period = '30d',
  providerTypes,
  comparison = true,
}: UseDashboardOptions = {}): UseDashboardResult {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const providerKey = providerTypes?.join(',') ?? ''

  const fetchData = useCallback(async () => {
    if (!orgId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    const providerParam = providerKey ? `&providerTypes=${providerKey}` : ''
    const comparisonParam = comparison ? '&comparison=true' : ''

    try {
      const [summaryRes, chartRes] = await Promise.all([
        fetch(`/api/dashboard/summary?orgId=${orgId}${providerParam}`),
        fetch(`/api/dashboard/chart?orgId=${orgId}&period=${period}${providerParam}${comparisonParam}`),
      ])

      if (!summaryRes.ok || !chartRes.ok) {
        const summaryErr = !summaryRes.ok ? await summaryRes.text().catch(() => '') : ''
        const chartErr = !chartRes.ok ? await chartRes.text().catch(() => '') : ''
        console.error('[useDashboard] API error:', { summary: summaryErr, chart: chartErr })
        const failedEndpoints = [
          !summaryRes.ok ? `summary(${summaryRes.status}): ${summaryErr}` : '',
          !chartRes.ok ? `chart(${chartRes.status}): ${chartErr}` : '',
        ].filter(Boolean).join('; ')
        throw new Error(failedEndpoints || 'Failed to fetch dashboard data')
      }

      const summaryData = await summaryRes.json()
      const chartItems = await chartRes.json()
      setSummary(summaryData)
      setChartData(chartItems)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [orgId, period, providerKey, comparison])

  useEffect(() => { fetchData() }, [fetchData])

  return { summary, chartData, isLoading, error, refetch: fetchData }
}
