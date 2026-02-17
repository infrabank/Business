'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'
import { Mail, Check, X } from 'lucide-react'

interface PendingInvite {
  id: string
  orgName?: string
  role: string
}

export function PendingInviteBanner() {
  const [invites, setInvites] = useState<PendingInvite[]>([])
  const [loading, setLoading] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/members/pending')
      .then((r) => (r.ok ? r.json() : []))
      .then(setInvites)
      .catch(() => {})
  }, [])

  if (invites.length === 0) return null

  async function handleAction(id: string, action: 'accept' | 'decline') {
    setLoading(id)
    try {
      const res = await fetch(`/api/members/invitations/${id}/${action}`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error()
      toast(
        'success',
        action === 'accept' ? '초대를 수락했습니다.' : '초대를 거절했습니다.'
      )
      setInvites((prev) => prev.filter((i) => i.id !== id))
    } catch {
      toast('error', '처리에 실패했습니다.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-2">
      {invites.map((inv) => (
        <div
          key={inv.id}
          className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50 px-4 py-3"
        >
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-blue-900">
              <strong>{inv.orgName || '조직'}</strong>에서 {inv.role} 역할로
              초대했습니다.
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => handleAction(inv.id, 'accept')}
              disabled={loading === inv.id}
            >
              <Check className="mr-1 h-3 w-3" /> 수락
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAction(inv.id, 'decline')}
              disabled={loading === inv.id}
            >
              <X className="mr-1 h-3 w-3" /> 거절
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
