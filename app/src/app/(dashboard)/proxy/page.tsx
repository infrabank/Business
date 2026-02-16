'use client'

import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import { useSession } from '@/hooks/useSession'
import { ProxyKeyForm } from '@/features/proxy/components/ProxyKeyForm'
import { ProxyKeyList } from '@/features/proxy/components/ProxyKeyList'
import { ProxyLogTable } from '@/features/proxy/components/ProxyLogTable'
import { SetupInstructions } from '@/features/proxy/components/SetupInstructions'
import { SavingsDashboard } from '@/features/proxy/components/SavingsDashboard'
import { useProxyKeys } from '@/features/proxy/hooks/useProxyKeys'
import { useProxyLogs } from '@/features/proxy/hooks/useProxyLogs'

export default function ProxyPage() {
  const { isReady } = useSession()
  const orgId = useAppStore((s) => s.currentOrgId)
  const { keys, loading: keysLoading, error, createKey, toggleKey, removeKey } = useProxyKeys(orgId)
  const { logs, loading: logsLoading, offset, nextPage, prevPage } = useProxyLogs({ orgId })
  const [showForm, setShowForm] = useState(false)
  const [activeTab, setActiveTab] = useState<'keys' | 'savings' | 'logs'>('keys')

  if (!isReady) {
    return <div className="py-12 text-center text-gray-400">Loading...</div>
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">API Proxy & Cost Savings</h1>
          <p className="mt-1 text-sm text-gray-500">
            Route LLM calls through our proxy — save money with smart caching and model routing
          </p>
        </div>
        {activeTab === 'keys' && (
          <button
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? 'Hide Form' : '+ New Proxy Key'}
          </button>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
        <button
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'keys' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
          onClick={() => setActiveTab('keys')}
        >
          Proxy Keys
        </button>
        <button
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'savings' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
          onClick={() => setActiveTab('savings')}
        >
          Cost Savings
        </button>
        <button
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'logs' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
          onClick={() => setActiveTab('logs')}
        >
          Request Logs
        </button>
      </div>

      {activeTab === 'keys' && (
        <>
          {showForm && (
            <ProxyKeyForm onSubmit={createKey} />
          )}

          <section>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Proxy Keys</h2>
            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            {keysLoading ? (
              <div className="py-8 text-center text-gray-400">Loading keys...</div>
            ) : (
              <ProxyKeyList keys={keys} onToggle={toggleKey} onDelete={removeKey} />
            )}
          </section>

          <SetupInstructions />
        </>
      )}

      {activeTab === 'savings' && (
        <SavingsDashboard />
      )}

      {activeTab === 'logs' && (
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
      )}
    </div>
  )
}
