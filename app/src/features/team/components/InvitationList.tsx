'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'
import type { Invitation, MemberRole } from '@/types/organization'
import { X } from 'lucide-react'

const ROLE_LABELS: Record<MemberRole, string> = {
  owner: '소유자',
  admin: '관리자',
  viewer: '뷰어',
}

interface InvitationListProps {
  invitations: Invitation[]
  onUpdate: () => void
}

export function InvitationList({ invitations, onUpdate }: InvitationListProps) {
  const [cancelling, setCancelling] = useState<string | null>(null)

  async function handleCancel(id: string) {
    setCancelling(id)
    try {
      const res = await fetch(`/api/members/invitations/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Cancel failed')
      toast('success', '초대가 취소되었습니다.')
      onUpdate()
    } catch {
      toast('error', '초대 취소에 실패했습니다.')
    } finally {
      setCancelling(null)
    }
  }

  return (
    <div className="divide-y rounded-lg border">
      {invitations.map((inv) => (
        <div key={inv.id} className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-900">{inv.email}</span>
            <Badge variant="default">{ROLE_LABELS[inv.role]}</Badge>
            <span className="text-xs text-gray-400">
              {new Date(inv.createdAt).toLocaleDateString('ko-KR')}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleCancel(inv.id)}
            disabled={cancelling === inv.id}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  )
}
