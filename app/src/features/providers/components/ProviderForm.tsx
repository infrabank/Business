'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Check, AlertTriangle, Eye, EyeOff, Loader2 } from 'lucide-react'
import { validateApiKey } from '@/features/providers/hooks/useProviders'
import type { ProviderType } from '@/types'

interface ProviderFormProps {
  onSubmit: (data: { type: ProviderType; name: string; apiKey: string }) => void
  onCancel?: () => void
  isLoading?: boolean
  error?: string | null
}

const PROVIDER_OPTIONS: { value: ProviderType; label: string; placeholder: string }[] = [
  { value: 'openai', label: 'OpenAI', placeholder: 'sk-...' },
  { value: 'anthropic', label: 'Anthropic', placeholder: 'sk-ant-...' },
  { value: 'google', label: 'Google AI', placeholder: 'AIza...' },
]

type KeyStatus = 'idle' | 'testing' | 'valid' | 'invalid'

export function ProviderForm({ onSubmit, onCancel, isLoading, error }: ProviderFormProps) {
  const [type, setType] = useState<ProviderType>('openai')
  const [name, setName] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [keyStatus, setKeyStatus] = useState<KeyStatus>('idle')
  const [keyError, setKeyError] = useState('')
  const [keyModels, setKeyModels] = useState<string[]>([])

  const currentProvider = PROVIDER_OPTIONS.find((p) => p.value === type)!

  async function handleTestKey() {
    if (!apiKey) return
    setKeyStatus('testing')
    setKeyError('')
    setKeyModels([])
    const result = await validateApiKey(type, apiKey)
    if (result.valid) {
      setKeyStatus('valid')
      setKeyModels(result.models || [])
    } else {
      setKeyStatus('invalid')
      setKeyError(result.error || 'Invalid API key')
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit({ type, name: name || currentProvider.label, apiKey })
  }

  function handleKeyChange(value: string) {
    setApiKey(value)
    if (keyStatus !== 'idle') {
      setKeyStatus('idle')
      setKeyError('')
      setKeyModels([])
    }
  }

  function handleTypeChange(value: ProviderType) {
    setType(value)
    if (keyStatus !== 'idle') {
      setKeyStatus('idle')
      setKeyError('')
      setKeyModels([])
    }
  }

  const maskedKey = apiKey.length > 8
    ? apiKey.slice(0, 4) + '•'.repeat(Math.min(apiKey.length - 8, 20)) + apiKey.slice(-4)
    : apiKey

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold text-gray-900">프로바이더 추가</h3>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">프로바이더</label>
            <select
              value={type}
              onChange={(e) => handleTypeChange(e.target.value as ProviderType)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {PROVIDER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <Input label="표시 이름" value={name} onChange={(e) => setName(e.target.value)} placeholder={`예: Production ${currentProvider.label}`} />

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">API 키</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={showKey ? apiKey : (apiKey ? maskedKey : '')}
                  onChange={(e) => handleKeyChange(e.target.value)}
                  onFocus={() => setShowKey(true)}
                  placeholder={currentProvider.placeholder}
                  className={`w-full rounded-lg border px-3 py-2 pr-10 text-sm font-mono focus:outline-none focus:ring-1 ${
                    keyStatus === 'valid' ? 'border-green-400 focus:border-green-500 focus:ring-green-500' :
                    keyStatus === 'invalid' ? 'border-red-400 focus:border-red-500 focus:ring-red-500' :
                    'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleTestKey}
                disabled={!apiKey || keyStatus === 'testing'}
              >
                {keyStatus === 'testing' ? (
                  <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> 검증 중...</>
                ) : keyStatus === 'valid' ? (
                  <><Check className="mr-1 h-4 w-4 text-green-600" /> 유효함</>
                ) : (
                  '키 검증'
                )}
              </Button>
            </div>

            {keyStatus === 'valid' && (
              <div className="mt-2 rounded-lg border border-green-200 bg-green-50 p-2">
                <p className="flex items-center gap-1 text-sm font-medium text-green-700">
                  <Check className="h-4 w-4" /> API 키가 유효합니다
                </p>
                {keyModels.length > 0 && (
                  <p className="mt-1 text-xs text-green-600">
                    사용 가능한 모델: {keyModels.slice(0, 5).join(', ')}{keyModels.length > 5 ? ` 외 ${keyModels.length - 5}개` : ''}
                  </p>
                )}
              </div>
            )}

            {keyStatus === 'invalid' && (
              <div className="mt-2 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                <p className="text-sm text-red-700">{keyError}</p>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={!apiKey || isLoading}>
              {isLoading ? '추가 중...' : '프로바이더 추가'}
            </Button>
            {onCancel && <Button type="button" variant="outline" onClick={onCancel}>취소</Button>}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
