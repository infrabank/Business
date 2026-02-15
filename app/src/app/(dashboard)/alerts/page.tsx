'use client'

import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Bell, CheckCircle } from 'lucide-react'

const mockAlerts = [
  { id: '1', type: 'budget_warning', title: 'Production budget at 61%', message: 'Production project has used 61.4% of the $3,000 monthly budget.', isRead: false, sentAt: '10 minutes ago' },
  { id: '2', type: 'optimization', title: 'Cost optimization available', message: 'Switching gpt-4o to gpt-4o-mini for simple tasks could save ~$230/month.', isRead: false, sentAt: '1 hour ago' },
  { id: '3', type: 'anomaly', title: 'Unusual spending detected', message: 'API usage spiked 340% compared to the average for Wednesday.', isRead: true, sentAt: '2 days ago' },
  { id: '4', type: 'budget_exceeded', title: 'Testing budget exceeded', message: 'Testing project exceeded the $500 monthly budget. Current spend: $523.40.', isRead: true, sentAt: '5 days ago' },
]

const typeVariant: Record<string, 'warning' | 'info' | 'danger' | 'default'> = {
  budget_warning: 'warning',
  budget_exceeded: 'danger',
  optimization: 'info',
  anomaly: 'warning',
}

export default function AlertsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alerts</h1>
          <p className="text-gray-500">Notifications and warnings</p>
        </div>
        <Button variant="outline" size="sm">
          <CheckCircle className="mr-2 h-4 w-4" /> Mark all read
        </Button>
      </div>

      <div className="space-y-3">
        {mockAlerts.map((a) => (
          <Card key={a.id} className={a.isRead ? 'opacity-60' : ''}>
            <CardContent className="flex items-start gap-3 py-4">
              <Bell className={`mt-0.5 h-5 w-5 ${a.isRead ? 'text-gray-300' : 'text-blue-500'}`} />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant={typeVariant[a.type] ?? 'default'}>{a.type.replace(/_/g, ' ')}</Badge>
                  <span className="font-medium text-gray-900">{a.title}</span>
                  {!a.isRead && <span className="h-2 w-2 rounded-full bg-blue-500" />}
                </div>
                <p className="mt-1 text-sm text-gray-600">{a.message}</p>
                <p className="mt-1 text-xs text-gray-400">{a.sentAt}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
