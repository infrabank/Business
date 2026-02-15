import Link from 'next/link'
import { Zap } from 'lucide-react'
import { Footer } from '@/components/layout/Footer'
import { HeroSection } from '@/features/landing/components/HeroSection'
import { LogoBanner } from '@/features/landing/components/LogoBanner'
import { FeaturesShowcase } from '@/features/landing/components/FeaturesShowcase'
import { HowItWorks } from '@/features/landing/components/HowItWorks'
import { StatsSection } from '@/features/landing/components/StatsSection'
import { Testimonials } from '@/features/landing/components/Testimonials'
import { FaqSection } from '@/features/landing/components/FaqSection'
import { FinalCta } from '@/features/landing/components/FinalCta'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'LLM Cost Manager - Track & Optimize Your AI Spending',
  description:
    'One dashboard for all your LLM costs. Track OpenAI, Anthropic, and Google AI spending in real-time. Get optimization tips and never exceed your budget.',
  openGraph: {
    title: 'LLM Cost Manager - Track & Optimize Your AI Spending',
    description:
      'One dashboard for all your LLM costs. Track, optimize, and budget across OpenAI, Anthropic, and Google.',
    type: 'website',
  },
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2 font-bold text-blue-600">
            <Zap className="h-6 w-6" />
            <span className="text-lg">LLM Cost Manager</span>
          </div>
          <div className="hidden items-center gap-6 sm:flex">
            <a href="#features" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Features
            </a>
            <Link href="/pricing" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Pricing
            </Link>
            <a href="#faq" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              FAQ
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Start Free
            </Link>
          </div>
        </div>
      </nav>

      <main>
        <HeroSection />
        <LogoBanner />
        <FeaturesShowcase />
        <HowItWorks />
        <StatsSection />
        <Testimonials />
        <FaqSection />
        <FinalCta />
      </main>

      <Footer />
    </div>
  )
}
