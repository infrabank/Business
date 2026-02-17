'use client'

import { useState, useEffect, useMemo } from 'react'
import { X, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { detectVariables } from '../utils/variables'
import { DEFAULT_CATEGORIES } from '@/types/template'
import type {
  PromptTemplate,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  TemplateVariable,
  TemplateVisibility,
} from '@/types/template'

interface TemplateEditorProps {
  template?: PromptTemplate
  onSave: (data: CreateTemplateRequest | UpdateTemplateRequest) => Promise<void>
  onCancel: () => void
  saving: boolean
  prefill?: Partial<CreateTemplateRequest>
}

export function TemplateEditor({
  template,
  onSave,
  onCancel,
  saving,
  prefill,
}: TemplateEditorProps) {
  const isEdit = !!template

  const [name, setName] = useState(template?.name || '')
  const [description, setDescription] = useState(template?.description || '')
  const [category, setCategory] = useState(template?.category || 'other')
  const [systemPrompt, setSystemPrompt] = useState(
    template?.systemPrompt || prefill?.systemPrompt || '',
  )
  const [userPrompt, setUserPrompt] = useState(
    template?.userPrompt || prefill?.userPrompt || '',
  )
  const [visibility, setVisibility] = useState<TemplateVisibility>(
    template?.visibility || 'private',
  )
  const [showSystem, setShowSystem] = useState(!!systemPrompt)
  const [showParams, setShowParams] = useState(false)
  const [defaultTemperature, setDefaultTemperature] = useState<number | undefined>(
    template?.defaultTemperature ?? prefill?.defaultTemperature ?? undefined,
  )
  const [defaultMaxTokens, setDefaultMaxTokens] = useState<number | undefined>(
    template?.defaultMaxTokens ?? prefill?.defaultMaxTokens ?? undefined,
  )

  // Variable detection
  const detectedVars = useMemo(
    () => detectVariables(systemPrompt || undefined, userPrompt),
    [systemPrompt, userPrompt],
  )

  // Merge with existing defaults
  const [varDefaults, setVarDefaults] = useState<Record<string, string>>({})

  useEffect(() => {
    if (template?.variables) {
      const existing = Array.isArray(template.variables)
        ? template.variables
        : JSON.parse(String(template.variables || '[]'))
      const defaults: Record<string, string> = {}
      existing.forEach((v: TemplateVariable) => {
        if (v.defaultValue) defaults[v.name] = v.defaultValue
      })
      setVarDefaults(defaults)
    }
  }, [template])

  const canSave = name.trim() && userPrompt.trim()

  const handleSave = async () => {
    const variables = detectedVars.map((v) => ({
      ...v,
      defaultValue: varDefaults[v.name] || undefined,
    }))

    const data: CreateTemplateRequest = {
      name: name.trim(),
      description: description.trim() || undefined,
      category,
      systemPrompt: systemPrompt.trim() || undefined,
      userPrompt: userPrompt.trim(),
      variables,
      visibility,
      defaultTemperature: defaultTemperature ?? undefined,
      defaultMaxTokens: defaultMaxTokens ?? undefined,
    }

    await onSave(data)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {isEdit ? '템플릿 수정' : '새 템플릿 만들기'}
          </h2>
          <button
            onClick={onCancel}
            className="rounded-lg p-1.5 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:bg-slate-800 hover:text-slate-600 dark:text-slate-400 dark:text-slate-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          {/* Name */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300 dark:text-slate-500">
              템플릿 이름 <span className="text-rose-500">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="템플릿 이름"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300 dark:text-slate-500">
              설명
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="템플릿 설명 (선택사항)"
              rows={2}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:text-slate-500 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Category */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300 dark:text-slate-500">
              카테고리
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {DEFAULT_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* System Prompt */}
          <div>
            <button
              type="button"
              onClick={() => setShowSystem(!showSystem)}
              className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 dark:text-slate-500"
            >
              시스템 프롬프트
              {showSystem ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            {showSystem && (
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="시스템 프롬프트 (선택사항)"
                rows={4}
                className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:text-slate-500 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            )}
          </div>

          {/* User Prompt */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300 dark:text-slate-500">
              유저 프롬프트 <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              placeholder={'유저 프롬프트 — {{변수명}} 형식으로 변수를 사용할 수 있습니다'}
              rows={6}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:text-slate-500 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Detected Variables */}
          {detectedVars.length > 0 && (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50 dark:bg-indigo-950/50/50 p-3">
              <p className="mb-2 text-xs font-medium text-indigo-700 dark:text-indigo-400">
                감지된 변수 ({detectedVars.length}개)
              </p>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {detectedVars.map((v) => (
                  <div key={v.name} className="flex items-center gap-2">
                    <span className="shrink-0 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-400">
                      {`{{${v.name}}}`}
                    </span>
                    <input
                      type="text"
                      value={varDefaults[v.name] || ''}
                      onChange={(e) =>
                        setVarDefaults((prev) => ({
                          ...prev,
                          [v.name]: e.target.value,
                        }))
                      }
                      placeholder="기본값"
                      className="flex-1 rounded-lg border border-indigo-200 bg-white dark:bg-slate-900 px-2 py-1 text-xs text-slate-700 dark:text-slate-300 dark:text-slate-500 placeholder:text-slate-400 dark:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Visibility */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300 dark:text-slate-500">
              공개 범위
            </label>
            <div className="flex gap-3">
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm has-[:checked]:border-indigo-300 has-[:checked]:bg-indigo-50 dark:bg-indigo-950/50">
                <input
                  type="radio"
                  name="visibility"
                  value="private"
                  checked={visibility === 'private'}
                  onChange={() => setVisibility('private')}
                  className="accent-indigo-600"
                />
                개인 (나만 사용)
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm has-[:checked]:border-indigo-300 has-[:checked]:bg-indigo-50 dark:bg-indigo-950/50">
                <input
                  type="radio"
                  name="visibility"
                  value="shared"
                  checked={visibility === 'shared'}
                  onChange={() => setVisibility('shared')}
                  className="accent-indigo-600"
                />
                공유 (조직 전체)
              </label>
            </div>
          </div>

          {/* Default Parameters */}
          <div>
            <button
              type="button"
              onClick={() => setShowParams(!showParams)}
              className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 dark:text-slate-500"
            >
              기본 파라미터
              {showParams ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            {showParams && (
              <div className="mt-2 grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
                    Temperature ({defaultTemperature ?? '-'})
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={defaultTemperature ?? 1}
                    onChange={(e) =>
                      setDefaultTemperature(Number(e.target.value))
                    }
                    className="w-full accent-indigo-600"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
                    Max Tokens
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="4096"
                    value={defaultMaxTokens ?? ''}
                    onChange={(e) =>
                      setDefaultMaxTokens(
                        e.target.value ? Number(e.target.value) : undefined,
                      )
                    }
                    placeholder="1024"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800 px-6 py-4">
          <Button variant="secondary" onClick={onCancel} disabled={saving}>
            취소
          </Button>
          <Button onClick={handleSave} disabled={!canSave || saving}>
            {saving ? '저장 중...' : isEdit ? '수정' : '만들기'}
          </Button>
        </div>
      </div>
    </div>
  )
}
