'use client'

import { useState, useEffect, useCallback } from 'react'
import type { TimeseriesPoint, BreakdownItem, AnalyticsPeriod, BreakdownType } from '@/types/proxy-analytics'

interface UseProxyAnalyticsParams {
  orgId: string | null
  period: AnalyticsPeriod
  breakdownBy: BreakdownType
}

export function useProxyAnalytics(params: UseProxyAnalyticsParams) {
  const [timeseries, setTimeseries] = useState<TimeseriesPoint[]>([])
  const [breakdown, setBreakdown] = useState<BreakdownItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!params.orgId) return
    setIsLoading(true)
    setError(null)

    try {
      const [tsRes, bdRes] = await Promise.all([
        fetch(`/api/proxy/analytics/timeseries?orgId=${params.orgId}&period=${params.period}`),
        fetch(`/api/proxy/analytics/breakdown?orgId=${params.orgId}&period=${params.period}&by=${params.breakdownBy}`),
      ])

      if (!tsRes.ok || !bdRes.ok) throw new Error('Failed to fetch analytics')

      const [tsData, bdData] = await Promise.all([tsRes.json(), bdRes.json()])
      setTimeseries(tsData)
      setBreakdown(bdData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [params.orgId, params.period, params.breakdownBy])

  useEffect(() => { fetchData() }, [fetchData])

  return { timeseries, breakdown, isLoading, error }
}
