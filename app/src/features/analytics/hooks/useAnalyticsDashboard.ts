'use client'

import { useState, useEffect, useCallback } from 'react'
import type {
  AnalyticsSummary, PageStat, FeatureStat,
  FunnelStep, RetentionCohort, AnalyticsPeriod,
} from '@/types/analytics'

interface UseAnalyticsDashboardOptions {
  orgId: string | null
  period: AnalyticsPeriod
}

export function useAnalyticsDashboard({ orgId, period }: UseAnalyticsDashboardOptions) {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [pages, setPages] = useState<PageStat[]>([])
  const [features, setFeatures] = useState<FeatureStat[]>([])
  const [funnel, setFunnel] = useState<FunnelStep[]>([])
  const [retention, setRetention] = useState<RetentionCohort[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!orgId) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)

    try {
      const base = '/api/analytics'
      const qs = `orgId=${orgId}&period=${period}`

      const [summaryRes, pagesRes, featuresRes, funnelRes, retentionRes] = await Promise.all([
        fetch(`${base}/summary?${qs}`),
        fetch(`${base}/pages?${qs}&limit=10`),
        fetch(`${base}/features?${qs}`),
        fetch(`${base}/funnel?${qs}`),
        fetch(`${base}/retention?${qs}&weeks=8`),
      ])

      if (!summaryRes.ok) throw new Error(`Summary: ${summaryRes.status}`)

      const [s, p, f, fn, r] = await Promise.all([
        summaryRes.json(),
        pagesRes.ok ? pagesRes.json() : [],
        featuresRes.ok ? featuresRes.json() : [],
        funnelRes.ok ? funnelRes.json() : [],
        retentionRes.ok ? retentionRes.json() : [],
      ])

      setSummary(s)
      setPages(p)
      setFeatures(f)
      setFunnel(fn)
      setRetention(r)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setIsLoading(false)
    }
  }, [orgId, period])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { summary, pages, features, funnel, retention, isLoading, error, refetch: fetchData }
}
