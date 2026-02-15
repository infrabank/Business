'use client'

import { useState, useEffect, useCallback } from 'react'
import { getTokenFromCookie } from '@/lib/auth'
import { bkend } from '@/lib/bkend'
import type { Project } from '@/types'

export function useProjects(orgId?: string | null) {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchProjects = useCallback(async () => {
    if (!orgId) { setIsLoading(false); return }
    setIsLoading(true)
    try {
      const token = getTokenFromCookie()
      const data = await bkend.get<Project[]>('/projects', {
        token: token || undefined,
        params: { orgId }
      })
      setProjects(data)
    } catch {
      setProjects([])
    } finally {
      setIsLoading(false)
    }
  }, [orgId])

  useEffect(() => { fetchProjects() }, [fetchProjects])

  const createProject = useCallback(async (data: { name: string; description?: string; color?: string }) => {
    const token = getTokenFromCookie()
    if (!token || !orgId) return false
    try {
      await bkend.post('/projects', { orgId, ...data }, { token })
      await fetchProjects()
      return true
    } catch { return false }
  }, [orgId, fetchProjects])

  const deleteProject = useCallback(async (projectId: string) => {
    const token = getTokenFromCookie()
    if (!token) return false
    try {
      await bkend.delete('/projects/' + projectId, { token })
      await fetchProjects()
      return true
    } catch { return false }
  }, [fetchProjects])

  return { projects, isLoading, refetch: fetchProjects, createProject, deleteProject }
}
