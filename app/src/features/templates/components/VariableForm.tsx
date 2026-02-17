'use client'

import { substituteVariables } from '../utils/variables'
import type { TemplateVariable, VariableValues } from '@/types/template'

interface VariableFormProps {
  variables: TemplateVariable[]
  values: VariableValues
  onChange: (values: VariableValues) => void
  userPrompt: string
  systemPrompt?: string
  compact?: boolean
}

export function VariableForm({
  variables,
  values,
  onChange,
  userPrompt,
  systemPrompt,
  compact = false,
}: VariableFormProps) {
  if (variables.length === 0) return null

  const preview = substituteVariables(userPrompt, values)

  return (
    <div className={compact ? 'space-y-2' : 'space-y-4'}>
      <div className={compact ? 'space-y-1.5' : 'grid grid-cols-1 gap-3 md:grid-cols-2'}>
        {variables.map((v) => (
          <div key={v.name}>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              {`{{${v.name}}}`}
            </label>
            <input
              type="text"
              value={values[v.name] || ''}
              onChange={(e) =>
                onChange({ ...values, [v.name]: e.target.value })
              }
              placeholder={v.defaultValue || '값을 입력하세요'}
              className={`w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${
                compact ? 'py-1.5 text-xs' : 'py-2'
              }`}
            />
          </div>
        ))}
      </div>

      {/* Preview */}
      {!compact && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-slate-600">
            최종 프롬프트 미리보기
          </p>
          <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
            {systemPrompt
              ? `[System]\n${substituteVariables(systemPrompt, values)}\n\n[User]\n${preview}`
              : preview}
          </pre>
        </div>
      )}
    </div>
  )
}
