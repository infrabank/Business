'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ProjectSummary } from '@/types/project'

interface UseProjectSummaryOptions {
  projectId?: string
  orgId?: string | null
  period?: '7d' | '30d' | '90d'
}

export function useProjectSummary({ projectId, orgId, period = '30d' }: UseProjectSummaryOptions) {
  const [summary, setSummary] = useState<ProjectSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSummary = useCallback(async () => {
    if (!projectId || !orgId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch(
        `/api/projects/${projectId}/summary?orgId=${orgId}&period=${period}`,
      )
      if (!res.ok) {
        throw new Error(`Failed to fetch project summary (${res.status})`)
      }
      const data = await res.json()
      setSummary(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [projectId, orgId, period])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  return { summary, isLoading, error, refetch: fetchSummary }
}
