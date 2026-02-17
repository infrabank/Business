'use client'

import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import type { PageStat } from '@/types/analytics'

const PAGE_LABELS: Record<string, string> = {
  '/dashboard': '대시보드',
  '/providers': '프로바이더',
  '/projects': '프로젝트',
  '/budget': '예산',
  '/alerts': '알림',
  '/reports': '리포트',
  '/proxy': '프록시',
  '/team': '팀',
  '/playground': '플레이그라운드',
  '/templates': '템플릿',
  '/settings': '설정',
  '/analytics': '분석',
}

interface PageRankChartProps {
  data: PageStat[]
  isLoading: boolean
}

export function PageRankChart({ data, isLoading }: PageRankChartProps) {
  if (isLoading) {
    return <div className="h-80 animate-pulse rounded-2xl bg-slate-100" />
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader><h3 className="text-lg font-bold text-slate-900">페이지별 방문 순위</h3></CardHeader>
        <CardContent><p className="text-sm text-slate-500">데이터가 충분하지 않습니다.</p></CardContent>
      </Card>
    )
  }

  const chartData = data.map((d) => ({
    ...d,
    label: PAGE_LABELS[d.path] || d.path,
  }))

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-bold text-slate-900">페이지별 방문 순위</h3>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
              <XAxis type="number" tick={{ fontSize: 12, fill: '#94A3B8' }} />
              <YAxis type="category" dataKey="label" tick={{ fontSize: 12, fill: '#334155' }} width={70} />
              <Tooltip
                formatter={(v) => [Number(v), '방문']}
                contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0' }}
              />
              <Bar dataKey="views" fill="#6366F1" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
