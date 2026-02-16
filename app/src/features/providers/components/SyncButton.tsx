'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { RefreshCw, Check, AlertTriangle } from 'lucide-react'

interface SyncButtonProps {
  providerId: string
  orgId: string
  lastSyncAt?: string
  supportsUsageApi?: boolean
  onSyncComplete?: () => void
}

type SyncState = 'idle' | 'syncing' | 'success' | 'error'

export function SyncButton({ providerId, orgId, lastSyncAt, supportsUsageApi = true, onSyncComplete }: SyncButtonProps) {
  const [state, setState] = useState<SyncState>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleSync = useCallback(async () => {
    setState('syncing')
    setErrorMessage('')

    try {
      const res = await fetch('/api/sync/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId, providerId }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Sync failed (${res.status})`)
      }

      const data = await res.json()
      const failed = data.sync?.filter((s: { status: string }) => s.status === 'failed')

      if (failed?.length > 0) {
        setState('error')
        setErrorMessage(failed[0].error || 'Provider sync failed')
        return
      }

      setState('success')
      onSyncComplete?.()
      setTimeout(() => setState('idle'), 3000)
    } catch (err) {
      setState('error')
      setErrorMessage(err instanceof Error ? err.message : 'Sync failed')
    }
  }, [orgId, providerId, onSyncComplete])

  if (!supportsUsageApi) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
        <p className="text-sm text-amber-800">
          This provider does not support automatic usage sync.
        </p>
        <p className="mt-1 text-xs text-amber-600">
          Usage data can be imported via CSV or entered manually.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">Last synced</p>
          <p className="font-medium text-gray-900">
            {lastSyncAt ? new Date(lastSyncAt).toLocaleString() : 'Never'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {state === 'success' && (
            <span className="flex items-center gap-1 text-sm text-green-600">
              <Check className="h-4 w-4" /> Synced!
            </span>
          )}
          <Button
            variant={state === 'error' ? 'outline' : 'outline'}
            size="sm"
            onClick={handleSync}
            disabled={state === 'syncing'}
          >
            {state === 'syncing' ? (
              <>
                <RefreshCw className="mr-1 h-4 w-4 animate-spin" /> Syncing...
              </>
            ) : state === 'error' ? (
              <>
                <RefreshCw className="mr-1 h-4 w-4" /> Retry
              </>
            ) : (
              <>
                <RefreshCw className="mr-1 h-4 w-4" /> Sync Now
              </>
            )}
          </Button>
        </div>
      </div>
      {state === 'error' && errorMessage && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <p className="text-sm text-red-700">{errorMessage}</p>
        </div>
      )}
    </div>
  )
}
