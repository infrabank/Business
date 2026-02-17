'use client'

import { Star, Lock, Globe, Pencil, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { CATEGORY_LABELS } from '@/types/template'
import type { PromptTemplate } from '@/types/template'

interface TemplateCardProps {
  template: PromptTemplate
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
  onToggleFavorite: () => void
  isOwner: boolean
}

export function TemplateCard({
  template,
  onSelect,
  onEdit,
  onDelete,
  onToggleFavorite,
  isOwner,
}: TemplateCardProps) {
  const variables = Array.isArray(template.variables)
    ? template.variables
    : JSON.parse(String(template.variables || '[]'))

  return (
    <div
      onClick={onSelect}
      className="group cursor-pointer rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900 p-4 shadow-sm transition-all hover:shadow-md"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
          {template.name}
        </h3>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleFavorite()
          }}
          className="shrink-0 text-slate-300 dark:text-slate-500 transition-colors hover:text-amber-400"
        >
          <Star
            className={`h-4 w-4 ${template.isFavorite ? 'fill-amber-400 text-amber-400' : ''}`}
          />
        </button>
      </div>

      {/* Description */}
      {template.description && (
        <p className="mt-1.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
          {template.description}
        </p>
      )}

      {/* Category */}
      <div className="mt-3 flex items-center gap-2">
        <Badge variant="default">
          {CATEGORY_LABELS[template.category] || template.category}
        </Badge>
      </div>

      {/* Variables */}
      {variables.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1">
          {variables.slice(0, 3).map((v: { name: string }) => (
            <span
              key={v.name}
              className="rounded-full bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 text-xs text-indigo-600"
            >
              {`{{${v.name}}}`}
            </span>
          ))}
          {variables.length > 3 && (
            <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
              +{variables.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
        <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
          {template.visibility === 'shared' ? (
            <span className="flex items-center gap-1">
              <Globe className="h-3 w-3" /> 공유
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <Lock className="h-3 w-3" /> 개인
            </span>
          )}
          <span>사용 {template.usageCount || 0}회</span>
        </div>

        {isOwner && (
          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
              className="rounded-lg p-1.5 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:bg-slate-800 hover:text-slate-600 dark:text-slate-400 dark:text-slate-500"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              className="rounded-lg p-1.5 text-slate-400 dark:text-slate-500 hover:bg-rose-50 dark:bg-rose-950/50 hover:text-rose-500"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
