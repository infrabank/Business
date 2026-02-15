import { stats } from '../data/landing-data'

export function StatsSection() {
  return (
    <section className="bg-blue-600 py-16">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-4xl font-bold text-white">{stat.value}</p>
              <p className="mt-2 text-sm text-blue-100">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
