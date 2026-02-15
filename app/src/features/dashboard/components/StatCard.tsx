import { Card, CardContent } from '@/components/ui/Card'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string
  change?: number
  subtitle?: string
}

export function StatCard({ title, value, change, subtitle }: StatCardProps) {
  return (
    <Card>
      <CardContent className="py-5">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
        {change !== undefined && (
          <div className={cn('mt-1 flex items-center gap-1 text-sm font-medium', change <= 0 ? 'text-green-600' : 'text-red-600')}>
            {change <= 0 ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
            {change >= 0 ? '+' : ''}{change.toFixed(1)}% vs last month
          </div>
        )}
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </CardContent>
    </Card>
  )
}
