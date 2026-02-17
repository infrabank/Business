'use client'

import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import type { FeatureStat } from '@/types/analytics'

const FEATURE_LABELS: Record<string, string> = {
  provider_add: '프로바이더 추가',
  budget_set: '예산 설정',
  alert_create: '알림 생성',
  sync_trigger: '동기화 실행',
  report_export: '리포트 내보내기',
  proxy_key_create: '프록시 키 생성',
  template_create: '템플릿 생성',
  playground_run: '플레이그라운드 실행',
  team_invite: '팀 초대',
}

interface FeatureUsageChartProps {
  data: FeatureStat[]
  isLoading: boolean
}

export function FeatureUsageChart({ data, isLoading }: FeatureUsageChartProps) {
  if (isLoading) {
    return <div className="h-80 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader><h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">기능별 사용률</h3></CardHeader>
        <CardContent><p className="text-sm text-slate-500 dark:text-slate-400">데이터가 충분하지 않습니다.</p></CardContent>
      </Card>
    )
  }

  const chartData = data.map((d) => ({
    ...d,
    label: FEATURE_LABELS[d.name] || d.name,
  }))

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">기능별 사용률</h3>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 50 }}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#334155' }}
                angle={-30}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fontSize: 12, fill: '#94A3B8' }} />
              <Tooltip
                formatter={(v) => [Number(v), '사용']}
                contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0' }}
              />
              <Bar dataKey="usageCount" fill="#8B5CF6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
