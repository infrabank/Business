'use client'

import { useState } from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { toast } from '@/components/ui/Toast'
import { useAppStore } from '@/lib/store'
import { useSession } from '@/hooks/useSession'
import { useBilling } from '@/features/billing/hooks/useBilling'
import { clearAuthCookies } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { ConfirmModal } from './ConfirmModal'
import { Lock, AlertTriangle, Trash2, Database } from 'lucide-react'
import type { Organization } from '@/types'
import { bkend } from '@/lib/bkend'

export function SecurityTab() {
  const router = useRouter()
  const { currentUser } = useSession()
  const orgId = useAppStore((s) => s.currentOrgId)
  const { subscription } = useBilling()
  const plan = subscription?.plan || currentUser?.plan || 'free'

  // Password form
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)

  // Danger zone modals
  const [resetModalOpen, setResetModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [orgName, setOrgName] = useState('')
  const [dangerLoading, setDangerLoading] = useState(false)

  // Load org name for reset confirmation
  const loadOrgName = async () => {
    if (orgName || !orgId) return
    try {
      const orgs = await bkend.get<Organization[]>('/organizations', { params: { id: orgId } })
      if (orgs.length > 0) setOrgName(orgs[0].name || '')
    } catch {
      // ignore
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword.length < 8) {
      toast('error', '새 비밀번호는 8자 이상이어야 합니다.')
      return
    }
    if (newPassword !== confirmPassword) {
      toast('error', '새 비밀번호와 확인이 일치하지 않습니다.')
      return
    }

    setPasswordSaving(true)
    try {
      const res = await fetch('/api/settings/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast('error', data.error || '비밀번호 변경에 실패했습니다.')
        return
      }

      toast('success', '비밀번호가 변경되었습니다.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch {
      toast('error', '비밀번호 변경에 실패했습니다.')
    } finally {
      setPasswordSaving(false)
    }
  }

  const handleResetData = async () => {
    if (!orgId) return
    setDangerLoading(true)
    try {
      const res = await fetch('/api/settings/data', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: orgName, orgId }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast('error', data.error || '데이터 초기화에 실패했습니다.')
        return
      }

      toast('success', `${data.deleted}건의 데이터가 삭제되었습니다.`)
      setResetModalOpen(false)
    } catch {
      toast('error', '데이터 초기화에 실패했습니다.')
    } finally {
      setDangerLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    setDangerLoading(true)
    try {
      const res = await fetch('/api/settings/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: 'DELETE' }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast('error', data.error || '계정 삭제에 실패했습니다.')
        return
      }

      clearAuthCookies()
      router.push('/login')
    } catch {
      toast('error', '계정 삭제에 실패했습니다.')
    } finally {
      setDangerLoading(false)
    }
  }

  const isGrowthActive = plan === 'growth' && subscription?.status === 'active' && !subscription?.cancelAtPeriodEnd

  return (
    <div className="space-y-6">
      {/* Password Change */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-gray-400 dark:text-slate-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">비밀번호 변경</h2>
          </div>
        </CardHeader>
        <CardContent>
          <form className="max-w-md space-y-4" onSubmit={handleChangePassword}>
            <Input
              id="currentPassword"
              label="현재 비밀번호"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
            <Input
              id="newPassword"
              label="새 비밀번호"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            {newPassword && newPassword.length < 8 && (
              <p className="text-xs text-amber-600 dark:text-amber-500">8자 이상 입력해주세요.</p>
            )}
            <Input
              id="confirmPassword"
              label="새 비밀번호 확인"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-red-600 dark:text-red-500">비밀번호가 일치하지 않습니다.</p>
            )}
            <Button type="submit" disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword}>
              {passwordSaving ? '변경 중...' : '비밀번호 변경'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500 dark:text-red-400" />
            <h2 className="text-lg font-semibold text-red-600 dark:text-red-400">Danger Zone</h2>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Data Reset */}
            <div className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">데이터 초기화</h3>
                  </div>
                  <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
                    조직의 모든 사용량 데이터가 영구 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => { loadOrgName(); setResetModalOpen(true) }}
                  className="shrink-0 border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/40"
                >
                  데이터 초기화
                </Button>
              </div>
            </div>

            {/* Account Delete */}
            <div className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">계정 삭제</h3>
                  </div>
                  <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
                    계정, 조직, 모든 데이터가 영구 삭제됩니다.
                  </p>
                  {isGrowthActive && (
                    <p className="mt-1 text-sm font-medium text-amber-600 dark:text-amber-500">
                      Growth 구독을 먼저 해지해야 합니다. 구독 탭에서 결제 관리를 이용하세요.
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  onClick={() => setDeleteModalOpen(true)}
                  disabled={isGrowthActive}
                  className="shrink-0 border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/40"
                >
                  계정 삭제
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confirm Modals */}
      <ConfirmModal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        onConfirm={handleResetData}
        title="데이터 초기화"
        description="조직의 모든 사용량 데이터가 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다."
        confirmText={orgName}
        confirmLabel="데이터 초기화"
        variant="danger"
        isLoading={dangerLoading}
      />

      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteAccount}
        title="계정 삭제"
        description="계정, 조직, 모든 데이터가 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다."
        confirmText="DELETE"
        confirmLabel="계정 삭제"
        variant="danger"
        isLoading={dangerLoading}
      />
    </div>
  )
}
