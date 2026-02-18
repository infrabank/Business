'use client'

import { useState, useEffect, useCallback } from 'react'
import { bkend } from '@/lib/bkend'
import type { Project } from '@/types'

export interface ProjectWithCost extends Project {
  cost?: number
  requestCount?: number
}

export function useProjects(orgId?: string | null) {
  const [projects, setProjects] = useState<ProjectWithCost[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchProjects = useCallback(async () => {
    if (!orgId) { setIsLoading(false); return }
    setIsLoading(true)
    try {
      const [data, summaryRes] = await Promise.all([
        bkend.get<Project[]>('/projects', { params: { orgId } }),
        fetch(`/api/dashboard/summary?orgId=${orgId}`).then((r) =>
          r.ok ? r.json() : null,
        ).catch(() => null),
      ])

      const costMap = new Map<string, { cost: number }>()
      if (summaryRes?.byProject) {
        for (const p of summaryRes.byProject) {
          costMap.set(p.projectId, { cost: p.cost })
        }
      }

      const merged: ProjectWithCost[] = data.map((p) => ({
        ...p,
        cost: costMap.get(p.id)?.cost ?? 0,
      }))

      setProjects(merged)
    } catch {
      setProjects([])
    } finally {
      setIsLoading(false)
    }
  }, [orgId])

  useEffect(() => { fetchProjects() }, [fetchProjects])

  const createProject = useCallback(async (data: { name: string; description?: string; color?: string }) => {
    if (!orgId) return false
    try {
      await bkend.post('/projects', { orgId, ...data })
      await fetchProjects()
      return true
    } catch { return false }
  }, [orgId, fetchProjects])

  const updateProject = useCallback(async (projectId: string, data: Partial<Pick<Project, 'name' | 'description' | 'color'>>) => {
    try {
      await bkend.patch('/projects/' + projectId, data as Record<string, unknown>)
      await fetchProjects()
      return true
    } catch { return false }
  }, [fetchProjects])

  const deleteProject = useCallback(async (projectId: string) => {
    try {
      await bkend.delete('/projects/' + projectId, {})
      await fetchProjects()
      return true
    } catch { return false }
  }, [fetchProjects])

  return { projects, isLoading, refetch: fetchProjects, createProject, updateProject, deleteProject }
}
