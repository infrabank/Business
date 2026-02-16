import { cn } from '@/lib/utils'

interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  children: React.ReactNode
  className?: string
}

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
        {
          'bg-slate-100 text-slate-600': variant === 'default',
          'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20': variant === 'success',
          'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20': variant === 'warning',
          'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20': variant === 'danger',
          'bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-600/20': variant === 'info',
        },
        className
      )}
    >
      {children}
    </span>
  )
}
