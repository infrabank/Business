'use client'

import { StatCard } from '@/features/dashboard/components/StatCard'
import { Users, UserCheck, UsersRound, Clock } from 'lucide-react'
import type { AnalyticsSummary } from '@/types/analytics'

interface MetricCardsProps {
  summary: AnalyticsSummary | null
  isLoading: boolean
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}분 ${s}초`
}

export function MetricCards({ summary, isLoading }: MetricCardsProps) {
  if (isLoading || !summary) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="DAU"
        value={summary.dau.toLocaleString()}
        change={summary.dauChange > 0 ? -summary.dauChange : Math.abs(summary.dauChange)}
        icon={<Users className="h-4 w-4 text-indigo-500" />}
      />
      <StatCard
        title="WAU"
        value={summary.wau.toLocaleString()}
        change={summary.wauChange > 0 ? -summary.wauChange : Math.abs(summary.wauChange)}
        icon={<UserCheck className="h-4 w-4 text-violet-500" />}
      />
      <StatCard
        title="MAU"
        value={summary.mau.toLocaleString()}
        change={summary.mauChange > 0 ? -summary.mauChange : Math.abs(summary.mauChange)}
        icon={<UsersRound className="h-4 w-4 text-blue-500" />}
      />
      <StatCard
        title="평균 세션 시간"
        value={formatDuration(summary.avgSessionDuration)}
        icon={<Clock className="h-4 w-4 text-emerald-500" />}
      />
    </div>
  )
}
