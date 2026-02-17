'use client'

import { useEffect } from 'react'
import { create } from 'zustand'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  message: string
}

interface ToastStore {
  toasts: Toast[]
  addToast: (type: ToastType, message: string) => void
  removeToast: (id: string) => void
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (type, message) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
    set((s) => ({ toasts: [...s.toasts, { id, type, message }] }))
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

export function toast(type: ToastType, message: string) {
  useToastStore.getState().addToast(type, message)
}

const ICONS: Record<ToastType, React.ElementType> = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
}

const STYLES: Record<ToastType, string> = {
  success: 'border-emerald-200/60 bg-emerald-50/90 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/90 dark:text-emerald-300',
  error: 'border-rose-200/60 bg-rose-50/90 text-rose-800 dark:border-rose-800/60 dark:bg-rose-950/90 dark:text-rose-300',
  warning: 'border-amber-200/60 bg-amber-50/90 text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/90 dark:text-amber-300',
  info: 'border-indigo-200/60 bg-indigo-50/90 text-indigo-800 dark:border-indigo-800/60 dark:bg-indigo-950/90 dark:text-indigo-300',
}

const ICON_STYLES: Record<ToastType, string> = {
  success: 'text-emerald-500',
  error: 'text-rose-500',
  warning: 'text-amber-500',
  info: 'text-indigo-500',
}

function ToastItem({ toast: t, onClose }: { toast: Toast; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000)
    return () => clearTimeout(timer)
  }, [onClose])

  const Icon = ICONS[t.type]

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn('flex items-center gap-3 rounded-2xl border px-5 py-4 shadow-xl backdrop-blur-sm animate-in slide-in-from-top-2 fade-in duration-300', STYLES[t.type])}
    >
      <Icon className={cn('h-5 w-5 shrink-0', ICON_STYLES[t.type])} aria-hidden="true" />
      <p className="flex-1 text-sm font-medium">{t.message}</p>
      <button
        onClick={onClose}
        className="shrink-0 rounded-lg p-1 opacity-50 hover:opacity-100 transition-opacity"
        aria-label="Close notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div className="fixed right-6 top-6 z-[100] flex w-96 flex-col gap-3">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onClose={() => removeToast(t.id)} />
      ))}
    </div>
  )
}
