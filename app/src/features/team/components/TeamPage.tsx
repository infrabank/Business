'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { MemberTable } from './MemberTable'
import { InvitationList } from './InvitationList'
import { InviteMemberModal } from './InviteMemberModal'
import type { MemberWithUser, Invitation } from '@/types/organization'
import { UserPlus } from 'lucide-react'

export function TeamPage() {
  const [members, setMembers] = useState<MemberWithUser[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const [membersRes, invitationsRes] = await Promise.all([
        fetch('/api/members'),
        fetch('/api/members/invitations'),
      ])
      if (membersRes.ok) setMembers(await membersRes.json())
      if (invitationsRes.ok) setInvitations(await invitationsRes.json())
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">팀</h1>
          <p className="text-gray-500 dark:text-slate-400">멤버 초대 및 역할 관리</p>
        </div>
        <Button onClick={() => setShowInviteModal(true)}>
          <UserPlus className="mr-2 h-4 w-4" /> 멤버 초대
        </Button>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
            멤버 ({members.length})
          </h2>
        </CardHeader>
        <CardContent>
          <MemberTable members={members} loading={loading} onUpdate={loadData} />
        </CardContent>
      </Card>

      {invitations.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              대기 중인 초대 ({invitations.length})
            </h2>
          </CardHeader>
          <CardContent>
            <InvitationList invitations={invitations} onUpdate={loadData} />
          </CardContent>
        </Card>
      )}

      {showInviteModal && (
        <InviteMemberModal
          onClose={() => setShowInviteModal(false)}
          onInvited={loadData}
        />
      )}
    </div>
  )
}
