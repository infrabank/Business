'use client'

import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import type { DailyUserCount } from '@/types/analytics'

interface ActiveUsersChartProps {
  data: DailyUserCount[]
  isLoading: boolean
}

export function ActiveUsersChart({ data, isLoading }: ActiveUsersChartProps) {
  if (isLoading) {
    return <div className="h-80 animate-pulse rounded-2xl bg-slate-100" />
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader><h3 className="text-lg font-bold text-slate-900">일별 활성 사용자</h3></CardHeader>
        <CardContent><p className="text-sm text-slate-500">데이터가 충분하지 않습니다.</p></CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-bold text-slate-900">일별 활성 사용자</h3>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366F1" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#94A3B8' }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 12, fill: '#94A3B8' }} />
              <Tooltip
                formatter={(v) => [Number(v), '사용자']}
                labelFormatter={(l) => `날짜: ${l}`}
                contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0' }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#4F46E5"
                strokeWidth={2.5}
                fill="url(#colorUsers)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
