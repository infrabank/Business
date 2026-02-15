import Link from 'next/link'
import { ArrowRight, CheckCircle, Zap } from 'lucide-react'

export function HeroSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 text-center">
      <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-700">
        <Zap className="h-4 w-4" /> Stop overspending on AI
      </div>

      <h1 className="mx-auto max-w-4xl text-5xl font-bold leading-tight tracking-tight text-gray-900 lg:text-6xl">
        Take control of your{' '}
        <span className="text-blue-600">LLM costs</span>
      </h1>

      <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
        One dashboard for all your AI spending. Track, optimize, and budget
        across OpenAI, Anthropic, and Google — so you never overpay again.
      </p>

      <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-base font-medium text-white hover:bg-blue-700"
        >
          Start Free <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href="/pricing"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-6 py-3 text-base font-medium text-gray-700 hover:bg-gray-50"
        >
          View Pricing
        </Link>
      </div>

      <div className="mt-6 flex items-center justify-center gap-6 text-sm text-gray-500">
        <span className="inline-flex items-center gap-1.5">
          <CheckCircle className="h-4 w-4 text-green-500" /> No credit card required
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CheckCircle className="h-4 w-4 text-green-500" /> Setup in 2 minutes
        </span>
      </div>

      <div className="mx-auto mt-12 max-w-4xl overflow-hidden rounded-xl border border-gray-200 bg-gray-100 shadow-lg">
        <div className="flex h-64 items-center justify-center text-gray-400 lg:h-96">
          <div className="text-center">
            <div className="text-5xl">📊</div>
            <p className="mt-3 text-sm font-medium">Dashboard Preview</p>
          </div>
        </div>
      </div>
    </section>
  )
}
