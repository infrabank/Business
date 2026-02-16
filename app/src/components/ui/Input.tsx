import { cn } from '@/lib/utils'
import { forwardRef, type InputHTMLAttributes, useId } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const generatedId = useId()
    const inputId = id || generatedId
    const errorId = `${inputId}-error`

    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-semibold text-slate-700">
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            'block w-full rounded-xl border bg-white px-4 py-2.5 text-sm shadow-sm transition-all duration-200',
            'placeholder:text-slate-300',
            error
              ? 'border-rose-300 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/10'
              : 'border-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/10',
            className
          )}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? errorId : undefined}
          {...props}
        />
        {error && (
          <p id={errorId} className="text-sm text-rose-500">
            {error}
          </p>
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'
