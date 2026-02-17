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
          'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400': variant === 'default',
          'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 ring-1 ring-inset ring-emerald-600/20': variant === 'success',
          'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 ring-1 ring-inset ring-amber-600/20': variant === 'warning',
          'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 ring-1 ring-inset ring-rose-600/20': variant === 'danger',
          'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 ring-1 ring-inset ring-indigo-600/20': variant === 'info',
        },
        className
      )}
    >
      {children}
    </span>
  )
}
