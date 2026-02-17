'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAppStore } from '@/lib/store'
import type {
  PromptTemplate,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  TemplateSortOption,
} from '@/types/template'

export function useTemplates() {
  const { currentUser } = useAppStore()

  // Data
  const [templates, setTemplates] = useState<PromptTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [saving, setSaving] = useState(false)

  // Filters
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<TemplateSortOption>('recent')

  // Editor state
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)

  // Plan limits
  const plan = currentUser?.plan || 'free'
  const templateLimit = plan === 'growth' ? -1 : 10
  const limitReached = templateLimit !== -1 && templates.length >= templateLimit

  // Search debounce
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current)
    }
  }, [search])

  // Load templates
  const loadTemplates = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (category) params.set('category', category)
      if (debouncedSearch) params.set('search', debouncedSearch)
      params.set('sort', sort)
      params.set('limit', '50')
      params.set('offset', '0')

      const res = await fetch(`/api/templates?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setTemplates(data.data || [])
        setTotal(data.total || 0)
      }
    } catch {
      /* ignore */
    }
    setLoading(false)
  }, [category, debouncedSearch, sort])

  useEffect(() => {
    loadTemplates()
  }, [loadTemplates])

  // Create
  const createTemplate = useCallback(
    async (data: CreateTemplateRequest): Promise<PromptTemplate | null> => {
      setSaving(true)
      try {
        const res = await fetch('/api/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || '생성에 실패했습니다.')
        }
        const template = await res.json()
        await loadTemplates()
        setEditorOpen(false)
        return template
      } catch {
        return null
      } finally {
        setSaving(false)
      }
    },
    [loadTemplates],
  )

  // Update
  const updateTemplate = useCallback(
    async (id: string, data: UpdateTemplateRequest): Promise<PromptTemplate | null> => {
      setSaving(true)
      try {
        const res = await fetch(`/api/templates/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || '수정에 실패했습니다.')
        }
        const template = await res.json()
        await loadTemplates()
        setEditorOpen(false)
        setEditingTemplate(null)
        return template
      } catch {
        return null
      } finally {
        setSaving(false)
      }
    },
    [loadTemplates],
  )

  // Delete
  const deleteTemplate = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' })
        if (!res.ok) return false
        await loadTemplates()
        return true
      } catch {
        return false
      }
    },
    [loadTemplates],
  )

  // Toggle favorite
  const toggleFavorite = useCallback(
    async (template: PromptTemplate) => {
      try {
        await fetch(`/api/templates/${template.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isFavorite: !template.isFavorite }),
        })
        // Optimistic update
        setTemplates((prev) =>
          prev.map((t) =>
            t.id === template.id ? { ...t, isFavorite: !t.isFavorite } : t,
          ),
        )
      } catch {
        /* ignore */
      }
    },
    [],
  )

  // Editor helpers
  const openEditor = useCallback((template?: PromptTemplate) => {
    setEditingTemplate(template || null)
    setEditorOpen(true)
  }, [])

  const closeEditor = useCallback(() => {
    setEditingTemplate(null)
    setEditorOpen(false)
  }, [])

  return {
    // Data
    templates,
    loading,
    total,

    // Filters
    category,
    setCategory,
    search,
    setSearch,
    sort,
    setSort,

    // Editor
    editingTemplate,
    editorOpen,
    saving,
    openEditor,
    closeEditor,

    // CRUD
    createTemplate,
    updateTemplate,
    deleteTemplate,
    toggleFavorite,

    // Limits
    templateLimit,
    limitReached,

    // Reload
    loadTemplates,
  }
}
