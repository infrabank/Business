'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { toast } from '@/components/ui/Toast'
import { useObservabilityConfig } from '../hooks/useObservabilityConfig'
import { Activity, Send, Trash2, Eye, EyeOff } from 'lucide-react'
import type { ObservabilitySettings as ObsSettings } from '@/types/proxy'

interface ObservabilitySettingsProps {
  orgId: string | null
}

type ObsProvider = 'langfuse' | 'webhook' | 'logflare'

const PROVIDER_OPTIONS: { value: ObsProvider; label: string; desc: string }[] = [
  { value: 'langfuse', label: 'Langfuse', desc: 'LLM 관찰 및 분석 플랫폼' },
  { value: 'webhook', label: 'Webhook', desc: '커스텀 HTTP 엔드포인트' },
  { value: 'logflare', label: 'Logflare', desc: '실시간 로그 스트리밍' },
]

const EVENT_OPTIONS: { value: string; label: string }[] = [
  { value: 'request', label: '요청' },
  { value: 'response', label: '응답' },
  { value: 'error', label: '오류' },
  { value: 'cache_hit', label: '캐시 히트' },
  { value: 'budget_exceeded', label: '예산 초과' },
  { value: 'guardrail_blocked', label: 'Guardrail 차단' },
]

const EMPTY_CONFIG: ObsSettings = {
  provider: 'langfuse',
  enabled: true,
  endpoint: '',
  apiKey: '',
  secretKey: '',
  events: ['request', 'response', 'error'],
}

export function ObservabilitySettings({ orgId }: ObservabilitySettingsProps) {
  const { config, isLoading, saveConfig, deleteConfig, testConnection } = useObservabilityConfig(orgId)
  const [form, setForm] = useState<ObsSettings>(EMPTY_CONFIG)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [showSecrets, setShowSecrets] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    if (config) {
      setForm(config)
      setHasChanges(false)
    }
  }, [config])

  const updateField = <K extends keyof ObsSettings>(key: K, value: ObsSettings[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const toggleEvent = (event: string) => {
    setForm((prev) => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event],
    }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    if (!form.endpoint) {
      toast('error', '엔드포인트 URL을 입력하세요.')
      return
    }
    setSaving(true)
    try {
      const ok = await saveConfig(form)
      if (ok) {
        toast('success', 'Observability 설정이 저장되었습니다.')
        setHasChanges(false)
      } else {
        toast('error', '설정 저장 실패')
      }
    } catch {
      toast('error', '설정 저장 실패')
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    if (!form.endpoint) {
      toast('error', '엔드포인트 URL을 입력하세요.')
      return
    }
    setTesting(true)
    try {
      const result = await testConnection(form)
      if (result.success) {
        toast('success', '연결 테스트 성공!')
      } else {
        toast('error', `연결 실패: ${result.error}`)
      }
    } catch {
      toast('error', '테스트 실패')
    } finally {
      setTesting(false)
    }
  }

  const handleDelete = async () => {
    const ok = await deleteConfig()
    if (ok) {
      setForm(EMPTY_CONFIG)
      setHasChanges(false)
      toast('success', 'Observability 설정이 삭제되었습니다.')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-100 dark:bg-slate-800" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-gray-400 dark:text-slate-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Observability 설정</h3>
            </div>
            <Badge variant={config?.enabled ? 'success' : 'default'}>
              {config ? (config.enabled ? '연결됨' : '비활성') : '미설정'}
            </Badge>
          </div>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            프록시 요청 데이터를 외부 관찰 도구로 전송합니다. 새로 생성하는 프록시 키에 기본값으로 적용됩니다.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Provider Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-slate-300">프로바이더</label>
            <div className="grid gap-2 sm:grid-cols-3">
              {PROVIDER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => updateField('provider', opt.value)}
                  className={`rounded-lg border p-3 text-left transition ${
                    form.provider === opt.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-400'
                      : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
                  }`}
                >
                  <span className={`text-sm font-medium ${
                    form.provider === opt.value ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-slate-100'
                  }`}>
                    {opt.label}
                  </span>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Endpoint */}
          <Input
            id="obs-endpoint"
            label={form.provider === 'langfuse' ? 'Langfuse Host' : 'Webhook URL'}
            value={form.endpoint}
            onChange={(e) => updateField('endpoint', e.target.value)}
            placeholder={
              form.provider === 'langfuse'
                ? 'https://cloud.langfuse.com'
                : 'https://your-webhook.example.com/events'
            }
          />

          {/* API Key */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label htmlFor="obs-api-key" className="text-sm font-medium text-gray-700 dark:text-slate-300">
                {form.provider === 'langfuse' ? 'Public Key' : 'API Key (선택)'}
              </label>
              <button
                onClick={() => setShowSecrets(!showSecrets)}
                className="text-xs text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300 flex items-center gap-1"
              >
                {showSecrets ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                {showSecrets ? '숨기기' : '보기'}
              </button>
            </div>
            <input
              id="obs-api-key"
              type={showSecrets ? 'text' : 'password'}
              value={form.apiKey}
              onChange={(e) => updateField('apiKey', e.target.value)}
              placeholder={form.provider === 'langfuse' ? 'pk-lf-...' : 'Bearer token'}
              className="block w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Secret Key (Langfuse only) */}
          {form.provider === 'langfuse' && (
            <div className="space-y-1">
              <label htmlFor="obs-secret-key" className="text-sm font-medium text-gray-700 dark:text-slate-300">
                Secret Key
              </label>
              <input
                id="obs-secret-key"
                type={showSecrets ? 'text' : 'password'}
                value={form.secretKey}
                onChange={(e) => updateField('secretKey', e.target.value)}
                placeholder="sk-lf-..."
                className="block w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Event Types */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-slate-300">전송 이벤트</label>
            <div className="flex flex-wrap gap-2">
              {EVENT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => toggleEvent(opt.value)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    form.events.includes(opt.value)
                      ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                      : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Enable toggle */}
          <div className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-slate-700 p-3">
            <div>
              <span className="text-sm font-medium text-gray-900 dark:text-slate-100">활성화</span>
              <p className="text-xs text-gray-500 dark:text-slate-400">프록시 이벤트를 외부로 전송합니다</p>
            </div>
            <button
              onClick={() => updateField('enabled', !form.enabled)}
              className={`h-6 w-11 rounded-full transition ${form.enabled ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-slate-600'}`}
            >
              <div
                className="h-5 w-5 rounded-full bg-white shadow transition-transform"
                style={{ transform: form.enabled ? 'translateX(22px)' : 'translateX(2px)' }}
              />
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={saving || !form.endpoint}>
              {saving ? '저장 중...' : '설정 저장'}
            </Button>
            <Button variant="outline" onClick={handleTest} disabled={testing || !form.endpoint}>
              <Send className="mr-1.5 h-4 w-4" />
              {testing ? '테스트 중...' : '연결 테스트'}
            </Button>
            {config && (
              <Button variant="outline" onClick={handleDelete} className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30">
                <Trash2 className="mr-1.5 h-4 w-4" />
                삭제
              </Button>
            )}
            {hasChanges && (
              <span className="text-xs text-amber-600 dark:text-amber-400">저장되지 않은 변경사항</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <div className="rounded-lg border border-blue-100 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-4">
        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200">Observability 작동 방식</h4>
        <ul className="mt-2 space-y-1 text-sm text-blue-800 dark:text-blue-300">
          <li>- 프록시를 통과하는 모든 LLM 요청/응답 데이터를 외부로 전송합니다</li>
          <li>- 이벤트는 5초 간격 또는 100개 단위로 배치 전송됩니다</li>
          <li>- 분당 최대 600개 이벤트 (조직 단위 레이트 리밋)</li>
          <li>- 전송 실패 시 프록시 동작에 영향을 주지 않습니다 (fire-and-forget)</li>
        </ul>
      </div>
    </div>
  )
}
