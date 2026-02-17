'use client'

import { useState, useEffect, useCallback } from 'react'
import type { AnomalyEvent } from '@/types/anomaly'

export function useAnomalyHistory(orgId?: string | null, days: number = 30) {
  const [events, setEvents] = useState<AnomalyEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchHistory = useCallback(async () => {
    if (!orgId) { setIsLoading(false); return }
    setIsLoading(true)
    try {
      const res = await fetch(`/api/anomaly/history?orgId=${orgId}&days=${days}`)
      if (res.ok) setEvents(await res.json())
    } catch {
      setEvents([])
    } finally {
      setIsLoading(false)
    }
  }, [orgId, days])

  useEffect(() => { fetchHistory() }, [fetchHistory])

  const suppressEvent = useCallback(async (pattern: string) => {
    if (!orgId) return
    try {
      await fetch('/api/anomaly/suppress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId, pattern }),
      })
      fetchHistory()
    } catch {}
  }, [orgId, fetchHistory])

  return { events, isLoading, refetch: fetchHistory, suppressEvent }
}
