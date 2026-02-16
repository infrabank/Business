'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ProxyLog } from '@/types/proxy'

interface UseProxyLogsParams {
  orgId: string | null
  proxyKeyId?: string
  providerType?: string
  limit?: number
}

export function useProxyLogs(params: UseProxyLogsParams) {
  const [logs, setLogs] = useState<ProxyLog[]>([])
  const [loading, setLoading] = useState(true)
  const [offset, setOffset] = useState(0)
  const limit = params.limit || 50

  const fetchLogs = useCallback(async (newOffset = 0) => {
    if (!params.orgId) return
    try {
      setLoading(true)
      const searchParams = new URLSearchParams({
        orgId: params.orgId,
        limit: String(limit),
        offset: String(newOffset),
      })
      if (params.proxyKeyId) searchParams.set('proxyKeyId', params.proxyKeyId)
      if (params.providerType) searchParams.set('providerType', params.providerType)

      const res = await fetch(`/api/proxy/logs?${searchParams}`)
      if (!res.ok) throw new Error('Failed to fetch logs')
      const data = await res.json()
      setLogs(data)
      setOffset(newOffset)
    } catch {
      // Silent fail for logs
    } finally {
      setLoading(false)
    }
  }, [limit, params.orgId, params.proxyKeyId, params.providerType])

  useEffect(() => { fetchLogs(0) }, [fetchLogs])

  const nextPage = () => fetchLogs(offset + limit)
  const prevPage = () => fetchLogs(Math.max(0, offset - limit))

  return { logs, loading, offset, nextPage, prevPage, refetch: () => fetchLogs(offset) }
}
