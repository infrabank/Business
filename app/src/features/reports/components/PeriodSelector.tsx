'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import type { ReportPeriodPreset } from '@/types/report'

interface PeriodSelectorProps {
  onPeriodChange: (from: string, to: string) => void
  isGrowth: boolean
}

const PRESETS: { key: ReportPeriodPreset; label: string; growthOnly: boolean }[] = [
  { key: 'this-month', label: '이번 달', growthOnly: false },
  { key: 'last-month', label: '지난 달', growthOnly: true },
  { key: '7d', label: '7일', growthOnly: false },
  { key: '30d', label: '30일', growthOnly: true },
  { key: '90d', label: '90일', growthOnly: true },
  { key: 'custom', label: '커스텀', growthOnly: true },
]

function getPresetRange(preset: ReportPeriodPreset): { from: string; to: string } {
  const now = new Date()
  const to = now.toISOString().split('T')[0]

  switch (preset) {
    case 'this-month': {
      const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
      return { from, to }
    }
    case 'last-month': {
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0).getDate()
      const from = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-01`
      const toDate = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
      return { from, to: toDate }
    }
    case '7d': {
      const d = new Date(now)
      d.setDate(d.getDate() - 6)
      return { from: d.toISOString().split('T')[0], to }
    }
    case '30d': {
      const d = new Date(now)
      d.setDate(d.getDate() - 29)
      return { from: d.toISOString().split('T')[0], to }
    }
    case '90d': {
      const d = new Date(now)
      d.setDate(d.getDate() - 89)
      return { from: d.toISOString().split('T')[0], to }
    }
    default:
      return { from: to, to }
  }
}

export function PeriodSelector({ onPeriodChange, isGrowth }: PeriodSelectorProps) {
  const [active, setActive] = useState<ReportPeriodPreset>('this-month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  const handlePreset = (preset: ReportPeriodPreset) => {
    if (preset === 'custom') {
      setActive('custom')
      return
    }
    setActive(preset)
    const range = getPresetRange(preset)
    onPeriodChange(range.from, range.to)
  }

  const handleCustomApply = () => {
    if (customFrom && customTo) {
      onPeriodChange(customFrom, customTo)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => {
          const disabled = p.growthOnly && !isGrowth
          return (
            <Button
              key={p.key}
              variant={active === p.key ? 'primary' : 'outline'}
              size="sm"
              disabled={disabled}
              onClick={() => handlePreset(p.key)}
            >
              {p.label}
              {disabled && <Badge variant="info" className="ml-1 text-[10px]">Growth</Badge>}
            </Button>
          )
        })}
      </div>

      {active === 'custom' && isGrowth && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-gray-900 dark:text-slate-100"
          />
          <span className="text-gray-400 dark:text-slate-500">~</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-gray-900 dark:text-slate-100"
          />
          <Button size="sm" onClick={handleCustomApply} disabled={!customFrom || !customTo}>
            적용
          </Button>
        </div>
      )}
    </div>
  )
}
