'use client'

import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { ChartDataPoint } from '@/types/dashboard'

interface CostTrendChartProps {
  data: ChartDataPoint[]
  title?: string
  showComparison?: boolean
}

function CustomTooltip({
  active,
  payload,
  label,
  showComparison,
}: {
  active?: boolean
  payload?: { value?: number; dataKey?: string; color?: string }[]
  label?: string
  showComparison?: boolean
}) {
  if (!active || !payload?.length) return null

  const current = payload.find((p) => p.dataKey === 'cost')
  const previous = payload.find((p) => p.dataKey === 'previousCost')

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
      <p className="mb-1 text-sm font-medium text-gray-600">날짜: {label}</p>
      <p className="text-sm font-semibold text-blue-600">
        현재: ${Number(current?.value ?? 0).toFixed(2)}
      </p>
      {showComparison && previous?.value != null && (
        <p className="text-sm text-gray-500">
          이전: ${Number(previous.value).toFixed(2)}
          {current?.value != null && previous.value > 0 && (
            <span className={current.value > previous.value ? ' text-red-500' : ' text-green-500'}>
              {' '}({current.value > previous.value ? '+' : ''}
              {(((current.value - previous.value) / previous.value) * 100).toFixed(1)}%)
            </span>
          )}
        </p>
      )}
    </div>
  )
}

export function CostTrendChart({ data, title = '비용 추이', showComparison = false }: CostTrendChartProps) {
  const hasComparison = showComparison && data.some((d) => d.previousCost != null)

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
              <Tooltip content={<CustomTooltip showComparison={hasComparison} />} />
              {hasComparison && <Legend />}
              <Area
                type="monotone"
                dataKey="cost"
                name="현재 기간"
                stroke="#3B82F6"
                strokeWidth={2}
                fill="url(#colorCost)"
              />
              {hasComparison && (
                <Line
                  type="monotone"
                  dataKey="previousCost"
                  name="이전 기간"
                  stroke="#9CA3AF"
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                  dot={false}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
