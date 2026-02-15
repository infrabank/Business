import { features } from '../data/landing-data'

export function FeaturesShowcase() {
  return (
    <section id="features" className="bg-gray-50 py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">
            Everything you need to manage AI costs
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Stop guessing. Start optimizing.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-gray-200 bg-white p-8 transition hover:shadow-md"
            >
              <feature.icon className="h-10 w-10 text-blue-600" />
              <h3 className="mt-4 text-xl font-semibold text-gray-900">
                {feature.title}
              </h3>
              <p className="mt-2 text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
