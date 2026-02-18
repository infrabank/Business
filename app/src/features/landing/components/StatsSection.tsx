'use client'

import { useLandingData } from '@/lib/i18n'

export function StatsSection() {
  const data = useLandingData()

  return (
    <section className="bg-gradient-to-r from-indigo-600 to-violet-600 py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {data.stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-5xl font-bold text-white">{stat.value}</p>
              <p className="mt-2 text-sm text-indigo-100">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
