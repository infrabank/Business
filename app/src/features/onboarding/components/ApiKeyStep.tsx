'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { PROVIDER_LABELS } from '@/lib/constants'
import { Check, Eye, EyeOff, ExternalLink, Loader2, AlertTriangle } from 'lucide-react'
import type { ProviderType } from '@/types'

interface ApiKeyStepProps {
  provider: ProviderType
  apiKey: string
  onKeyChange: (key: string) => void
  keyStatus: 'idle' | 'validating' | 'valid' | 'invalid'
  keyError: string | null
  keyModels: string[]
  providerRegistered: boolean
  onValidate: () => Promise<boolean>
  onRegister: () => Promise<boolean>
}

const API_KEY_GUIDES: Record<string, { url: string; placeholder: string }> = {
  openai: { url: 'https://platform.openai.com/api-keys', placeholder: 'sk-...' },
  anthropic: { url: 'https://console.anthropic.com/settings/keys', placeholder: 'sk-ant-...' },
  google: { url: 'https://aistudio.google.com/apikey', placeholder: 'AIza...' },
}

export function ApiKeyStep({
  provider,
  apiKey,
  onKeyChange,
  keyStatus,
  keyError,
  keyModels,
  providerRegistered,
  onValidate,
  onRegister,
}: ApiKeyStepProps) {
  const guide = API_KEY_GUIDES[provider] || { url: '', placeholder: '' }
  const providerName = PROVIDER_LABELS[provider] || provider
  const [showKey, setShowKey] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)

  const handleValidateAndRegister = async () => {
    const isValid = await onValidate()
    if (isValid) {
      setIsRegistering(true)
      await onRegister()
      setIsRegistering(false)
    }
  }

  const maskedKey = apiKey.length > 8
    ? apiKey.slice(0, 4) + '\u2022'.repeat(Math.min(apiKey.length - 8, 20)) + apiKey.slice(-4)
    : apiKey

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
        {providerName} API 키를 입력하세요
      </h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        API 키를 입력하면 자동으로 유효성을 확인하고 등록합니다
      </p>

      <div className="mt-6">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type={showKey ? 'text' : 'password'}
              value={showKey ? apiKey : (apiKey ? maskedKey : '')}
              onChange={(e) => onKeyChange(e.target.value)}
              onFocus={() => setShowKey(true)}
              placeholder={guide.placeholder}
              className={[
                'w-full rounded-xl border px-4 py-3 pr-10 font-mono text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2',
                keyStatus === 'valid' ? 'border-green-400 focus:ring-green-200' : '',
                keyStatus === 'invalid' ? 'border-red-400 focus:ring-red-200' : '',
                keyStatus !== 'valid' && keyStatus !== 'invalid' ? 'border-slate-300 dark:border-slate-600 focus:ring-blue-200' : '',
              ].join(' ')}
              disabled={providerRegistered}
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <Button
            onClick={handleValidateAndRegister}
            disabled={!apiKey || keyStatus === 'validating' || providerRegistered}
            className="shrink-0"
          >
            {keyStatus === 'validating' || isRegistering ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> 검증 중...</>
            ) : providerRegistered ? (
              <><Check className="mr-2 h-4 w-4" /> 등록 완료</>
            ) : (
              '키 검증'
            )}
          </Button>
        </div>

        {guide.url && (
          <a
            href={guide.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-sm text-blue-500 hover:text-blue-700"
          >
            <ExternalLink className="h-3 w-3" /> {providerName} API 키 발급 가이드
          </a>
        )}

        {keyStatus === 'valid' && (
          <div className="mt-4 rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/50 p-4">
            <p className="flex items-center gap-2 font-medium text-green-700 dark:text-green-400">
              <Check className="h-5 w-5" /> API 키가 유효합니다
            </p>
            {keyModels.length > 0 && (
              <p className="mt-1 text-sm text-green-600 dark:text-green-500">
                사용 가능한 모델: {keyModels.slice(0, 5).join(', ')}
                {keyModels.length > 5 && ` 외 ${keyModels.length - 5}개`}
              </p>
            )}
          </div>
        )}

        {keyStatus === 'invalid' && keyError && (
          <div className="mt-4 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/50 p-4">
            <p className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
              <AlertTriangle className="h-4 w-4 shrink-0" /> {keyError}
            </p>
            <p className="mt-1 text-xs text-red-500 dark:text-red-400">
              키를 다시 확인하거나 새 키를 발급받아 주세요
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
