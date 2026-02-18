'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Plus, FolderOpen, MoreVertical, Pencil, Trash2, Check, X, DollarSign } from 'lucide-react'
import { useProjects } from '@/features/projects/hooks/useProjects'
import { ProjectForm } from '@/features/projects/components/ProjectForm'
import { useAppStore } from '@/lib/store'
import { useSession } from '@/hooks/useSession'
import { toast } from '@/components/ui/Toast'
import { formatCurrency } from '@/lib/utils'
import type { Project } from '@/types'

function ProjectMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
        className="rounded p-1 text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-600 dark:hover:text-slate-300"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-10 w-40 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-1 shadow-lg">
          <button onClick={(e) => { e.stopPropagation(); onEdit(); setOpen(false) }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800">
            <Pencil className="h-4 w-4" /> 수정
          </button>
          <hr className="my-1 border-gray-100 dark:border-slate-800" />
          <button onClick={(e) => { e.stopPropagation(); onDelete(); setOpen(false) }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
            <Trash2 className="h-4 w-4" /> 삭제
          </button>
        </div>
      )}
    </div>
  )
}

export default function ProjectsPage() {
  const router = useRouter()
  const { isReady } = useSession()
  const orgId = useAppStore((s) => s.currentOrgId)
  const { projects, isLoading, createProject, updateProject, deleteProject } = useProjects(orgId)
  const [showForm, setShowForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const handleSubmit = async (data: { name: string; description?: string; color?: string }) => {
    setIsSubmitting(true)
    const success = await createProject(data)
    setIsSubmitting(false)
    if (success) { setShowForm(false); toast('success', '프로젝트가 생성되었습니다.') }
    else toast('error', '프로젝트 생성에 실패했습니다.')
  }

  const handleEdit = (project: Project) => {
    setEditingId(project.id)
    setEditName(project.name)
  }

  const handleSaveEdit = async (projectId: string) => {
    if (!editName.trim()) return
    const success = await updateProject(projectId, { name: editName.trim() })
    if (success) toast('success', '프로젝트가 업데이트되었습니다.')
    else toast('error', '프로젝트 업데이트에 실패했습니다.')
    setEditingId(null)
  }

  const handleDelete = async (projectId: string) => {
    const success = await deleteProject(projectId)
    if (success) toast('success', '프로젝트가 삭제되었습니다.')
    else toast('error', '프로젝트 삭제에 실패했습니다.')
    setDeleteConfirmId(null)
  }

  if (!isReady || isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">프로젝트</h1>
          <p className="text-gray-500 dark:text-slate-400">프로젝트별 비용 관리</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-gray-100 dark:bg-slate-800" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">프로젝트</h1>
          <p className="text-gray-500 dark:text-slate-400">프로젝트별 비용 관리</p>
        </div>
        <Button onClick={() => setShowForm(true)}><Plus className="mr-2 h-4 w-4" /> 프로젝트 추가</Button>
      </div>

      {showForm && (
        <ProjectForm
          onSubmit={handleSubmit}
          onCancel={() => setShowForm(false)}
          isLoading={isSubmitting}
        />
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => (
          <Card
            key={p.id}
            className="cursor-pointer transition-all hover:shadow-md hover:border-gray-300 dark:hover:border-slate-600"
            onClick={() => {
              if (editingId !== p.id && deleteConfirmId !== p.id) {
                router.push(`/projects/${p.id}`)
              }
            }}
          >
            <CardContent className="py-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: `${p.color ?? '#6B7280'}15` }}>
                    <FolderOpen className="h-5 w-5" style={{ color: p.color ?? '#6B7280' }} />
                  </div>
                  <div>
                    {editingId === p.id ? (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(p.id); if (e.key === 'Escape') setEditingId(null) }}
                          autoFocus
                          className="w-40 rounded border border-blue-400 px-2 py-0.5 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <button onClick={(e) => { e.stopPropagation(); handleSaveEdit(p.id) }} className="rounded p-1 text-green-600 hover:bg-green-50">
                          <Check className="h-4 w-4" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setEditingId(null) }} className="rounded p-1 text-gray-400 hover:bg-gray-100">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <h3 className="font-semibold text-gray-900 dark:text-slate-100">{p.name}</h3>
                    )}
                    {p.description && <p className="text-sm text-gray-500 dark:text-slate-400">{p.description}</p>}
                  </div>
                </div>
                <ProjectMenu
                  onEdit={() => handleEdit(p)}
                  onDelete={() => setDeleteConfirmId(p.id)}
                />
              </div>

              {/* Cost summary */}
              <div className="mt-3 flex items-center gap-2 border-t border-gray-100 dark:border-slate-800 pt-3">
                <DollarSign className="h-4 w-4 text-gray-400 dark:text-slate-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
                  이번 달: {formatCurrency(p.cost ?? 0)}
                </span>
              </div>

              {deleteConfirmId === p.id && (
                <div className="mt-3 rounded-lg border border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-950/50 p-3" onClick={(e) => e.stopPropagation()}>
                  <p className="text-sm font-medium text-red-800 dark:text-red-400">&quot;{p.name}&quot;을(를) 삭제하시겠습니까?</p>
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">프로젝트가 삭제됩니다. 이 작업은 되돌릴 수 없습니다.</p>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleDelete(p.id) }}>
                      <Trash2 className="mr-1 h-3 w-3" /> 삭제
                    </Button>
                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(null) }}>취소</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {projects.length === 0 && !showForm && (
          <Card className="col-span-full cursor-pointer border-dashed transition-colors hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/20" onClick={() => setShowForm(true)}>
            <CardContent className="flex min-h-[120px] flex-col items-center justify-center py-8">
              <Plus className="h-8 w-8 text-gray-400 dark:text-slate-500" />
              <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">등록된 프로젝트가 없습니다. 클릭하여 생성하세요.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
