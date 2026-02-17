'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { Send, ChevronDown, ChevronUp } from 'lucide-react'
import type { PlaygroundEstimateResponse } from '@/types/playground'

interface PlaygroundEditorProps {
  systemPrompt: string
  userPrompt: string
  onSystemPromptChange: (s: string) => void
  onUserPromptChange: (s: string) => void
  onExecute: () => void
  loading: boolean
  disabled: boolean
  estimate: PlaygroundEstimateResponse | null
}

export function PlaygroundEditor({
  systemPrompt,
  userPrompt,
  onSystemPromptChange,
  onUserPromptChange,
  onExecute,
  loading,
  disabled,
  estimate,
}: PlaygroundEditorProps) {
  const [showSystem, setShowSystem] = useState(!!systemPrompt)

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !loading && !disabled && userPrompt.trim()) {
        e.preventDefault()
        onExecute()
      }
    },
    [onExecute, loading, disabled, userPrompt],
  )

  return (
    <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm" onKeyDown={handleKeyDown}>
      {/* System Prompt Toggle */}
      <button
        type="button"
        onClick={() => setShowSystem(!showSystem)}
        className="flex w-full items-center gap-2 rounded-t-2xl border-b border-slate-100 px-4 py-2.5 text-xs font-medium text-slate-400 hover:text-slate-600 hover:bg-slate-50/50 transition-colors"
      >
        {showSystem ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        System Prompt (optional)
      </button>

      {showSystem && (
        <div className="border-b border-slate-100 px-4 py-3">
          <textarea
            value={systemPrompt}
            onChange={(e) => onSystemPromptChange(e.target.value)}
            placeholder="시스템 프롬프트를 입력하세요..."
            rows={3}
            className="w-full resize-none rounded-lg border-0 bg-slate-50/50 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>
      )}

      {/* User Prompt */}
      <div className="px-4 py-3">
        <textarea
          value={userPrompt}
          onChange={(e) => onUserPromptChange(e.target.value)}
          placeholder="프롬프트를 입력하세요... (Ctrl+Enter로 실행)"
          rows={5}
          className="w-full resize-none rounded-lg border-0 bg-transparent px-1 py-1 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none"
        />
      </div>

      {/* Bottom Bar */}
      <div className="flex items-center justify-between rounded-b-2xl border-t border-slate-100 bg-slate-50/30 px-4 py-2.5">
        <div className="text-xs text-slate-400">
          {estimate && userPrompt.trim() ? (
            <span>
              ~{estimate.estimatedInputTokens.toLocaleString()} tokens | ~${estimate.estimatedCost.toFixed(4)}
            </span>
          ) : (
            <span>프롬프트를 입력하면 토큰이 추정됩니다</span>
          )}
        </div>

        <Button
          onClick={onExecute}
          disabled={loading || disabled || !userPrompt.trim()}
          className="gap-2"
        >
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              실행 중...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              실행
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
