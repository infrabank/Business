'use client'

import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList,
} from 'recharts'
import type { FunnelStep } from '@/types/analytics'

const FUNNEL_COLORS = ['#4F46E5', '#6366F1', '#818CF8', '#A5B4FC', '#C7D2FE']

interface FunnelChartProps {
  data: FunnelStep[]
  isLoading: boolean
}

export function FunnelChart({ data, isLoading }: FunnelChartProps) {
  if (isLoading) {
    return <div className="h-80 animate-pulse rounded-2xl bg-slate-100" />
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader><h3 className="text-lg font-bold text-slate-900">퍼널 전환율</h3></CardHeader>
        <CardContent><p className="text-sm text-slate-500">데이터가 충분하지 않습니다.</p></CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-bold text-slate-900">퍼널 전환율</h3>
        <p className="text-sm text-slate-500">회원가입 → 7일 리텐션 전환 경로</p>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 80, left: 100, bottom: 5 }}>
              <XAxis type="number" tick={{ fontSize: 12, fill: '#94A3B8' }} />
              <YAxis type="category" dataKey="label" tick={{ fontSize: 13, fill: '#334155' }} width={90} />
              <Tooltip
                formatter={(v) => [Number(v), '사용자']}
                contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0' }}
              />
              <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                {data.map((_, i) => (
                  <Cell key={i} fill={FUNNEL_COLORS[i % FUNNEL_COLORS.length]} />
                ))}
                <LabelList
                  dataKey="rate"
                  position="right"
                  formatter={(v) => `${Number(v).toFixed(0)}%`}
                  style={{ fontSize: 12, fontWeight: 600, fill: '#6366F1' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
