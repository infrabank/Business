'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { MemberTable } from './MemberTable'
import { InvitationList } from './InvitationList'
import { InviteMemberModal } from './InviteMemberModal'
import type { MemberWithUser, Invitation } from '@/types/organization'
import { UserPlus, Wallet, Check } from 'lucide-react'
import type { BudgetDuration } from '@/services/proxy/budget-check.service'

export function TeamPage() {
  const [members, setMembers] = useState<MemberWithUser[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)

  // Team budget state
  const [teamBudgetLimit, setTeamBudgetLimit] = useState('')
  const [teamBudgetDuration, setTeamBudgetDuration] = useState<BudgetDuration>('monthly')
  const [budgetSaving, setBudgetSaving] = useState(false)
  const [budgetSaved, setBudgetSaved] = useState(false)

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

      {/* Team Budget Management */}
      <Card>
        <CardHeader>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-slate-100">
            <Wallet className="h-5 w-5 text-emerald-500" />
            팀 예산 관리
          </h2>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-gray-500 dark:text-slate-400">
            팀 전체의 프록시 사용 예산을 설정합니다. 모든 팀원의 사용량이 합산됩니다.
          </p>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[150px]">
              <Input
                label="예산 한도 ($)"
                type="number"
                placeholder="예: 100"
                value={teamBudgetLimit}
                onChange={(e) => setTeamBudgetLimit(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">주기</label>
              <select
                value={teamBudgetDuration}
                onChange={(e) => setTeamBudgetDuration(e.target.value as BudgetDuration)}
                className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 px-3 py-2 text-sm"
              >
                <option value="daily">일간</option>
                <option value="weekly">주간</option>
                <option value="monthly">월간</option>
              </select>
            </div>
            <Button
              onClick={async () => {
                setBudgetSaving(true)
                try {
                  // Save team budget via settings API
                  await fetch('/api/settings/preferences', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      teamBudgetLimit: teamBudgetLimit ? Number(teamBudgetLimit) : null,
                      teamBudgetDuration,
                    }),
                  })
                  setBudgetSaved(true)
                  setTimeout(() => setBudgetSaved(false), 2000)
                } catch {
                  // ignore
                } finally {
                  setBudgetSaving(false)
                }
              }}
              loading={budgetSaving}
              disabled={!teamBudgetLimit}
            >
              {budgetSaved ? <><Check className="mr-1 h-4 w-4" /> 저장됨</> : '예산 설정'}
            </Button>
          </div>
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
