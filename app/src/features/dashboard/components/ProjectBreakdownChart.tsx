'use client'

import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts'
import { FolderOpen } from 'lucide-react'
import Link from 'next/link'
import type { DashboardSummary } from '@/types/dashboard'

interface ProjectBreakdownChartProps {
  data: DashboardSummary['byProject']
}

export function ProjectBreakdownChart({ data }: ProjectBreakdownChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <FolderOpen className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">프로젝트별 세부 분석을 위해 비용을 할당하세요</p>
          <Link href="/projects" className="mt-3 inline-block">
            <Button size="sm" variant="outline">프로젝트 관리</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  const chartData = data.slice(0, 10)

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">프로젝트별 비용</h3>
      </CardHeader>
      <CardContent>
        <div style={{ height: Math.max(200, chartData.length * 40) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" className="dark:stroke-slate-700" />
              <XAxis type="number" tick={{ fontSize: 12, fill: '#94A3B8' }} tickFormatter={(v) => `$${v}`} />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12, fill: '#94A3B8' }} />
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
              <Bar dataKey="cost" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
