import { companyLogos } from '../data/landing-data'

export function LogoBanner() {
  return (
    <section className="border-y border-gray-100 bg-white py-12">
      <div className="mx-auto max-w-6xl px-4 text-center">
        <p className="text-sm font-medium text-gray-500">
          Saving money for <span className="font-semibold text-gray-700">1,000+</span> teams worldwide
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-12 gap-y-4">
          {companyLogos.map((logo) => (
            <span
              key={logo.name}
              className="text-lg font-semibold text-gray-300"
            >
              {logo.name}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
