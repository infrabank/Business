import Link from 'next/link'
import { ArrowRight, CheckCircle, Zap, TrendingUp, TrendingDown } from 'lucide-react'

function DashboardMockup() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-4 py-2.5">
        <div className="flex gap-1.5">
          <div className="h-3 w-3 rounded-full bg-red-400" />
          <div className="h-3 w-3 rounded-full bg-yellow-400" />
          <div className="h-3 w-3 rounded-full bg-green-400" />
        </div>
        <div className="ml-2 flex-1 rounded-md bg-gray-200/70 px-3 py-1 text-center text-xs text-gray-400">
          app.llmcost.io/dashboard
        </div>
      </div>

      <div className="p-4 lg:p-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
            <p className="text-[10px] font-medium text-gray-400 uppercase">Total Cost</p>
            <p className="mt-1 text-lg font-bold text-gray-900">$2,847</p>
            <div className="mt-1 flex items-center gap-1">
              <TrendingDown className="h-3 w-3 text-green-500" />
              <span className="text-[10px] font-medium text-green-600">-12.3%</span>
            </div>
          </div>
          <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
            <p className="text-[10px] font-medium text-gray-400 uppercase">Tokens Used</p>
            <p className="mt-1 text-lg font-bold text-gray-900">14.2M</p>
            <div className="mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-blue-500" />
              <span className="text-[10px] font-medium text-blue-600">+8.1%</span>
            </div>
          </div>
          <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
            <p className="text-[10px] font-medium text-gray-400 uppercase">Budget</p>
            <p className="mt-1 text-lg font-bold text-gray-900">71%</p>
            <div className="mt-1 h-1.5 w-full rounded-full bg-gray-100">
              <div className="h-1.5 rounded-full bg-blue-500" style={{ width: '71%' }} />
            </div>
          </div>
          <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
            <p className="text-[10px] font-medium text-gray-400 uppercase">Projected</p>
            <p className="mt-1 text-lg font-bold text-gray-900">$3,420</p>
            <p className="mt-1 text-[10px] text-gray-400">15d remaining</p>
          </div>
        </div>

        {/* Chart area */}
        <div className="mt-4 rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-700">Daily Cost (Last 30 Days)</p>
            <div className="flex gap-3 text-[10px] text-gray-400">
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-blue-500" />Current</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-gray-300" />Previous</span>
            </div>
          </div>
          {/* SVG chart mockup */}
          <div className="relative h-28 lg:h-36">
            <svg viewBox="0 0 400 120" className="h-full w-full" preserveAspectRatio="none">
              {/* Grid lines */}
              <line x1="0" y1="30" x2="400" y2="30" stroke="#f3f4f6" strokeWidth="1" />
              <line x1="0" y1="60" x2="400" y2="60" stroke="#f3f4f6" strokeWidth="1" />
              <line x1="0" y1="90" x2="400" y2="90" stroke="#f3f4f6" strokeWidth="1" />
              {/* Previous period line */}
              <polyline
                points="0,70 30,65 60,75 90,60 120,68 150,72 180,55 210,62 240,58 270,65 300,60 330,68 360,55 400,62"
                fill="none" stroke="#d1d5db" strokeWidth="2" strokeDasharray="4,4"
              />
              {/* Current period area */}
              <path
                d="M0,80 30,55 60,65 90,40 120,50 150,60 180,35 210,45 240,30 270,42 300,38 330,48 360,25 400,35 L400,120 L0,120 Z"
                fill="url(#blueGradient)" opacity="0.15"
              />
              {/* Current period line */}
              <polyline
                points="0,80 30,55 60,65 90,40 120,50 150,60 180,35 210,45 240,30 270,42 300,38 330,48 360,25 400,35"
                fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              />
              <defs>
                <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* Bottom row: providers + tips */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
            <p className="mb-2 text-xs font-semibold text-gray-700">By Provider</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="flex-1 text-[11px] text-gray-600">OpenAI</span>
                <span className="text-[11px] font-medium text-gray-900">$1,580</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                <span className="flex-1 text-[11px] text-gray-600">Anthropic</span>
                <span className="text-[11px] font-medium text-gray-900">$890</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                <span className="flex-1 text-[11px] text-gray-600">Google</span>
                <span className="text-[11px] font-medium text-gray-900">$377</span>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
            <p className="mb-2 text-xs font-semibold text-gray-700">Optimization Tips</p>
            <div className="space-y-1.5">
              <div className="rounded bg-green-50 px-2 py-1.5">
                <p className="text-[10px] font-medium text-green-800">Switch GPT-4o to GPT-4o-mini</p>
                <p className="text-[10px] text-green-600">Save ~$420/mo</p>
              </div>
              <div className="rounded bg-blue-50 px-2 py-1.5">
                <p className="text-[10px] font-medium text-blue-800">Enable prompt caching</p>
                <p className="text-[10px] text-blue-600">Save ~$180/mo</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

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
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-base font-medium text-white transition-all duration-200 hover:scale-[1.02] hover:bg-blue-700 hover:shadow-lg"
        >
          Start Free <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href="/pricing"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-6 py-3 text-base font-medium text-gray-700 transition-all duration-200 hover:bg-gray-50 hover:shadow-md"
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

      <div className="mx-auto mt-12 max-w-4xl">
        <DashboardMockup />
      </div>
    </section>
  )
}
