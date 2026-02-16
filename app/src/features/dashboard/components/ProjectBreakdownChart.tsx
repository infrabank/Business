'use client'

import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
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
          <FolderOpen className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-2 text-sm text-gray-500">프로젝트별 세부 분석을 위해 비용을 할당하세요</p>
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
        <h3 className="text-lg font-semibold text-gray-900">프로젝트별 비용</h3>
      </CardHeader>
      <CardContent>
        <div style={{ height: Math.max(200, chartData.length * 40) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => [`$${Number(v).toFixed(2)}`, '비용']} />
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
