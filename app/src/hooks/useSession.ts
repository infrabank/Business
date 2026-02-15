'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { getTokenFromCookie, getMe, clearAuthCookies } from '@/lib/auth'
import { bkend } from '@/lib/bkend'
import type { Organization } from '@/types'

export function useSession() {
  const { currentUser, currentOrgId, setCurrentUser, setCurrentOrgId, clearSession } = useAppStore()
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    async function restore() {
      const token = getTokenFromCookie()
      if (!token) {
        setIsReady(true)
        return
      }

      try {
        const user = await getMe(token)
        setCurrentUser(user)

        const orgs = await bkend.get<Organization[]>('/organizations', {
          token,
          params: { ownerId: user.id }
        })

        if (orgs.length > 0) {
          setCurrentOrgId(orgs[0].id)
        }
      } catch {
        clearAuthCookies()
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
  }, [currentUser, setCurrentUser, setCurrentOrgId, clearSession])

  return { isReady, currentUser, currentOrgId }
}
