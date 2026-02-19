'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import * as auth from '@/lib/auth'
import { bkend } from '@/lib/bkend'
import { useAppStore } from '@/lib/store'
import type { Organization } from '@/types'

interface UseAuthResult {
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<boolean>
  signup: (email: string, password: string, name: string) => Promise<boolean>
  logout: () => void
}

export function useAuth(): UseAuthResult {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const setCurrentUser = useAppStore((s) => s.setCurrentUser)
  const setCurrentOrgId = useAppStore((s) => s.setCurrentOrgId)
  const clearSession = useAppStore((s) => s.clearSession)

  const initSession = useCallback(async () => {
    const user = await auth.getMe()
    setCurrentUser(user)

    const orgs = await bkend.get<Organization[]>('/organizations', {
      params: { ownerId: user.id }
    })

    if (orgs.length > 0) {
      setCurrentOrgId(orgs[0].id)
    } else {
      const newOrg = await bkend.post<Organization>('/organizations', {
        name: `${user.name}'s Workspace`,
        slug: user.email.split('@')[0],
        ownerId: user.id,
      })
      setCurrentOrgId(newOrg.id)
    }
  }, [setCurrentUser, setCurrentOrgId])

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true)
    setError(null)
    try {
      await auth.login(email, password)
      await initSession()
      router.push('/dashboard')
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [initSession, router])

  const signup = useCallback(async (email: string, password: string, name: string): Promise<boolean> => {
    setIsLoading(true)
    setError(null)
    try {
      await auth.signup(email, password, name)
      await initSession()
      router.push('/dashboard')
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [initSession, router])

  const logout = useCallback(() => {
    auth.clearAuthCookies()
    clearSession()
    router.push('/login')
  }, [clearSession, router])

  return { isLoading, error, login, signup, logout }
}
