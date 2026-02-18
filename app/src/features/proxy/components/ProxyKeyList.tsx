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
          <p className="py-8 text-center text-gray-400 dark:text-slate-500">
            프록시 키가 없습니다. 키를 생성하여 시작하세요.
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
                      {key.isActive ? '활성' : '비활성'}
                    </Badge>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-sm text-gray-500 dark:text-slate-400">
                    <code className="font-mono">{key.keyPrefix}</code>
                    <span>{PROVIDER_LABELS[key.providerType] || key.providerType}</span>
                    <span>{key.requestCount.toLocaleString()} 요청</span>
                    {key.budgetLimit && <span>예산: ${key.budgetLimit}/월</span>}
                    {key.rateLimit && <span>제한: {key.rateLimit}/분</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onToggle(key.id, !key.isActive)}
                >
                  {key.isActive ? '비활성화' : '활성화'}
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    if (confirm('이 프록시 키를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
                      onDelete(key.id)
                    }
                  }}
                >
                  삭제
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
