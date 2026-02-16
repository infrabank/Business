import { companyLogos } from '../data/landing-data'

export function LogoBanner() {
  return (
    <section className="border-y border-slate-100 bg-white py-12">
      <div className="mx-auto max-w-6xl px-4 text-center">
        <p className="text-sm font-medium text-slate-500">
          전 세계 <span className="font-semibold text-slate-700">1,000+</span> 팀의 비용을 절감하고 있습니다
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-12 gap-y-4">
          {companyLogos.map((logo) => (
            <span
              key={logo.name}
              className="text-lg font-semibold text-slate-300"
            >
              {logo.name}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
