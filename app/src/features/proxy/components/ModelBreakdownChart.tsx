'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import type { BreakdownItem } from '@/types/proxy-analytics'

interface Props {
  data: BreakdownItem[]
  title?: string
}

export function ModelBreakdownChart({ data, title = '모델별 비용 분석' }: Props) {
  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-gray-400">
          데이터가 없습니다
        </CardContent>
      </Card>
    )
  }

  // Show top 10 only
  const chartData = data.slice(0, 10)

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 20, left: 80, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                type="number"
                tickFormatter={(v) => `$${Number(v).toFixed(2)}`}
                tick={{ fontSize: 12, fill: '#9ca3af' }}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                width={75}
              />
              <Tooltip
                formatter={(v, name) => [
                  `$${Number(v).toFixed(4)}`,
                  name === 'totalCost' ? '비용' : '절감',
                ]}
              />
              <Legend
                formatter={(value: string) =>
                  value === 'totalCost' ? '비용' : '절감'
                }
              />
              <Bar dataKey="totalCost" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
              <Bar dataKey="totalSaved" stackId="a" fill="#10b981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
