'use client'

import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface ModelBarChartProps {
  data: { model: string; cost: number; tokenCount: number }[]
}

export function ModelBarChart({ data }: ModelBarChartProps) {
  const chartData = data.map((d) => ({
    name: d.model,
    cost: Math.round(d.cost * 100) / 100,
  }))

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">비용 상위 모델</h3>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" className="dark:stroke-slate-700" />
              <XAxis type="number" tick={{ fontSize: 12, fill: '#94A3B8' }} tickFormatter={(v) => `$${v}`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#94A3B8' }} width={75} />
              <Tooltip
                formatter={(v) => [`$${Number(v).toFixed(2)}`, '비용']}
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
              <Bar dataKey="cost" fill="#4F46E5" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
