'use client'

import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Download, FileText, Calendar } from 'lucide-react'

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-500">Export cost data and generate reports</p>
        </div>
        <Button><Download className="mr-2 h-4 w-4" /> Export CSV</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[
          { title: 'January 2026', cost: '$3,215.82', date: '2026-01-31', status: 'Ready' },
          { title: 'February 2026 (Current)', cost: '$2,847.53', date: '2026-02-15', status: 'In Progress' },
        ].map((r) => (
          <Card key={r.title}>
            <CardContent className="py-5">
              <div className="flex items-center gap-2 text-gray-400">
                <Calendar className="h-4 w-4" />
                <span className="text-xs">{r.date}</span>
              </div>
              <h3 className="mt-2 font-semibold text-gray-900">{r.title}</h3>
              <p className="mt-1 text-2xl font-bold text-gray-900">{r.cost}</p>
              <div className="mt-4 flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <FileText className="mr-1 h-4 w-4" /> View
                </Button>
                <Button variant="ghost" size="sm">
                  <Download className="mr-1 h-4 w-4" /> CSV
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
