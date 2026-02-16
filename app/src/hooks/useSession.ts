'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { getSupabaseBrowserClient } from '@/lib/supabase'
import { bkend } from '@/lib/bkend'
import type { Organization } from '@/types'

export function useSession() {
  const { currentUser, currentOrgId, setCurrentUser, setCurrentOrgId, clearSession } = useAppStore()
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()

    async function restore() {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error || !user) {
          setIsReady(true)
          return
        }

        // Fetch plan from custom users table
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
      } finally {
        setIsReady(true)
      }
    }

    if (!currentUser) {
      restore()
    } else {
      setIsReady(true)
    }

    // Listen for auth state changes (sign-out, token refresh, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        clearSession()
      }
    })

    return () => subscription.unsubscribe()
  }, [currentUser, setCurrentUser, setCurrentOrgId, clearSession])

  return { isReady, currentUser, currentOrgId }
}
