'use client'

import { TemplateCard } from './TemplateCard'
import type { PromptTemplate } from '@/types/template'

interface TemplateListProps {
  templates: PromptTemplate[]
  loading: boolean
  onSelect: (template: PromptTemplate) => void
  onEdit: (template: PromptTemplate) => void
  onDelete: (template: PromptTemplate) => void
  onToggleFavorite: (template: PromptTemplate) => void
  currentUserId: string
}

export function TemplateList({
  templates,
  loading,
  onSelect,
  onEdit,
  onDelete,
  onToggleFavorite,
  currentUserId,
}: TemplateListProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="h-48 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800"
          />
        ))}
      </div>
    )
  }

  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 py-16">
        <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">템플릿이 없습니다.</p>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          새 템플릿을 만들어 자주 사용하는 프롬프트를 저장하세요.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {templates.map((template) => (
        <TemplateCard
          key={template.id}
          template={template}
          onSelect={() => onSelect(template)}
          onEdit={() => onEdit(template)}
          onDelete={() => onDelete(template)}
          onToggleFavorite={() => onToggleFavorite(template)}
          isOwner={template.userId === currentUserId}
        />
      ))}
    </div>
  )
}
