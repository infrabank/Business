'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import type { TimeseriesPoint } from '@/types/proxy-analytics'

interface Props {
  data: TimeseriesPoint[]
}

export function ProxyCostTrendChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-gray-400">
          차트 데이터가 없습니다
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold text-gray-900">비용 추이</h3>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tickFormatter={(v: string) => v.slice(5)} // MM-DD
                tick={{ fontSize: 12, fill: '#9ca3af' }}
              />
              <YAxis
                tickFormatter={(v) => `$${Number(v).toFixed(2)}`}
                tick={{ fontSize: 12, fill: '#9ca3af' }}
              />
              <Tooltip
                formatter={(v, name) => [
                  `$${Number(v).toFixed(4)}`,
                  name === 'totalCost' ? '실제 비용' : '절감 금액',
                ]}
                labelFormatter={(label) => `날짜: ${label}`}
              />
              <Legend
                formatter={(value: string) =>
                  value === 'totalCost' ? '실제 비용' : '절감 금액'
                }
              />
              <Area
                type="monotone"
                dataKey="totalCost"
                stackId="1"
                stroke="#3b82f6"
                fill="#93c5fd"
                fillOpacity={0.6}
              />
              <Area
                type="monotone"
                dataKey="totalSaved"
                stackId="1"
                stroke="#10b981"
                fill="#6ee7b7"
                fillOpacity={0.6}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
