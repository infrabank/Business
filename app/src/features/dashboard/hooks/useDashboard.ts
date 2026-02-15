'use client'

import { useState, useEffect } from 'react'
import type { DashboardSummary, ChartDataPoint } from '@/types/dashboard'
import { generateMockDashboardSummary, generateMockChartData } from '@/lib/mock-data'

interface UseDashboardOptions {
  orgId?: string
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

  const days = period === '90d' ? 90 : period === '30d' ? 30 : 7

  async function fetchData() {
    setIsLoading(true)
    setError(null)

    try {
      if (!orgId) {
        // Use mock data when no org configured
        setSummary(generateMockDashboardSummary())
        setChartData(generateMockChartData(days))
        return
      }

      const [summaryRes, chartRes] = await Promise.all([
        fetch(`/api/dashboard/summary?orgId=${orgId}`),
        fetch(`/api/dashboard/chart?orgId=${orgId}&period=${period}`),
      ])

      if (!summaryRes.ok || !chartRes.ok) {
        throw new Error('Failed to fetch dashboard data')
      }

      setSummary(await summaryRes.json())
      setChartData(await chartRes.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      // Fallback to mock data
      setSummary(generateMockDashboardSummary())
      setChartData(generateMockChartData(days))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [orgId, period])

  return { summary, chartData, isLoading, error, refetch: fetchData }
}
