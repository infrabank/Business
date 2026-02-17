'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import type { RoutingRule } from '@/types/proxy'

interface Props {
  routingMode: 'auto' | 'manual' | 'off'
  rules: RoutingRule[]
  onChange: (mode: 'auto' | 'manual' | 'off', rules: RoutingRule[]) => void
}

const MODEL_OPTIONS = [
  'gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo',
  'o1', 'o3-mini',
  'claude-opus-4-6', 'claude-sonnet-4-5', 'claude-haiku-4-5',
  'gemini-2.0-pro', 'gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash',
]

const CONDITION_LABELS: Record<RoutingRule['condition'], string> = {
  'always': '항상',
  'simple-only': '간단한 요청만',
  'short-only': '짧은 요청만',
}

export function RoutingRulesEditor({ routingMode, rules, onChange }: Props) {
  const [newFrom, setNewFrom] = useState(MODEL_OPTIONS[0])
  const [newTo, setNewTo] = useState(MODEL_OPTIONS[1])
  const [newCondition, setNewCondition] = useState<RoutingRule['condition']>('simple-only')

  const addRule = () => {
    if (newFrom === newTo) return
    if (rules.some((r) => r.fromModel === newFrom)) return
    onChange(routingMode, [...rules, { fromModel: newFrom, toModel: newTo, condition: newCondition }])
  }

  const removeRule = (idx: number) => {
    onChange(routingMode, rules.filter((_, i) => i !== idx))
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-4">
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">라우팅 모드</p>
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
          {(['auto', 'manual', 'off'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onChange(mode, rules)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                routingMode === mode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {mode === 'auto' ? '자동' : mode === 'manual' ? '수동' : '끄기'}
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-gray-500">
          {routingMode === 'auto' && '의도 분석 기반으로 자동 라우팅합니다.'}
          {routingMode === 'manual' && '직접 설정한 규칙에 따라 라우팅합니다.'}
          {routingMode === 'off' && '모델 라우팅을 사용하지 않습니다.'}
        </p>
      </div>

      {routingMode === 'manual' && (
        <div className="space-y-3">
          {rules.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase text-gray-500">
                    <th className="px-2 py-2">From</th>
                    <th className="px-2 py-2">To</th>
                    <th className="px-2 py-2">조건</th>
                    <th className="px-2 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rules.map((rule, idx) => (
                    <tr key={idx}>
                      <td className="px-2 py-2 font-mono text-xs">{rule.fromModel}</td>
                      <td className="px-2 py-2 font-mono text-xs">{rule.toModel}</td>
                      <td className="px-2 py-2 text-xs">{CONDITION_LABELS[rule.condition]}</td>
                      <td className="px-2 py-2">
                        <button
                          type="button"
                          onClick={() => removeRule(idx)}
                          className="text-red-500 hover:text-red-700 text-xs"
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">From</label>
              <select
                value={newFrom}
                onChange={(e) => setNewFrom(e.target.value)}
                className="block w-36 rounded border border-gray-300 px-2 py-1 text-xs"
              >
                {MODEL_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">To</label>
              <select
                value={newTo}
                onChange={(e) => setNewTo(e.target.value)}
                className="block w-36 rounded border border-gray-300 px-2 py-1 text-xs"
              >
                {MODEL_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">조건</label>
              <select
                value={newCondition}
                onChange={(e) => setNewCondition(e.target.value as RoutingRule['condition'])}
                className="block w-32 rounded border border-gray-300 px-2 py-1 text-xs"
              >
                {Object.entries(CONDITION_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={addRule}>
              + 추가
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
