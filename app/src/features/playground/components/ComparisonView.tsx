'use client'

import type { ComparisonResult } from '@/types/playground'

interface ComparisonViewProps {
  comparison: ComparisonResult
}

export function ComparisonView({ comparison }: ComparisonViewProps) {
  const { left, right, leftModel, rightModel, leftLoading, rightLoading } = comparison

  return (
    <div className="space-y-4">
      {/* Side-by-side responses */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ResponseCard
          model={leftModel}
          result={left}
          loading={leftLoading}
        />
        <ResponseCard
          model={rightModel}
          result={right}
          loading={rightLoading}
        />
      </div>

      {/* Comparison table */}
      {left && right && (
        <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50">
                <th className="px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Metric</th>
                <th className="px-4 py-2.5 text-right font-medium text-slate-600 dark:text-slate-400">{leftModel}</th>
                <th className="px-4 py-2.5 text-right font-medium text-slate-600 dark:text-slate-400">{rightModel}</th>
                <th className="px-4 py-2.5 text-right font-medium text-slate-500 dark:text-slate-400">Delta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              <CompareRow
                label="Input Tokens"
                left={left.inputTokens}
                right={right.inputTokens}
                format="number"
              />
              <CompareRow
                label="Output Tokens"
                left={left.outputTokens}
                right={right.outputTokens}
                format="number"
              />
              <CompareRow
                label="Cost"
                left={left.cost}
                right={right.cost}
                format="cost"
                lowerIsBetter
              />
              <CompareRow
                label="Response Time"
                left={left.responseTimeMs}
                right={right.responseTimeMs}
                format="time"
                lowerIsBetter
              />
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function ResponseCard({
  model,
  result,
  loading,
}: {
  model: string
  result: import('@/types/playground').PlaygroundExecuteResponse | null
  loading: boolean
}) {
  return (
    <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800 shadow-sm">
      <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 px-4 py-2.5">
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{model}</span>
      </div>
      <div className="px-4 py-3">
        {loading ? (
          <div className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
            <span className="text-xs text-slate-400">실행 중...</span>
          </div>
        ) : result ? (
          <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-700 dark:text-slate-300">
            {result.response}
          </pre>
        ) : (
          <p className="text-xs text-slate-300 dark:text-slate-500">대기 중...</p>
        )}
      </div>
      {result && (
        <div className="flex items-center gap-3 border-t border-slate-100 dark:border-slate-800 px-4 py-2 text-[11px] text-slate-400">
          <span>{result.inputTokens + result.outputTokens} tok</span>
          <span className="text-emerald-500">${result.cost.toFixed(4)}</span>
          <span className="text-blue-500">{result.responseTimeMs}ms</span>
        </div>
      )}
    </div>
  )
}

function CompareRow({
  label,
  left,
  right,
  format,
  lowerIsBetter = false,
}: {
  label: string
  left: number
  right: number
  format: 'number' | 'cost' | 'time'
  lowerIsBetter?: boolean
}) {
  const delta = left === 0 ? 0 : ((right - left) / left) * 100
  const leftWins = lowerIsBetter ? left <= right : left >= right

  const fmt = (v: number) => {
    if (format === 'cost') return `$${v.toFixed(4)}`
    if (format === 'time') return `${v.toLocaleString()}ms`
    return v.toLocaleString()
  }

  return (
    <tr>
      <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{label}</td>
      <td className={`px-4 py-2 text-right font-mono ${leftWins ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-600 dark:text-slate-400'}`}>
        {fmt(left)}
      </td>
      <td className={`px-4 py-2 text-right font-mono ${!leftWins ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-600 dark:text-slate-400'}`}>
        {fmt(right)}
      </td>
      <td className={`px-4 py-2 text-right font-mono ${delta > 0 ? (lowerIsBetter ? 'text-red-400' : 'text-emerald-400') : delta < 0 ? (lowerIsBetter ? 'text-emerald-400' : 'text-red-400') : 'text-slate-300 dark:text-slate-500'}`}>
        {delta > 0 ? '+' : ''}{delta.toFixed(1)}%
      </td>
    </tr>
  )
}
