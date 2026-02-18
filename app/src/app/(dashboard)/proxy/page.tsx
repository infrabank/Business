'use client'

import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import { useSession } from '@/hooks/useSession'
import { ProxyKeyForm } from '@/features/proxy/components/ProxyKeyForm'
import { ProxyKeyList } from '@/features/proxy/components/ProxyKeyList'
import { ProxyLogTable } from '@/features/proxy/components/ProxyLogTable'
import { SetupInstructions } from '@/features/proxy/components/SetupInstructions'
import { SavingsDashboard } from '@/features/proxy/components/SavingsDashboard'
import { ObservabilitySettings } from '@/features/proxy/components/ObservabilitySettings'
import { ProxyCostTrendChart } from '@/features/proxy/components/ProxyCostTrendChart'
import { ModelBreakdownChart } from '@/features/proxy/components/ModelBreakdownChart'
import { KeyBreakdownTable } from '@/features/proxy/components/KeyBreakdownTable'
import { useProxyKeys } from '@/features/proxy/hooks/useProxyKeys'
import { useProxyLogs } from '@/features/proxy/hooks/useProxyLogs'
import { useProxyAnalytics } from '@/features/proxy/hooks/useProxyAnalytics'
import type { AnalyticsPeriod, BreakdownType } from '@/types/proxy-analytics'

export default function ProxyPage() {
  const { isReady } = useSession()
  const orgId = useAppStore((s) => s.currentOrgId)
  const { keys, loading: keysLoading, error, createKey, toggleKey, removeKey } = useProxyKeys(orgId)
  const { logs, loading: logsLoading, offset, nextPage, prevPage } = useProxyLogs({ orgId })
  const [showForm, setShowForm] = useState(false)
  const [activeTab, setActiveTab] = useState<'keys' | 'savings' | 'analytics' | 'logs' | 'settings'>('keys')
  const [analyticsPeriod, setAnalyticsPeriod] = useState<AnalyticsPeriod>('30d')
  const [breakdownBy, setBreakdownBy] = useState<BreakdownType>('model')
  const { timeseries, breakdown, isLoading: analyticsLoading } = useProxyAnalytics({
    orgId,
    period: analyticsPeriod,
    breakdownBy,
  })

  if (!isReady) {
    return <div className="py-12 text-center text-gray-400 dark:text-slate-500">로딩 중...</div>
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">API 프록시 & 비용 절감</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            LLM 요청을 프록시를 통해 라우팅 — 스마트 캐싱과 모델 라우팅으로 비용 절감
          </p>
        </div>
        {activeTab === 'keys' && (
          <button
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? '폼 숨기기' : '+ 새 프록시 키'}
          </button>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 rounded-lg bg-gray-100 dark:bg-slate-800 p-1">
        <button
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'keys' ? 'bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 shadow-sm' : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
          }`}
          onClick={() => setActiveTab('keys')}
        >
          프록시 키
        </button>
        <button
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'savings' ? 'bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 shadow-sm' : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
          }`}
          onClick={() => setActiveTab('savings')}
        >
          비용 절감
        </button>
        <button
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'analytics' ? 'bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 shadow-sm' : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
          }`}
          onClick={() => setActiveTab('analytics')}
        >
          분석
        </button>
        <button
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'logs' ? 'bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 shadow-sm' : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
          }`}
          onClick={() => setActiveTab('logs')}
        >
          요청 로그
        </button>
        <button
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'settings' ? 'bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 shadow-sm' : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
          }`}
          onClick={() => setActiveTab('settings')}
        >
          설정
        </button>
      </div>

      {activeTab === 'keys' && (
        <>
          {showForm && (
            <ProxyKeyForm onSubmit={createKey} />
          )}

          <section>
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-slate-100">프록시 키</h2>
            {error && (
              <div className="mb-4 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-400">
                {error}
              </div>
            )}
            {keysLoading ? (
              <div className="py-8 text-center text-gray-400 dark:text-slate-500">키 로딩 중...</div>
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

      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Controls */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex gap-1 rounded-lg bg-gray-100 dark:bg-slate-800 p-1">
              {(['7d', '30d', '90d'] as AnalyticsPeriod[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setAnalyticsPeriod(p)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    analyticsPeriod === p ? 'bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 shadow-sm' : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
                  }`}
                >
                  {p === '7d' ? '7일' : p === '30d' ? '30일' : '90일'}
                </button>
              ))}
            </div>
            <div className="flex gap-1 rounded-lg bg-gray-100 dark:bg-slate-800 p-1">
              {([['model', '모델'], ['provider', '프로바이더'], ['key', '키']] as [BreakdownType, string][]).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setBreakdownBy(val)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    breakdownBy === val ? 'bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 shadow-sm' : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {analyticsLoading ? (
            <div className="py-12 text-center text-gray-400 dark:text-slate-500">분석 데이터 로딩 중...</div>
          ) : (
            <>
              <ProxyCostTrendChart data={timeseries} />
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <ModelBreakdownChart
                  data={breakdown}
                  title={breakdownBy === 'model' ? '모델별 비용' : breakdownBy === 'provider' ? '프로바이더별 비용' : '키별 비용'}
                />
                <KeyBreakdownTable data={breakdown} />
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'logs' && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-slate-100">요청 로그</h2>
          <ProxyLogTable
            logs={logs}
            loading={logsLoading}
            offset={offset}
            onNextPage={nextPage}
            onPrevPage={prevPage}
          />
        </section>
      )}

      {activeTab === 'settings' && (
        <ObservabilitySettings orgId={orgId} />
      )}
    </div>
  )
}
