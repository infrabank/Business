import Link from 'next/link'
import { Zap, BarChart3, Shield, Bell, ArrowRight, CheckCircle } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2 font-bold text-blue-600">
            <Zap className="h-6 w-6" />
            <span className="text-lg">LLM Cost Manager</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">Log in</Link>
            <Link href="/signup" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Start Free</Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-20 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-700">
          <Zap className="h-4 w-4" /> Stop overspending on AI
        </div>
        <h1 className="mx-auto max-w-3xl text-5xl font-bold leading-tight tracking-tight text-gray-900">
          Take control of your <span className="text-blue-600">LLM costs</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
          One dashboard for all your AI spending. Track OpenAI, Anthropic, and Google AI costs in real-time.
          Get optimization tips and never exceed your budget.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link href="/signup" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-base font-medium text-white hover:bg-blue-700">
            Get Started Free <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/pricing" className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-6 py-3 text-base font-medium text-gray-700 hover:bg-gray-50">
            View Pricing
          </Link>
        </div>
        <p className="mt-4 text-sm text-gray-500">Free plan available. No credit card required.</p>
      </section>

      <section className="border-t border-gray-100 bg-gray-50 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-bold text-gray-900">Everything you need to manage AI costs</h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              { icon: BarChart3, title: 'Unified Dashboard', desc: 'See all your LLM spending across OpenAI, Anthropic, and Google in one view. Track costs by project, team, or model.' },
              { icon: Bell, title: 'Budget Alerts', desc: 'Set monthly budgets and get notified before you exceed them. Customizable thresholds at 50%, 80%, and 100%.' },
              { icon: Shield, title: 'Cost Optimization', desc: 'AI-powered recommendations to reduce spending. Identify model downgrades, unused keys, and batch opportunities.' },
            ].map((f) => (
              <div key={f.title} className="rounded-xl border border-gray-200 bg-white p-8">
                <f.icon className="h-10 w-10 text-blue-600" />
                <h3 className="mt-4 text-xl font-semibold text-gray-900">{f.title}</h3>
                <p className="mt-2 text-gray-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-900">Simple, transparent pricing</h2>
          <p className="mt-4 text-gray-600">Start free, upgrade when you need more.</p>
          <div className="mt-12 grid gap-6 md:grid-cols-4">
            {[
              { plan: 'Free', price: '$0', features: ['1 provider', '7-day history', 'Basic dashboard'] },
              { plan: 'Starter', price: '$29', features: ['3 providers', '30-day history', 'Budget alerts'] },
              { plan: 'Pro', price: '$99', features: ['Unlimited providers', '1-year history', 'Team management', 'CSV export'], popular: true },
              { plan: 'Enterprise', price: '$299', features: ['Everything in Pro', 'SSO/SAML', 'Audit log', 'Dedicated support'] },
            ].map((p) => (
              <div key={p.plan} className={`rounded-xl border p-6 text-left ${'popular' in p && p.popular ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200'}`}>
                {'popular' in p && p.popular && <span className="mb-2 inline-block rounded-full bg-blue-100 px-3 py-0.5 text-xs font-medium text-blue-700">Most Popular</span>}
                <h3 className="text-lg font-semibold text-gray-900">{p.plan}</h3>
                <p className="mt-2 text-3xl font-bold text-gray-900">{p.price}<span className="text-base font-normal text-gray-500">/mo</span></p>
                <ul className="mt-6 space-y-3">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-green-500" /> {f}
                    </li>
                  ))}
                </ul>
                <Link href="/signup" className={`mt-6 block rounded-lg px-4 py-2 text-center text-sm font-medium ${'popular' in p && p.popular ? 'bg-blue-600 text-white hover:bg-blue-700' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-200 bg-white py-8">
        <p className="text-center text-sm text-gray-500">&copy; {new Date().getFullYear()} LLM Cost Manager. All rights reserved.</p>
      </footer>
    </div>
  )
}
