'use client'

import { useSession } from '@/hooks/useSession'
import { isFeatureAvailable } from '@/lib/plan-limits'
import type { UserPlan } from '@/types'
import { TeamPage } from '@/features/team/components/TeamPage'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

export default function TeamRoute() {
  const { isReady, currentUser } = useSession()
  const plan = (currentUser?.plan || 'free') as UserPlan

  if (!isReady) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">팀</h1>
          <p className="text-gray-500">멤버 초대 및 역할 관리</p>
        </div>
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-48 animate-pulse rounded-xl bg-gray-100" />
        ))}
      </div>
    )
  }

  if (!isFeatureAvailable(plan, 'team')) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">팀</h1>
          <p className="text-gray-500">멤버 초대 및 역할 관리</p>
        </div>
        <Card>
          <CardContent className="py-16 text-center">
            <h2 className="text-xl font-semibold text-gray-900">
              팀 관리는 Growth 플랜에서 이용 가능합니다
            </h2>
            <p className="mt-2 text-gray-500">
              무제한 멤버 초대, 역할 기반 접근제어를 사용하세요.
            </p>
            <Link href="/pricing" className="mt-6 inline-block">
              <Button>플랜 업그레이드</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <TeamPage />
}
