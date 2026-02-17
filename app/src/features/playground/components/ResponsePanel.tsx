'use client'

import { useState } from 'react'
import { Copy, Check, AlertCircle } from 'lucide-react'
import type { PlaygroundExecuteResponse } from '@/types/playground'

interface ResponsePanelProps {
  result: PlaygroundExecuteResponse | null
  error: string | null
  loading: boolean
}

export function ResponsePanel({ result, error, loading }: ResponsePanelProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!result?.response) return
    await navigator.clipboard.writeText(result.response)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <span className="text-sm text-slate-500">AI 응답을 기다리는 중...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          <div>
            <p className="text-sm font-medium text-red-700">실행 오류</p>
            <p className="mt-1 text-sm text-red-600">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
        <p className="text-sm text-slate-400">프롬프트를 실행하면 응답이 여기에 표시됩니다</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm">
      {/* Response Content */}
      <div className="relative px-5 py-4">
        <button
          onClick={handleCopy}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-300 hover:bg-slate-100 hover:text-slate-500 transition-colors"
          title="복사"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
        </button>
        <pre className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700 pr-8">
          {result.response}
        </pre>
      </div>

      {/* Metrics Bar */}
      <div className="flex flex-wrap items-center gap-4 rounded-b-2xl border-t border-slate-100 bg-slate-50/30 px-5 py-3">
        <MetricPill label="Input" value={`${result.inputTokens.toLocaleString()} tokens`} />
        <MetricPill label="Output" value={`${result.outputTokens.toLocaleString()} tokens`} />
        <MetricPill label="Cost" value={`$${result.cost.toFixed(4)}`} color="emerald" />
        <MetricPill label="Time" value={`${result.responseTimeMs.toLocaleString()}ms`} color="blue" />
      </div>
    </div>
  )
}

function MetricPill({ label, value, color = 'slate' }: { label: string; value: string; color?: string }) {
  const colorClasses: Record<string, string> = {
    slate: 'bg-slate-100 text-slate-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium ${colorClasses[color]}`}>
      <span className="text-slate-400">{label}</span>
      {value}
    </span>
  )
}
