'use client'

import { useState, useEffect, useCallback } from 'react'
import { getTokenFromCookie } from '@/lib/auth'
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

    const token = getTokenFromCookie()
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`

    const providerParam = providerKey ? `&providerTypes=${providerKey}` : ''
    const comparisonParam = comparison ? '&comparison=true' : ''

    try {
      const [summaryRes, chartRes] = await Promise.all([
        fetch(`/api/dashboard/summary?orgId=${orgId}${providerParam}`, { headers }),
        fetch(`/api/dashboard/chart?orgId=${orgId}&period=${period}${providerParam}${comparisonParam}`, { headers }),
      ])

      if (!summaryRes.ok || !chartRes.ok) {
        throw new Error('Failed to fetch dashboard data')
      }

      setSummary(await summaryRes.json())
      setChartData(await chartRes.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [orgId, period, providerKey, comparison])

  useEffect(() => { fetchData() }, [fetchData])

  return { summary, chartData, isLoading, error, refetch: fetchData }
}
