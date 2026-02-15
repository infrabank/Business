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
        <h3 className="text-lg font-semibold text-gray-900">Top Models by Cost</h3>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={75} />
              <Tooltip formatter={(v) => [`$${Number(v).toFixed(2)}`, 'Cost']} />
              <Bar dataKey="cost" fill="#3B82F6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
