'use client'

import { useState, useCallback } from 'react'
import * as auth from '@/lib/auth'

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

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true)
    setError(null)
    try {
      const tokens = await auth.login(email, password)
      auth.setAuthCookies(tokens)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  const signup = useCallback(async (email: string, password: string, name: string): Promise<boolean> => {
    setIsLoading(true)
    setError(null)
    try {
      const tokens = await auth.signup(email, password, name)
      auth.setAuthCookies(tokens)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    auth.clearAuthCookies()
    window.location.href = '/login'
  }, [])

  return { isLoading, error, login, signup, logout }
}
