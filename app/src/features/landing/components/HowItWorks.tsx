'use client'

import { useT, useLandingData } from '@/lib/i18n'
import { Key, Zap, TrendingDown } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const icons: LucideIcon[] = [Key, Zap, TrendingDown]

export function HowItWorks() {
  const t = useT()
  const data = useLandingData()

  return (
    <section className="py-24 bg-white dark:bg-slate-900">
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center">
          <h2 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{t('howItWorks.title')}</h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
            {t('howItWorks.subtitle')}
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-12 md:grid-cols-3">
          {data.steps.map((step, index) => {
            const Icon = icons[index]
            return (
              <div key={step.title} className="relative text-center">
                {index < data.steps.length - 1 && (
                  <div className="absolute right-0 top-6 hidden w-full translate-x-1/2 border-t-2 border-dashed border-slate-200 dark:border-slate-700 md:block" />
                )}
                <div className="relative mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 text-lg font-bold text-white shadow-md">
                  {index + 1}
                </div>
                <div className="mx-auto mt-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/50">
                  <Icon className="h-6 w-6 text-indigo-600" />
                </div>
                <h3 className="mt-4 text-xl font-bold text-slate-900 dark:text-slate-100">
                  {step.title}
                </h3>
                <p className="mt-2 text-slate-600 dark:text-slate-400">{step.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
