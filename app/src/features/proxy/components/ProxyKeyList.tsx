'use client'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { PROVIDER_LABELS, PROVIDER_COLORS } from '@/lib/constants'
import type { ProxyKeyDisplay } from '@/types/proxy'

interface ProxyKeyListProps {
  keys: ProxyKeyDisplay[]
  onToggle: (id: string, isActive: boolean) => void
  onDelete: (id: string) => void
}

export function ProxyKeyList({ keys, onToggle, onDelete }: ProxyKeyListProps) {
  if (keys.length === 0) {
    return (
      <Card>
        <CardContent>
          <p className="py-8 text-center text-gray-400">
            No proxy keys yet. Create one to get started.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {keys.map((key) => (
        <Card key={key.id}>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: PROVIDER_COLORS[key.providerType] || '#6B7280' }}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{key.name}</span>
                    <Badge variant={key.isActive ? 'default' : 'danger'}>
                      {key.isActive ? 'Active' : 'Disabled'}
                    </Badge>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
                    <code className="font-mono">{key.keyPrefix}</code>
                    <span>{PROVIDER_LABELS[key.providerType] || key.providerType}</span>
                    <span>{key.requestCount.toLocaleString()} requests</span>
                    {key.budgetLimit && <span>Budget: ${key.budgetLimit}/mo</span>}
                    {key.rateLimit && <span>Rate: {key.rateLimit}/min</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onToggle(key.id, !key.isActive)}
                >
                  {key.isActive ? 'Disable' : 'Enable'}
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    if (confirm('Delete this proxy key? This cannot be undone.')) {
                      onDelete(key.id)
                    }
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
