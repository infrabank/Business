'use client'

import { useState } from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import type { BreakdownItem } from '@/types/proxy-analytics'

interface Props {
  data: BreakdownItem[]
}

type SortKey = 'totalCost' | 'totalSaved' | 'requestCount' | 'avgLatencyMs' | 'cacheHitRate'

export function KeyBreakdownTable({ data }: Props) {
  const [sortBy, setSortBy] = useState<SortKey>('totalCost')
  const [sortDesc, setSortDesc] = useState(true)

  const sorted = [...data].sort((a, b) =>
    sortDesc ? b[sortBy] - a[sortBy] : a[sortBy] - b[sortBy]
  )

  const handleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortDesc(!sortDesc)
    } else {
      setSortBy(key)
      setSortDesc(true)
    }
  }

  const sortIcon = (key: SortKey) => {
    if (sortBy !== key) return ''
    return sortDesc ? ' \u2193' : ' \u2191'
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-gray-400 dark:text-slate-500">
          데이터가 없습니다
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">상세 분석</h3>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-slate-700 text-left text-xs font-medium uppercase text-gray-500 dark:text-slate-400">
              <th className="px-3 py-3">이름</th>
              <th className="cursor-pointer px-3 py-3" onClick={() => handleSort('totalCost')}>
                비용{sortIcon('totalCost')}
              </th>
              <th className="cursor-pointer px-3 py-3" onClick={() => handleSort('totalSaved')}>
                절감{sortIcon('totalSaved')}
              </th>
              <th className="cursor-pointer px-3 py-3" onClick={() => handleSort('requestCount')}>
                요청 수{sortIcon('requestCount')}
              </th>
              <th className="cursor-pointer px-3 py-3" onClick={() => handleSort('avgLatencyMs')}>
                평균 지연{sortIcon('avgLatencyMs')}
              </th>
              <th className="cursor-pointer px-3 py-3" onClick={() => handleSort('cacheHitRate')}>
                캐시 적중률{sortIcon('cacheHitRate')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
            {sorted.map((item) => (
              <tr key={item.name} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                <td className="px-3 py-3 font-medium text-gray-900 dark:text-slate-100">{item.name}</td>
                <td className="px-3 py-3 text-gray-700 dark:text-slate-300">${item.totalCost.toFixed(4)}</td>
                <td className="px-3 py-3 text-emerald-600 dark:text-emerald-400">${item.totalSaved.toFixed(4)}</td>
                <td className="px-3 py-3 text-gray-700 dark:text-slate-300">{item.requestCount.toLocaleString()}</td>
                <td className="px-3 py-3 text-gray-700 dark:text-slate-300">{item.avgLatencyMs}ms</td>
                <td className="px-3 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    item.cacheHitRate >= 50
                      ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300'
                      : item.cacheHitRate >= 20
                        ? 'bg-yellow-100 dark:bg-yellow-950/50 text-yellow-800 dark:text-yellow-300'
                        : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300'
                  }`}>
                    {item.cacheHitRate.toFixed(1)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}
