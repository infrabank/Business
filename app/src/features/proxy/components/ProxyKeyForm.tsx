'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { RoutingRulesEditor } from './RoutingRulesEditor'
import type { ProviderType } from '@/types/provider'
import type { RoutingRule } from '@/types/proxy'

interface ProxyKeyFormProps {
  onSubmit: (data: {
    name: string
    providerType: ProviderType | 'auto'
    apiKey: string
    providerApiKeys?: Record<string, string>
    budgetLimit?: number
    rateLimit?: number
    enableCache?: boolean
    cacheTtl?: number
    enableModelRouting?: boolean
    budgetAlertsEnabled?: boolean
    budgetAlertThresholds?: number[]
    routingMode?: 'auto' | 'manual' | 'off'
    routingRules?: RoutingRule[]
  }) => Promise<{ proxyKey: string } | null>
}

export function ProxyKeyForm({ onSubmit }: ProxyKeyFormProps) {
  const [name, setName] = useState('')
  const [providerType, setProviderType] = useState<ProviderType | 'auto'>('openai')
  const [apiKey, setApiKey] = useState('')
  const [providerApiKeys, setProviderApiKeys] = useState<Record<string, string>>({
    openai: '',
    anthropic: '',
    google: '',
  })
  const [budgetLimit, setBudgetLimit] = useState('')
  const [rateLimit, setRateLimit] = useState('')
  const [enableCache, setEnableCache] = useState(true)
  const [enableModelRouting, setEnableModelRouting] = useState(false)
  const [routingMode, setRoutingMode] = useState<'auto' | 'manual' | 'off'>('auto')
  const [routingRules, setRoutingRules] = useState<RoutingRule[]>([])
  const [budgetAlertsEnabled, setBudgetAlertsEnabled] = useState(false)
  const [alertThresholds, setAlertThresholds] = useState<Record<string, boolean>>({
    '0.8': true,
    '0.9': true,
    '1.0': true,
  })
  const [loading, setLoading] = useState(false)
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      // Filter non-empty provider keys for auto mode
      const filteredProviderKeys = providerType === 'auto'
        ? Object.fromEntries(Object.entries(providerApiKeys).filter(([, v]) => v))
        : undefined

      const result = await onSubmit({
        name,
        providerType,
        apiKey: providerType === 'auto' ? (providerApiKeys.openai || providerApiKeys.anthropic || providerApiKeys.google || '') : apiKey,
        providerApiKeys: filteredProviderKeys,
        budgetLimit: budgetLimit ? Number(budgetLimit) : undefined,
        rateLimit: rateLimit ? Number(rateLimit) : undefined,
        enableCache,
        enableModelRouting,
        routingMode: enableModelRouting ? routingMode : undefined,
        routingRules: enableModelRouting && routingMode === 'manual' ? routingRules : undefined,
        budgetAlertsEnabled,
        budgetAlertThresholds: budgetAlertsEnabled
          ? Object.entries(alertThresholds).filter(([, v]) => v).map(([k]) => Number(k))
          : undefined,
      })
      if (result) {
        setCreatedKey(result.proxyKey)
        setName('')
        setApiKey('')
        setBudgetLimit('')
        setRateLimit('')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (createdKey) {
      await navigator.clipboard.writeText(createdKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (createdKey) {
    return (
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-green-700 dark:text-green-400">프록시 키 생성됨</h3>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-gray-600 dark:text-slate-400">
            지금 이 키를 복사하세요. 다시 표시되지 않습니다.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg border dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-slate-100 px-3 py-2 text-sm font-mono break-all">
              {createdKey}
            </code>
            <Button size="sm" onClick={handleCopy}>
              {copied ? '복사됨!' : '복사'}
            </Button>
          </div>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => setCreatedKey(null)}
          >
            다른 키 생성
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold">프록시 키 생성</h3>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="키 이름"
            placeholder="예: Production API, Development"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">프로바이더</label>
            <select
              className="block w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={providerType}
              onChange={(e) => setProviderType(e.target.value as ProviderType | 'auto')}
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="google">Google AI</option>
              <option value="auto">멀티 프로바이더 (자동 감지)</option>
            </select>
          </div>
          {providerType === 'auto' ? (
            <div className="space-y-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-4">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-300">프로바이더별 API 키</p>
              <p className="text-xs text-blue-600 dark:text-blue-400">사용할 프로바이더의 API 키를 입력하세요. 요청 형식에 따라 자동 감지됩니다.</p>
              <Input
                label="OpenAI API 키"
                type="password"
                placeholder="sk-..."
                value={providerApiKeys.openai}
                onChange={(e) => setProviderApiKeys((prev) => ({ ...prev, openai: e.target.value }))}
              />
              <Input
                label="Anthropic API 키"
                type="password"
                placeholder="sk-ant-..."
                value={providerApiKeys.anthropic}
                onChange={(e) => setProviderApiKeys((prev) => ({ ...prev, anthropic: e.target.value }))}
              />
              <Input
                label="Google AI API 키"
                type="password"
                placeholder="AI..."
                value={providerApiKeys.google}
                onChange={(e) => setProviderApiKeys((prev) => ({ ...prev, google: e.target.value }))}
              />
            </div>
          ) : (
            <Input
              label="API 키"
              type="password"
              placeholder="실제 API 키를 입력하세요 (암호화됩니다)"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              required
            />
          )}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="월간 예산 제한 ($)"
              type="number"
              placeholder="선택사항"
              value={budgetLimit}
              onChange={(e) => setBudgetLimit(e.target.value)}
              min="0"
              step="0.01"
            />
            <Input
              label="요청 제한 (요청/분)"
              type="number"
              placeholder="선택사항"
              value={rateLimit}
              onChange={(e) => setRateLimit(e.target.value)}
              min="0"
            />
          </div>
          <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 p-4 space-y-3">
            <p className="text-sm font-medium text-gray-700 dark:text-slate-300">비용 절감 옵션</p>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={enableCache}
                onChange={(e) => setEnableCache(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-900 dark:text-slate-100">응답 캐싱</span>
                <p className="text-xs text-gray-500 dark:text-slate-400">동일한 요청을 캐싱하여 중복 API 호출 방지</p>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={enableModelRouting}
                onChange={(e) => setEnableModelRouting(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-900 dark:text-slate-100">스마트 모델 라우팅</span>
                <p className="text-xs text-gray-500 dark:text-slate-400">간단한 요청을 저렴한 모델로 자동 라우팅 (최대 90%+ 절감)</p>
              </div>
            </label>
          </div>
          {enableModelRouting && (
            <RoutingRulesEditor
              routingMode={routingMode}
              rules={routingRules}
              onChange={(mode, rules) => {
                setRoutingMode(mode)
                setRoutingRules(rules)
              }}
            />
          )}
          {/* Budget Alert Settings */}
          {budgetLimit && (
            <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 p-4 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={budgetAlertsEnabled}
                  onChange={(e) => setBudgetAlertsEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900 dark:text-slate-100">예산 알림</span>
                  <p className="text-xs text-gray-500 dark:text-slate-400">예산 임계값 도달 시 알림 발송</p>
                </div>
              </label>
              {budgetAlertsEnabled && (
                <div className="ml-7 space-y-2">
                  <p className="text-xs font-medium text-gray-600 dark:text-slate-400">알림 임계값</p>
                  {[
                    { key: '0.8', label: '80%' },
                    { key: '0.9', label: '90%' },
                    { key: '1.0', label: '100%' },
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={alertThresholds[key]}
                        onChange={(e) =>
                          setAlertThresholds((prev) => ({ ...prev, [key]: e.target.checked }))
                        }
                        className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-slate-300">예산의 {label} 도달 시</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
          <Button type="submit" loading={loading} disabled={!name || (providerType === 'auto' ? !Object.values(providerApiKeys).some(Boolean) : !apiKey)}>
            프록시 키 생성
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
