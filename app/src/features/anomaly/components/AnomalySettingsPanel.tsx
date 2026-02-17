'use client'

import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Shield } from 'lucide-react'
import { useAnomalySettings } from '../hooks/useAnomalySettings'
import { isFeatureAvailable } from '@/lib/plan-limits'
import type { UserPlan } from '@/types'
import type { AnomalySensitivity } from '@/types/anomaly'

interface AnomalySettingsPanelProps {
  orgId: string | null
  plan: UserPlan
}

const SENSITIVITY_LABELS: Record<AnomalySensitivity, { label: string; desc: string }> = {
  low:    { label: '낮음', desc: 'Z-score 3.0 이상만 감지 (오탐 최소)' },
  medium: { label: '중간', desc: 'Z-score 2.0 이상 감지 (기본값)' },
  high:   { label: '높음', desc: 'Z-score 1.5 이상 감지 (민감)' },
}

export function AnomalySettingsPanel({ orgId, plan }: AnomalySettingsPanelProps) {
  const { settings, isLoading, updateSettings } = useAnomalySettings(orgId)
  const canCustomize = isFeatureAvailable(plan, 'anomaly_detection')

  if (isLoading) {
    return <div className="h-48 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
  }

  if (!settings) return null

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-indigo-500" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">이상 감지 설정</h3>
          <Badge variant={settings.enabled ? 'info' : 'default'}>
            {settings.enabled ? '활성' : '비활성'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Enable toggle */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-700 dark:text-slate-300">이상 감지 활성화</span>
          <button
            onClick={() => updateSettings({ enabled: !settings.enabled })}
            className={`relative h-6 w-11 rounded-full transition-colors ${
              settings.enabled ? 'bg-indigo-500' : 'bg-slate-300'
            }`}
          >
            <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white dark:bg-slate-900 transition-transform ${
              settings.enabled ? 'translate-x-5' : ''
            }`} />
          </button>
        </div>

        {/* Sensitivity selector */}
        <div>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">민감도</span>
          {!canCustomize && (
            <Badge variant="warning" className="ml-2">Growth 플랜 필요</Badge>
          )}
          <div className="mt-2 grid grid-cols-3 gap-2">
            {(Object.keys(SENSITIVITY_LABELS) as AnomalySensitivity[]).map((level) => (
              <button
                key={level}
                disabled={!canCustomize}
                onClick={() => updateSettings({ sensitivity: level })}
                className={`rounded-xl border p-3 text-left transition-all ${
                  settings.sensitivity === level
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                } ${!canCustomize ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{SENSITIVITY_LABELS[level].label}</p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{SENSITIVITY_LABELS[level].desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Detection type toggles */}
        <div className="space-y-3">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">감지 유형</span>
          {[
            { key: 'dailyCostDetection' as const, label: '일별 비용 이상', desc: '14일 이동 평균 기반' },
            { key: 'hourlySpikeDetection' as const, label: '시간별 스파이크', desc: '24시간 대비 급증' },
            { key: 'modelAnomalyDetection' as const, label: '모델별 이상 사용', desc: '특정 모델 비용 급증' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between rounded-xl border border-slate-100 dark:border-slate-800 p-3">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{label}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{desc}</p>
              </div>
              <button
                disabled={!canCustomize}
                onClick={() => updateSettings({ [key]: !settings[key] })}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  settings[key] ? 'bg-indigo-500' : 'bg-slate-300'
                } ${!canCustomize ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white dark:bg-slate-900 transition-transform ${
                  settings[key] ? 'translate-x-5' : ''
                }`} />
              </button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
