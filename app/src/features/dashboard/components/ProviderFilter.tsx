'use client'

import { cn } from '@/lib/utils'
import { PROVIDER_LABELS, PROVIDER_COLORS } from '@/lib/constants'
import type { ProviderType } from '@/types'

interface ProviderFilterProps {
  providers: ProviderType[]
  selected: ProviderType[]
  onChange: (selected: ProviderType[]) => void
}

export function ProviderFilter({ providers, selected, onChange }: ProviderFilterProps) {
  const allSelected = selected.length === providers.length

  const toggleAll = () => {
    onChange(allSelected ? [providers[0]] : [...providers])
  }

  const toggleProvider = (type: ProviderType) => {
    if (selected.includes(type)) {
      if (selected.length <= 1) return
      onChange(selected.filter((t) => t !== type))
    } else {
      onChange([...selected, type])
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={toggleAll}
        className={cn(
          'rounded-xl border px-3 py-1 text-sm font-medium transition-colors',
          allSelected
            ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 font-semibold'
            : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800',
        )}
      >
        전체
      </button>
      {providers.map((type) => {
        const isActive = selected.includes(type)
        const color = PROVIDER_COLORS[type] ?? '#6B7280'
        const label = PROVIDER_LABELS[type] ?? type
        return (
          <button
            key={type}
            onClick={() => toggleProvider(type)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-xl border px-3 py-1 text-sm font-medium transition-colors',
              isActive
                ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 font-semibold'
                : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800',
            )}
          >
            {isActive && (
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
            )}
            {label}
          </button>
        )
      })}
    </div>
  )
}
