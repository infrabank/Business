'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { toast } from '@/components/ui/Toast'
import type { MemberRole } from '@/types/organization'

interface InviteMemberModalProps {
  onClose: () => void
  onInvited: () => void
}

export function InviteMemberModal({ onClose, onInvited }: InviteMemberModalProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<MemberRole>('viewer')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    try {
      const res = await fetch('/api/members/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        const messages: Record<string, string> = {
          PLAN_REQUIRED: 'Growth 플랜이 필요합니다.',
          MEMBER_LIMIT_REACHED: '멤버 수 제한에 도달했습니다.',
          ALREADY_INVITED: '이미 초대된 이메일입니다.',
          ALREADY_MEMBER: '이미 멤버인 사용자입니다.',
        }
        throw new Error(messages[error] || error)
      }
      toast('success', `${email}에게 초대를 보냈습니다.`)
      onInvited()
      onClose()
    } catch (error) {
      toast('error', error instanceof Error ? error.message : '초대 실패')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900">멤버 초대</h2>
        <p className="mt-1 text-sm text-gray-500">이메일로 팀 멤버를 초대하세요.</p>
        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <Input
            id="invite-email"
            label="이메일"
            type="email"
            placeholder="colleague@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              역할
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as MemberRole)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="admin">
                관리자 - 프로바이더, 프로젝트, 예산, 멤버 관리
              </option>
              <option value="viewer">뷰어 - 대시보드, 리포트 조회만 가능</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              취소
            </Button>
            <Button type="submit" loading={loading} className="flex-1">
              초대 보내기
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
