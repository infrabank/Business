'use client'

import { Check } from 'lucide-react'
import type { ProviderType } from '@/types'

interface ProviderStepProps {
  selectedProvider: ProviderType | null
  onSelect: (type: ProviderType) => void
}

const PROVIDERS: { type: ProviderType; name: string; desc: string; color: string }[] = [
  { type: 'openai', name: 'OpenAI', desc: 'GPT-4o, GPT-4, GPT-3.5 Turbo', color: '#10A37F' },
  { type: 'anthropic', name: 'Anthropic', desc: 'Claude 4, Claude 3.5, Claude 3', color: '#D4A574' },
  { type: 'google', name: 'Google AI', desc: 'Gemini Pro, Gemini Flash', color: '#4285F4' },
]

export function ProviderStep({ selectedProvider, onSelect }: ProviderStepProps) {
  return (
    <div>
      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">사용 중인 LLM 프로바이더를 선택하세요</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">가장 많이 사용하는 프로바이더 하나를 선택하세요</p>

      <div className="mt-6 space-y-3">
        {PROVIDERS.map((p) => (
          <button
            key={p.type}
            onClick={() => onSelect(p.type)}
            className={[
              'flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition-all',
              selectedProvider === p.type
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/50 shadow-sm'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:bg-slate-800/50',
            ].join(' ')}
          >
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${p.color}15` }}
            >
              <div className="h-5 w-5 rounded-full" style={{ backgroundColor: p.color }} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">{p.name}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">{p.desc}</p>
            </div>
            {selectedProvider === p.type && (
              <Check className="h-5 w-5 text-blue-600" />
            )}
          </button>
        ))}
      </div>

      <p className="mt-4 text-center text-xs text-slate-400 dark:text-slate-500">
        여러 프로바이더를 나중에 추가할 수 있습니다
      </p>
    </div>
  )
}
