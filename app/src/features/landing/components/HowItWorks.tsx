import { steps } from '../data/landing-data'

export function HowItWorks() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">이용 방법</h2>
          <p className="mt-4 text-lg text-gray-600">
            한 줄만 변경. 새 종속성 없음. 즉시 절감.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-12 md:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step.title} className="relative text-center">
              {index < steps.length - 1 && (
                <div className="absolute right-0 top-6 hidden w-full translate-x-1/2 border-t-2 border-dashed border-gray-200 md:block" />
              )}
              <div className="relative mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
                {step.number}
              </div>
              <step.icon className="mx-auto mt-4 h-8 w-8 text-gray-400" />
              <h3 className="mt-4 text-xl font-semibold text-gray-900">
                {step.title}
              </h3>
              <p className="mt-2 text-gray-600">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
