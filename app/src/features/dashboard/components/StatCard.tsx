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
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{title}</p>
        </div>
        <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
        {change !== undefined && (
          <div className={cn('mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold', change <= 0 ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400')}>
            {change <= 0 ? <TrendingDown className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> : <TrendingUp className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />}
            {change >= 0 ? '+' : ''}{change.toFixed(1)}% vs 지난달
          </div>
        )}
        {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </CardContent>
    </Card>
  )
}
