import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export function FinalCta() {
  return (
    <section className="bg-gray-900 py-20">
      <div className="mx-auto max-w-3xl px-4 text-center">
        <h2 className="text-3xl font-bold text-white">
          Ready to take control of your AI costs?
        </h2>
        <p className="mt-4 text-lg text-gray-400">
          Join thousands of teams already saving money on their LLM spending.
        </p>
        <Link
          href="/signup"
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-base font-medium text-gray-900 transition-all duration-200 hover:scale-[1.02] hover:bg-gray-100 hover:shadow-lg"
        >
          Start Free Today <ArrowRight className="h-4 w-4" />
        </Link>
        <p className="mt-4 text-sm text-gray-500">
          Free plan available &middot; No credit card needed
        </p>
      </div>
    </section>
  )
}
