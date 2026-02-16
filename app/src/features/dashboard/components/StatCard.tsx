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
        variant === 'danger' && 'border-l-4 border-l-rose-500',
      )}
    >
      <CardContent className="py-6">
        <div className="flex items-center gap-2">
          {icon}
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
        </div>
        <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
        {change !== undefined && (
          <div className={cn('mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold', change <= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700')}>
            {change <= 0 ? <TrendingDown className="h-3.5 w-3.5 text-emerald-600" /> : <TrendingUp className="h-3.5 w-3.5 text-rose-600" />}
            {change >= 0 ? '+' : ''}{change.toFixed(1)}% vs 지난달
          </div>
        )}
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </CardContent>
    </Card>
  )
}
