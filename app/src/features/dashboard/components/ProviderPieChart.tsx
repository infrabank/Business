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
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">프로바이더별</h3>
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
              <Tooltip
                formatter={(v) => `$${Number(v).toFixed(2)}`}
                contentStyle={{
                  borderRadius: '0.75rem',
                  border: '1px solid rgba(226, 232, 240, 0.6)',
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(4px)',
                  padding: '1rem',
                  boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)'
                }}
                wrapperClassName="dark:[&_.recharts-tooltip-wrapper]:!border-slate-700 dark:[&_.recharts-tooltip-wrapper]:!bg-slate-900/95"
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
