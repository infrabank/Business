'use client'

import { useT } from '@/lib/i18n'
import { companyLogos } from '../data/landing-data'

export function LogoBanner() {
  const t = useT()

  return (
    <section className="border-y border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 py-12">
      <div className="mx-auto max-w-6xl px-4 text-center">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          {t('logoBanner.title')}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-12 gap-y-4">
          {companyLogos.map((logo) => (
            <span
              key={logo.name}
              className="text-lg font-semibold text-slate-300 dark:text-slate-500"
            >
              {logo.name}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
