'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { getSupabaseBrowserClient } from '@/lib/supabase'
import { bkend } from '@/lib/bkend'
import type { Organization } from '@/types'

// Module-level flag to prevent duplicate restores across page navigations
let restorePromise: Promise<void> | null = null

export function useSession() {
  const currentUser = useAppStore((s) => s.currentUser)
  const currentOrgId = useAppStore((s) => s.currentOrgId)
  const setCurrentUser = useAppStore((s) => s.setCurrentUser)
  const setCurrentOrgId = useAppStore((s) => s.setCurrentOrgId)
  const clearSession = useAppStore((s) => s.clearSession)
  const [isReady, setIsReady] = useState(!!currentUser)

  useEffect(() => {
    // If user already in Zustand store, mark ready immediately
    if (currentUser) {
      setIsReady(true)
      return
    }

    // Only restore once — reuse in-flight promise if already restoring
    if (!restorePromise) {
      restorePromise = (async () => {
        const supabase = getSupabaseBrowserClient()
        try {
          const { data: { user }, error } = await supabase.auth.getUser()
          if (error || !user) return

          let plan: string | undefined
          try {
            const userData = await bkend.get<{ plan?: string }[]>('/users', {
              params: { id: user.id }
            })
            if (userData.length > 0) plan = userData[0].plan
          } catch {
            // ignore - will default to 'free'
          }

          setCurrentUser({
            id: user.id,
            email: user.email!,
            name: user.user_metadata?.name || user.email?.split('@')[0] || '',
            plan,
          })

          const orgs = await bkend.get<Organization[]>('/organizations', {
            params: { ownerId: user.id }
          })

          if (orgs.length > 0) {
            setCurrentOrgId(orgs[0].id)
          }
        } catch {
          clearSession()
        }
      })()
    }

    restorePromise.then(() => setIsReady(true)).catch(() => setIsReady(true))

    // Auth state listener — subscribe once
    const supabase = getSupabaseBrowserClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        restorePromise = null // Allow re-restore after sign-out
        clearSession()
      }
    })

    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser])

  return { isReady, currentUser, currentOrgId }
}
