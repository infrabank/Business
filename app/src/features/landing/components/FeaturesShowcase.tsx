import { features } from '../data/landing-data'

export function FeaturesShowcase() {
  return (
    <section id="features" className="bg-white py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center">
          <h2 className="text-4xl font-bold tracking-tight text-slate-900">
            모든 비용 절감은 자동으로
          </h2>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
            프록시가 앱과 LLM 프로바이더 사이에 위치합니다. SDK 변경 없이, 새 라이브러리 없이 — 그저 절감만.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-slate-200/60 bg-white p-8 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1"
            >
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50">
                <feature.icon className="h-7 w-7 text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                {feature.title}
              </h3>
              <p className="mt-2 text-slate-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
