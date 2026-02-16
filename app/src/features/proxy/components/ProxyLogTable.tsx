'use client'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { DataTable } from '@/components/ui/DataTable'
import { PROVIDER_LABELS } from '@/lib/constants'
import type { ProxyLog } from '@/types/proxy'

interface ProxyLogTableProps {
  logs: ProxyLog[]
  loading: boolean
  offset: number
  onNextPage: () => void
  onPrevPage: () => void
}

export function ProxyLogTable({ logs, loading, offset, onNextPage, onPrevPage }: ProxyLogTableProps) {
  const columns = [
    {
      key: 'createdAt',
      header: 'Time',
      render: (log: ProxyLog) => (
        <span className="text-xs text-gray-500">
          {new Date(log.createdAt).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'providerType',
      header: 'Provider',
      render: (log: ProxyLog) => PROVIDER_LABELS[log.providerType] || log.providerType,
    },
    {
      key: 'model',
      header: 'Model',
      render: (log: ProxyLog) => (
        <code className="text-xs">{log.model}</code>
      ),
    },
    {
      key: 'tokens',
      header: 'Tokens',
      align: 'right' as const,
      render: (log: ProxyLog) => (
        <span className="text-xs">
          {log.inputTokens.toLocaleString()} / {log.outputTokens.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'cost',
      header: 'Cost',
      align: 'right' as const,
      render: (log: ProxyLog) => (
        <span className="font-mono text-xs">${Number(log.cost).toFixed(4)}</span>
      ),
    },
    {
      key: 'latencyMs',
      header: 'Latency',
      align: 'right' as const,
      render: (log: ProxyLog) => (
        <span className="text-xs">{log.latencyMs}ms</span>
      ),
    },
    {
      key: 'statusCode',
      header: 'Status',
      align: 'center' as const,
      render: (log: ProxyLog) => (
        <Badge variant={log.statusCode < 400 ? 'default' : 'danger'}>
          {log.statusCode}
        </Badge>
      ),
    },
    {
      key: 'isStreaming',
      header: 'Stream',
      align: 'center' as const,
      render: (log: ProxyLog) => (log.isStreaming ? 'Yes' : 'No'),
    },
  ]

  if (loading) {
    return <div className="py-8 text-center text-gray-400">Loading logs...</div>
  }

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={logs}
        keyExtractor={(log) => log.id}
        emptyMessage="No proxy logs yet"
        ariaLabel="Proxy request logs"
      />
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrevPage}
          disabled={offset === 0}
        >
          Previous
        </Button>
        <span className="text-sm text-gray-500">
          Showing {offset + 1} - {offset + logs.length}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={onNextPage}
          disabled={logs.length < 50}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
