'use client'

import { useState, useEffect, useCallback } from 'react'
import { getTokenFromCookie } from '@/lib/auth'
import type { DashboardSummary, ChartDataPoint } from '@/types/dashboard'

interface UseDashboardOptions {
  orgId?: string | null
  period?: '7d' | '30d' | '90d'
}

interface UseDashboardResult {
  summary: DashboardSummary | null
  chartData: ChartDataPoint[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export function useDashboard({ orgId, period = '7d' }: UseDashboardOptions = {}): UseDashboardResult {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

    try {
      const [summaryRes, chartRes] = await Promise.all([
        fetch(`/api/dashboard/summary?orgId=${orgId}`, { headers }),
        fetch(`/api/dashboard/chart?orgId=${orgId}&period=${period}`, { headers }),
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
  }, [orgId, period])

  useEffect(() => { fetchData() }, [fetchData])

  return { summary, chartData, isLoading, error, refetch: fetchData }
}
