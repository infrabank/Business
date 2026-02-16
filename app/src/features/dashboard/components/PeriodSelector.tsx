'use client'

import { cn } from '@/lib/utils'
import type { DashboardPeriod } from '@/types/dashboard'

interface PeriodSelectorProps {
  value: DashboardPeriod
  onChange: (period: DashboardPeriod) => void
}

const PERIODS: { value: DashboardPeriod; label: string }[] = [
  { value: '7d', label: '7일' },
  { value: '30d', label: '30일' },
  { value: '90d', label: '90일' },
]

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <div className="flex items-center gap-1 rounded-xl bg-slate-100/80 p-1">
      {PERIODS.map((p) => (
        <button
          key={p.value}
          onClick={() => onChange(p.value)}
          className={cn(
            'rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200',
            value === p.value
              ? 'bg-white text-indigo-700 shadow-sm font-semibold'
              : 'text-slate-500 hover:text-slate-700',
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}
