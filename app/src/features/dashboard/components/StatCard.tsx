import { Card, CardContent } from '@/components/ui/Card'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown } from 'lucide-react'
import type { ReactNode } from 'react'

interface StatCardProps {
  title: string
  value: string
  change?: number
  subtitle?: string
  variant?: 'default' | 'warning' | 'danger'
  icon?: ReactNode
}

export function StatCard({ title, value, change, subtitle, variant = 'default', icon }: StatCardProps) {
  return (
    <Card
      className={cn(
        variant === 'warning' && 'border-l-4 border-l-amber-400',
        variant === 'danger' && 'border-l-4 border-l-red-500',
      )}
    >
      <CardContent className="py-5">
        <div className="flex items-center gap-2">
          {icon}
          <p className="text-sm font-medium text-gray-500">{title}</p>
        </div>
        <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
        {change !== undefined && (
          <div className={cn('mt-1 flex items-center gap-1 text-sm font-medium', change <= 0 ? 'text-green-600' : 'text-red-600')}>
            {change <= 0 ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
            {change >= 0 ? '+' : ''}{change.toFixed(1)}% vs 지난달
          </div>
        )}
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </CardContent>
    </Card>
  )
}
