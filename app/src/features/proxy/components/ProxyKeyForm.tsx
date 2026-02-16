'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import type { ProviderType } from '@/types/provider'

interface ProxyKeyFormProps {
  onSubmit: (data: {
    name: string
    providerType: ProviderType
    apiKey: string
    budgetLimit?: number
    rateLimit?: number
    enableCache?: boolean
    cacheTtl?: number
    enableModelRouting?: boolean
  }) => Promise<{ proxyKey: string } | null>
}

export function ProxyKeyForm({ onSubmit }: ProxyKeyFormProps) {
  const [name, setName] = useState('')
  const [providerType, setProviderType] = useState<ProviderType>('openai')
  const [apiKey, setApiKey] = useState('')
  const [budgetLimit, setBudgetLimit] = useState('')
  const [rateLimit, setRateLimit] = useState('')
  const [enableCache, setEnableCache] = useState(true)
  const [enableModelRouting, setEnableModelRouting] = useState(false)
  const [loading, setLoading] = useState(false)
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const result = await onSubmit({
        name,
        providerType,
        apiKey,
        budgetLimit: budgetLimit ? Number(budgetLimit) : undefined,
        rateLimit: rateLimit ? Number(rateLimit) : undefined,
        enableCache,
        enableModelRouting,
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
          <h3 className="text-lg font-semibold text-green-700">프록시 키 생성됨</h3>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-gray-600">
            지금 이 키를 복사하세요. 다시 표시되지 않습니다.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg border bg-gray-50 px-3 py-2 text-sm font-mono break-all">
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
            <label className="block text-sm font-medium text-gray-700">프로바이더</label>
            <select
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={providerType}
              onChange={(e) => setProviderType(e.target.value as ProviderType)}
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="google">Google AI</option>
            </select>
          </div>
          <Input
            label="API 키"
            type="password"
            placeholder="실제 API 키를 입력하세요 (암호화됩니다)"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            required
          />
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
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
            <p className="text-sm font-medium text-gray-700">비용 절감 옵션</p>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={enableCache}
                onChange={(e) => setEnableCache(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">응답 캐싱</span>
                <p className="text-xs text-gray-500">동일한 요청을 캐싱하여 중복 API 호출 방지</p>
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
                <span className="text-sm font-medium text-gray-900">스마트 모델 라우팅</span>
                <p className="text-xs text-gray-500">간단한 요청을 저렴한 모델로 자동 라우팅 (최대 90%+ 절감)</p>
              </div>
            </label>
          </div>
          <Button type="submit" loading={loading} disabled={!name || !apiKey}>
            프록시 키 생성
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
