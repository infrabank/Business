'use client'

import { useSession } from '@/hooks/useSession'
import { usePlayground } from '@/features/playground/hooks/usePlayground'
import { ModelSelector } from '@/features/playground/components/ModelSelector'
import { ParameterControls } from '@/features/playground/components/ParameterControls'
import { PlaygroundEditor } from '@/features/playground/components/PlaygroundEditor'
import { ResponsePanel } from '@/features/playground/components/ResponsePanel'
import { ComparisonView } from '@/features/playground/components/ComparisonView'
import { ExecutionHistory } from '@/features/playground/components/ExecutionHistory'
import { TemplateSidebar } from '@/features/templates/components/TemplateSidebar'
import { TemplateEditor } from '@/features/templates/components/TemplateEditor'
import { Terminal, GitCompare, AlertTriangle, BookTemplate } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import type { CreateTemplateRequest } from '@/types/template'

export default function PlaygroundPage() {
  const { isReady } = useSession()

  if (!isReady) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">API Playground</h1>
          <p className="text-gray-500 dark:text-slate-400">프로바이더 API를 테스트하고 비교하세요</p>
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl bg-gray-100 dark:bg-slate-800" />
          ))}
        </div>
      </div>
    )
  }

  return <PlaygroundContent />
}

function PlaygroundContent() {
  const pg = usePlayground()
  const [saveAsTemplate, setSaveAsTemplate] = useState(false)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <Terminal className="h-6 w-6 text-indigo-500" />
            API Playground
          </h1>
          <p className="text-gray-500 dark:text-slate-400">프로바이더 API를 테스트하고 비교하세요</p>
        </div>

        <div className="flex items-center gap-2">
        {/* Template Toggle */}
        <button
          onClick={() => pg.setSidebarOpen(!pg.sidebarOpen)}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
            pg.sidebarOpen
              ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-800/50'
          }`}
        >
          <BookTemplate className="h-3.5 w-3.5" />
          템플릿
        </button>

        {/* Mode Toggle */}
        <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1">
          <button
            onClick={() => pg.setMode('single')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              pg.mode === 'single'
                ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300'
            }`}
          >
            <Terminal className="h-3.5 w-3.5" />
            Single
          </button>
          <button
            onClick={() => pg.setMode('compare')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              pg.mode === 'compare'
                ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300'
            }`}
          >
            <GitCompare className="h-3.5 w-3.5" />
            Compare
          </button>
        </div>
        </div>
      </div>

      {/* No providers warning */}
      {pg.providers.length === 0 && (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500 dark:text-amber-400" />
            <div>
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">프로바이더가 없습니다</p>
              <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
                플레이그라운드를 사용하려면 먼저 프로바이더를 등록하세요.
              </p>
              <Link href="/providers" className="mt-2 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-800">
                프로바이더 설정 →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Limit Warning */}
      {pg.limitReached && (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500 dark:text-amber-400" />
            <div>
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                오늘의 실행 한도({pg.dailyLimit}회)에 도달했습니다
              </p>
              <Link href="/pricing" className="mt-1 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-800">
                Growth 플랜으로 업그레이드 →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Model Selection + Parameters */}
      {pg.providers.length > 0 && (
        <div className="flex flex-wrap items-end gap-6 rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <div className={pg.mode === 'compare' ? 'grid grid-cols-1 gap-4 md:grid-cols-2 flex-1' : 'flex-1'}>
            <ModelSelector
              providers={pg.providers}
              selectedProviderId={pg.providerId}
              selectedModel={pg.model}
              onProviderChange={pg.setProvider}
              onModelChange={pg.setModel}
              label={pg.mode === 'compare' ? 'Model A' : undefined}
            />
            {pg.mode === 'compare' && (
              <ModelSelector
                providers={pg.providers}
                selectedProviderId={pg.compareProviderId}
                selectedModel={pg.compareModel}
                onProviderChange={pg.setCompareProvider}
                onModelChange={pg.setCompareModel}
                label="Model B"
              />
            )}
          </div>
          <ParameterControls
            temperature={pg.temperature}
            maxTokens={pg.maxTokens}
            onTemperatureChange={pg.setTemperature}
            onMaxTokensChange={pg.setMaxTokens}
          />
          {pg.dailyLimit !== -1 && (
            <span className="text-xs text-slate-400">
              {pg.todayCount}/{pg.dailyLimit} 사용
            </span>
          )}
        </div>
      )}

      {/* Editor + Save as Template */}
      {pg.providers.length > 0 && pg.userPrompt.trim() && (
        <div className="flex justify-end">
          <button
            onClick={() => setSaveAsTemplate(true)}
            className="text-xs text-slate-500 dark:text-slate-400 hover:text-indigo-600 transition-colors"
          >
            템플릿으로 저장
          </button>
        </div>
      )}
      {pg.providers.length > 0 && (
        <PlaygroundEditor
          systemPrompt={pg.systemPrompt}
          userPrompt={pg.userPrompt}
          onSystemPromptChange={pg.setSystemPrompt}
          onUserPromptChange={pg.setUserPrompt}
          onExecute={pg.execute}
          loading={pg.loading}
          disabled={pg.limitReached || pg.providers.length === 0}
          estimate={pg.estimate}
        />
      )}

      {/* Response */}
      {pg.mode === 'single' ? (
        <ResponsePanel
          result={pg.result}
          error={pg.error}
          loading={pg.loading}
        />
      ) : pg.comparison ? (
        <ComparisonView comparison={pg.comparison} />
      ) : null}

      {/* History */}
      <ExecutionHistory
        history={pg.history}
        onSelect={pg.selectHistory}
        onLoadMore={pg.loadMoreHistory}
        hasMore={pg.hasMoreHistory}
        loading={pg.historyLoading}
      />

      {/* Template Sidebar */}
      <TemplateSidebar
        isOpen={pg.sidebarOpen}
        onToggle={() => pg.setSidebarOpen(!pg.sidebarOpen)}
        onSelectTemplate={pg.loadTemplate}
      />

      {/* Save as Template Modal */}
      {saveAsTemplate && (
        <TemplateEditor
          onSave={async (data) => {
            await fetch('/api/templates', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data),
            })
            setSaveAsTemplate(false)
          }}
          onCancel={() => setSaveAsTemplate(false)}
          saving={false}
          prefill={pg.getTemplateData() as Partial<CreateTemplateRequest>}
        />
      )}
    </div>
  )
}
