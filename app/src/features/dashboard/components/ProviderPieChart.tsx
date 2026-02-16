'use client'

import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { PROVIDER_COLORS, PROVIDER_LABELS } from '@/lib/constants'
import type { ProviderType } from '@/types'

interface ProviderPieChartProps {
  data: { type: ProviderType; cost: number }[]
}

export function ProviderPieChart({ data }: ProviderPieChartProps) {
  const chartData = data.map((d) => ({
    name: PROVIDER_LABELS[d.type] ?? d.type,
    value: Math.round(d.cost * 100) / 100,
    color: PROVIDER_COLORS[d.type] ?? '#6B7280',
  }))

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold text-gray-900">프로바이더별</h3>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} dataKey="value">
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => `$${Number(v).toFixed(2)}`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
