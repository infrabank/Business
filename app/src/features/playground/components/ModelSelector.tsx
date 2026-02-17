'use client'

import { PROVIDER_LABELS, PROVIDER_COLORS } from '@/lib/constants'
import type { Provider, ProviderType } from '@/types'
import { createAdapter } from '@/services/providers'

interface ModelSelectorProps {
  providers: Provider[]
  selectedProviderId: string
  selectedModel: string
  onProviderChange: (id: string) => void
  onModelChange: (model: string) => void
  label?: string
}

export function ModelSelector({
  providers,
  selectedProviderId,
  selectedModel,
  onProviderChange,
  onModelChange,
  label,
}: ModelSelectorProps) {
  const activeProviders = providers.filter((p) => p.isActive)
  const selectedProvider = activeProviders.find((p) => p.id === selectedProviderId)
  const providerType = (selectedProvider?.type || 'openai') as ProviderType

  let models: string[] = []
  let pricing = { input: 0, output: 0 }
  try {
    const adapter = createAdapter(providerType)
    models = adapter.getAvailableModels()
    pricing = adapter.getModelPricing(selectedModel || models[0] || '')
  } catch {
    // ignore
  }

  return (
    <div className="space-y-2">
      {label && <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>}
      <div className="flex gap-2">
        <select
          value={selectedProviderId}
          onChange={(e) => onProviderChange(e.target.value)}
          className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950/50"
        >
          {activeProviders.length === 0 && (
            <option value="">프로바이더 없음</option>
          )}
          {activeProviders.map((p) => (
            <option key={p.id} value={p.id}>
              {PROVIDER_LABELS[p.type] || p.name}
            </option>
          ))}
        </select>

        <select
          value={selectedModel}
          onChange={(e) => onModelChange(e.target.value)}
          className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950/50"
        >
          {models.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      {selectedModel && (
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: PROVIDER_COLORS[providerType] || '#6B7280' }}
          />
          <span>Input: ${pricing.input}/1M</span>
          <span>Output: ${pricing.output}/1M</span>
        </div>
      )}
    </div>
  )
}
