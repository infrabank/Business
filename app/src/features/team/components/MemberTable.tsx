'use client'

import { useState } from 'react'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'
import type { MemberWithUser, MemberRole } from '@/types/organization'
import { Trash2 } from 'lucide-react'

interface MemberTableProps {
  members: MemberWithUser[]
  loading: boolean
  onUpdate: () => void
}

const ROLE_LABELS: Record<MemberRole, string> = {
  owner: '소유자',
  admin: '관리자',
  viewer: '뷰어',
}

const ROLE_VARIANTS: Record<MemberRole, 'info' | 'success' | 'default'> = {
  owner: 'info',
  admin: 'success',
  viewer: 'default',
}

export function MemberTable({ members, loading, onUpdate }: MemberTableProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  async function handleRoleChange(memberId: string, newRole: MemberRole) {
    setActionLoading(memberId)
    try {
      const res = await fetch(`/api/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error)
      }
      toast('success', '역할이 변경되었습니다.')
      onUpdate()
    } catch (error) {
      toast('error', error instanceof Error ? error.message : '역할 변경 실패')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleRemove(memberId: string) {
    if (!confirm('이 멤버를 제거하시겠습니까?')) return
    setActionLoading(memberId)
    try {
      const res = await fetch(`/api/members/${memberId}`, { method: 'DELETE' })
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error)
      }
      toast('success', '멤버가 제거되었습니다.')
      onUpdate()
    } catch (error) {
      toast('error', error instanceof Error ? error.message : '멤버 제거 실패')
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded bg-gray-100" />
        ))}
      </div>
    )
  }

  const columns = [
    {
      key: 'name',
      header: '이름',
      render: (m: MemberWithUser) => (
        <div>
          <p className="font-medium text-gray-900">{m.user.name}</p>
          <p className="text-xs text-gray-500">{m.user.email}</p>
        </div>
      ),
    },
    {
      key: 'role',
      header: '역할',
      render: (m: MemberWithUser) =>
        m.role === 'owner' ? (
          <Badge variant={ROLE_VARIANTS[m.role]}>{ROLE_LABELS[m.role]}</Badge>
        ) : (
          <select
            value={m.role}
            onChange={(e) => handleRoleChange(m.id, e.target.value as MemberRole)}
            disabled={actionLoading === m.id}
            className="rounded border border-gray-200 px-2 py-1 text-sm"
          >
            <option value="admin">관리자</option>
            <option value="viewer">뷰어</option>
          </select>
        ),
    },
    {
      key: 'joinedAt',
      header: '가입일',
      render: (m: MemberWithUser) => (
        <span className="text-sm text-gray-500">
          {new Date(m.joinedAt).toLocaleDateString('ko-KR')}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right' as const,
      render: (m: MemberWithUser) =>
        m.role !== 'owner' ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleRemove(m.id)}
            disabled={actionLoading === m.id}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        ) : null,
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={members}
      keyExtractor={(m) => m.id}
      emptyMessage="아직 멤버가 없습니다."
      ariaLabel="팀 멤버 목록"
    />
  )
}
