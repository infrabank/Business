'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Star, Clock, List } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { VariableForm } from './VariableForm'
import { CATEGORY_LABELS } from '@/types/template'
import type { PromptTemplate, VariableValues, TemplateVariable } from '@/types/template'
import Link from 'next/link'

interface TemplateSidebarProps {
  onSelectTemplate: (template: PromptTemplate, values: VariableValues) => void
  isOpen: boolean
  onToggle: () => void
}

type SidebarTab = 'favorites' | 'recent' | 'all'

export function TemplateSidebar({
  onSelectTemplate,
  isOpen,
  onToggle,
}: TemplateSidebarProps) {
  const [tab, setTab] = useState<SidebarTab>('favorites')
  const [templates, setTemplates] = useState<PromptTemplate[]>([])
  const [loading, setLoading] = useState(false)

  // Variable form state per template
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null)
  const [variableValues, setVariableValues] = useState<VariableValues>({})

  const loadTemplates = useCallback(async () => {
    setLoading(true)
    try {
      const sortParam = tab === 'recent' ? 'usage' : tab === 'favorites' ? 'recent' : 'recent'
      const res = await fetch(`/api/templates?sort=${sortParam}&limit=20`)
      if (res.ok) {
        const data = await res.json()
        let items: PromptTemplate[] = data.data || []
        if (tab === 'favorites') {
          items = items.filter((t) => t.isFavorite)
        }
        setTemplates(items)
      }
    } catch {
      /* ignore */
    }
    setLoading(false)
  }, [tab])

  useEffect(() => {
    if (isOpen) loadTemplates()
  }, [isOpen, loadTemplates])

  const handleTemplateClick = (template: PromptTemplate) => {
    const vars = parseVariables(template.variables)
    if (vars.length > 0) {
      if (activeTemplateId === template.id) {
        setActiveTemplateId(null)
        setVariableValues({})
      } else {
        setActiveTemplateId(template.id)
        // Pre-fill with defaults
        const defaults: VariableValues = {}
        vars.forEach((v) => {
          if (v.defaultValue) defaults[v.name] = v.defaultValue
        })
        setVariableValues(defaults)
      }
    } else {
      onSelectTemplate(template, {})
    }
  }

  const handleExecute = (template: PromptTemplate) => {
    onSelectTemplate(template, variableValues)
    setActiveTemplateId(null)
    setVariableValues({})
  }

  const tabs: { key: SidebarTab; label: string; icon: React.ElementType }[] = [
    { key: 'favorites', label: '즐겨찾기', icon: Star },
    { key: 'recent', label: '최근', icon: Clock },
    { key: 'all', label: '전체', icon: List },
  ]

  return (
    <div
      className={`fixed bottom-0 right-0 top-16 z-30 w-80 border-l border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800 shadow-xl transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-4 py-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">템플릿</h3>
        <button
          onClick={onToggle}
          className="rounded-lg p-1 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:bg-slate-800 hover:text-slate-600 dark:text-slate-400 dark:text-slate-500"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 dark:border-slate-800 px-2">
        {tabs.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex flex-1 items-center justify-center gap-1 py-2.5 text-xs font-medium transition-colors ${
                tab === t.key
                  ? 'border-b-2 border-indigo-500 text-indigo-700 dark:text-indigo-400'
                  : 'text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:text-slate-500'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* List */}
      <div className="overflow-y-auto" style={{ height: 'calc(100% - 130px)' }}>
        {loading ? (
          <div className="space-y-2 p-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
            ))}
          </div>
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
              {tab === 'favorites'
                ? '즐겨찾기한 템플릿이 없습니다'
                : '템플릿이 없습니다'}
            </p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {templates.map((template) => {
              const vars = parseVariables(template.variables)
              const isActive = activeTemplateId === template.id

              return (
                <div key={template.id}>
                  <button
                    onClick={() => handleTemplateClick(template)}
                    className={`w-full rounded-xl p-3 text-left transition-colors ${
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-950/50 ring-1 ring-indigo-200'
                        : 'hover:bg-slate-50 dark:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <span className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                        {template.name}
                      </span>
                      <Badge variant="default" className="ml-2 shrink-0 text-[10px]">
                        {CATEGORY_LABELS[template.category] || template.category}
                      </Badge>
                    </div>
                    {vars.length > 0 && (
                      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                        변수 {vars.length}개
                      </p>
                    )}
                  </button>

                  {/* Inline variable form */}
                  {isActive && vars.length > 0 && (
                    <div className="mx-2 mb-2 rounded-xl border border-indigo-100 bg-indigo-50 dark:bg-indigo-950/50/50 p-3">
                      <VariableForm
                        variables={vars}
                        values={variableValues}
                        onChange={setVariableValues}
                        userPrompt={template.userPrompt}
                        systemPrompt={template.systemPrompt}
                        compact
                      />
                      <button
                        onClick={() => handleExecute(template)}
                        className="mt-2 w-full rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition-colors"
                      >
                        실행
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 px-4 py-3">
        <Link
          href="/templates"
          className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
        >
          모든 템플릿 보기 →
        </Link>
      </div>
    </div>
  )
}

function parseVariables(variables: TemplateVariable[] | string): TemplateVariable[] {
  if (Array.isArray(variables)) return variables
  try {
    return JSON.parse(String(variables || '[]'))
  } catch {
    return []
  }
}
