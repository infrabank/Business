'use client'

import { useState } from 'react'
import { useSession } from '@/hooks/useSession'
import { useTemplates } from '@/features/templates/hooks/useTemplates'
import { TemplateList } from '@/features/templates/components/TemplateList'
import { TemplateEditor } from '@/features/templates/components/TemplateEditor'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { DEFAULT_CATEGORIES } from '@/types/template'
import { useAppStore } from '@/lib/store'
import { Plus, BookTemplate, AlertTriangle, Search } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { PromptTemplate, CreateTemplateRequest, UpdateTemplateRequest, TemplateSortOption } from '@/types/template'

export default function TemplatesPage() {
  const { isReady } = useSession()

  if (!isReady) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">프롬프트 템플릿</h1>
          <p className="text-gray-500">자주 사용하는 프롬프트를 저장하고 관리하세요</p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
      </div>
    )
  }

  return <TemplatesContent />
}

function TemplatesContent() {
  const router = useRouter()
  const tmpl = useTemplates()
  const currentUser = useAppStore((s) => s.currentUser)
  const [deleteTarget, setDeleteTarget] = useState<PromptTemplate | null>(null)

  const handleSelect = (template: PromptTemplate) => {
    // Navigate to playground with template
    router.push(`/playground?templateId=${template.id}`)
  }

  const handleSave = async (data: CreateTemplateRequest | UpdateTemplateRequest) => {
    if (tmpl.editingTemplate) {
      await tmpl.updateTemplate(tmpl.editingTemplate.id, data as UpdateTemplateRequest)
    } else {
      await tmpl.createTemplate(data as CreateTemplateRequest)
    }
  }

  const handleDelete = async () => {
    if (deleteTarget) {
      await tmpl.deleteTemplate(deleteTarget.id)
      setDeleteTarget(null)
    }
  }

  const sortOptions: { value: TemplateSortOption; label: string }[] = [
    { value: 'recent', label: '최근 수정순' },
    { value: 'name', label: '이름순' },
    { value: 'created', label: '생성순' },
    { value: 'usage', label: '사용 빈도순' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <BookTemplate className="h-6 w-6 text-indigo-500" />
            프롬프트 템플릿
          </h1>
          <p className="text-gray-500">
            자주 사용하는 프롬프트를 저장하고 관리하세요
          </p>
        </div>
        <Button
          onClick={() => tmpl.openEditor()}
          disabled={tmpl.limitReached}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          새 템플릿
        </Button>
      </div>

      {/* Limit Warning */}
      {tmpl.limitReached && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-950/50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
            <div>
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                Free 플랜은 최대 {tmpl.templateLimit}개의 템플릿을 사용할 수 있습니다
              </p>
              <Link
                href="/pricing"
                className="mt-1 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-800"
              >
                Growth 플랜으로 업그레이드 →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900 p-4 shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <Input
            value={tmpl.search}
            onChange={(e) => tmpl.setSearch(e.target.value)}
            placeholder="템플릿 검색..."
            className="pl-9"
          />
        </div>
        <select
          value={tmpl.category}
          onChange={(e) => tmpl.setCategory(e.target.value)}
          className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 dark:text-slate-500 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="">전체 카테고리</option>
          {DEFAULT_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <select
          value={tmpl.sort}
          onChange={(e) => tmpl.setSort(e.target.value as TemplateSortOption)}
          className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 dark:text-slate-500 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          {sortOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span className="text-xs text-slate-400 dark:text-slate-500">총 {tmpl.total}개</span>
      </div>

      {/* Template Grid */}
      <TemplateList
        templates={tmpl.templates}
        loading={tmpl.loading}
        onSelect={handleSelect}
        onEdit={(t) => tmpl.openEditor(t)}
        onDelete={(t) => setDeleteTarget(t)}
        onToggleFavorite={(t) => tmpl.toggleFavorite(t)}
        currentUserId={currentUser?.id || ''}
      />

      {/* Template Editor Modal */}
      {tmpl.editorOpen && (
        <TemplateEditor
          template={tmpl.editingTemplate || undefined}
          onSave={handleSave}
          onCancel={tmpl.closeEditor}
          saving={tmpl.saving}
        />
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">템플릿 삭제</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
              &quot;{deleteTarget.name}&quot; 템플릿을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setDeleteTarget(null)}
              >
                취소
              </Button>
              <Button
                onClick={handleDelete}
                className="bg-rose-600 hover:bg-rose-700"
              >
                삭제
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
