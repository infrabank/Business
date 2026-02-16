'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Download, FileText, Calendar } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { useSession } from '@/hooks/useSession'

export default function ReportsPage() {
  const { isReady } = useSession()
  const orgId = useAppStore((s) => s.currentOrgId)
  const [exporting, setExporting] = useState<string | null>(null)

  const handleExport = async (period?: string) => {
    if (!orgId) return
    const key = period || 'all'
    setExporting(key)
    try {
      const params = new URLSearchParams({ orgId })
      if (period) params.set('period', period)
      const res = await fetch(`/api/reports/export?${params}`)
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `usage-report${period ? `-${period}` : ''}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // Silent fail for now
    } finally {
      setExporting(null)
    }
  }

  const reports = [
    { title: 'January 2026', cost: '$3,215.82', date: '2026-01-31', period: '2026-01', status: 'Ready' },
    { title: 'February 2026 (Current)', cost: '$2,847.53', date: '2026-02-15', period: '2026-02', status: 'In Progress' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-500">Export cost data and generate reports</p>
        </div>
        <Button onClick={() => handleExport()} disabled={exporting === 'all'}>
          <Download className="mr-2 h-4 w-4" />
          {exporting === 'all' ? 'Exporting...' : 'Export CSV'}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {reports.map((r) => (
          <Card key={r.title}>
            <CardContent className="py-5">
              <div className="flex items-center gap-2 text-gray-400">
                <Calendar className="h-4 w-4" />
                <span className="text-xs">{r.date}</span>
              </div>
              <h3 className="mt-2 font-semibold text-gray-900">{r.title}</h3>
              <p className="mt-1 text-2xl font-bold text-gray-900">{r.cost}</p>
              <div className="mt-3 flex items-center gap-2">
                <Badge variant={r.status === 'Ready' ? 'success' : 'info'}>{r.status}</Badge>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => handleExport(r.period)} disabled={exporting === r.period}>
                  <Download className="mr-1 h-4 w-4" />
                  {exporting === r.period ? 'Exporting...' : 'CSV'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
