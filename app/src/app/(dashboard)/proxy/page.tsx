'use client'

import { useState } from 'react'
import { ProxyKeyForm } from '@/features/proxy/components/ProxyKeyForm'
import { ProxyKeyList } from '@/features/proxy/components/ProxyKeyList'
import { ProxyLogTable } from '@/features/proxy/components/ProxyLogTable'
import { SetupInstructions } from '@/features/proxy/components/SetupInstructions'
import { useProxyKeys } from '@/features/proxy/hooks/useProxyKeys'
import { useProxyLogs } from '@/features/proxy/hooks/useProxyLogs'

export default function ProxyPage() {
  const { keys, loading: keysLoading, createKey, toggleKey, removeKey } = useProxyKeys()
  const { logs, loading: logsLoading, offset, nextPage, prevPage } = useProxyLogs()
  const [showForm, setShowForm] = useState(false)

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">API Proxy</h1>
          <p className="mt-1 text-sm text-gray-500">
            Route your LLM API calls through our proxy for automatic cost tracking
          </p>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Hide Form' : '+ New Proxy Key'}
        </button>
      </div>

      {showForm && (
        <ProxyKeyForm onSubmit={createKey} />
      )}

      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Proxy Keys</h2>
        {keysLoading ? (
          <div className="py-8 text-center text-gray-400">Loading keys...</div>
        ) : (
          <ProxyKeyList keys={keys} onToggle={toggleKey} onDelete={removeKey} />
        )}
      </section>

      <SetupInstructions />

      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Request Logs</h2>
        <ProxyLogTable
          logs={logs}
          loading={logsLoading}
          offset={offset}
          onNextPage={nextPage}
          onPrevPage={prevPage}
        />
      </section>
    </div>
  )
}
