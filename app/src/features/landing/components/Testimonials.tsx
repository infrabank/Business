import { testimonials } from '../data/landing-data'

export function Testimonials() {
  return (
    <section className="bg-slate-50 dark:bg-slate-800/50 py-24">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="text-center text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          실제 팀들의 실제 절감
        </h2>

        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900 p-8 shadow-sm transition-all duration-300 hover:shadow-md"
            >
              <p className="text-slate-700 dark:text-slate-300 italic leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
              <div className="mt-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                  {t.initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {t.name}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {t.role}, {t.company}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
