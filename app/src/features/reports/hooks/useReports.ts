'use client'

import { useState, useEffect, useCallback } from 'react'
import type { MonthlyReport, ReportSummary, ReportFormat } from '@/types/report'

export function useReports(orgId?: string | null) {
  const [monthlyReports, setMonthlyReports] = useState<MonthlyReport[]>([])
  const [summary, setSummary] = useState<ReportSummary | null>(null)
  const [planGated, setPlanGated] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSummaryLoading, setIsSummaryLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load monthly reports
  const fetchMonthly = useCallback(async () => {
    if (!orgId) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/reports/monthly?orgId=${orgId}`)
      if (!res.ok) throw new Error('Failed to load reports')
      const data: MonthlyReport[] = await res.json()
      setMonthlyReports(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setIsLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    fetchMonthly()
  }, [fetchMonthly])

  // Load summary for a date range
  const fetchSummary = useCallback(async (from: string, to: string) => {
    if (!orgId) return
    setIsSummaryLoading(true)
    setPlanGated(false)
    setError(null)
    try {
      const res = await fetch(`/api/reports/summary?orgId=${orgId}&from=${from}&to=${to}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        if (body.planRequired) {
          setPlanGated(true)
        }
        throw new Error(body.error || 'Failed to load summary')
      }
      const data = await res.json()
      if (data.planGated) setPlanGated(true)
      setSummary(data as ReportSummary)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setIsSummaryLoading(false)
    }
  }, [orgId])

  // Export report as file download
  const exportReport = useCallback(async (format: ReportFormat, from: string, to: string) => {
    if (!orgId) return
    try {
      const params = new URLSearchParams({ orgId, format, from, to })
      const res = await fetch(`/api/reports/export?${params}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Export failed')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const ext = format === 'pdf' ? 'pdf' : format === 'json' ? 'json' : 'csv'
      a.download = `report-${from}-${to}.${ext}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
    }
  }, [orgId])

  return {
    monthlyReports,
    summary,
    planGated,
    isLoading,
    isSummaryLoading,
    error,
    fetchSummary,
    exportReport,
    refetch: fetchMonthly,
  }
}
