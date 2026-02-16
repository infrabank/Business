'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Zap, Menu, X } from 'lucide-react'
import { Footer } from '@/components/layout/Footer'
import { HeroSection } from '@/features/landing/components/HeroSection'
import { LogoBanner } from '@/features/landing/components/LogoBanner'
import { FeaturesShowcase } from '@/features/landing/components/FeaturesShowcase'
import { CostSavingsDemo } from '@/features/landing/components/CostSavingsDemo'
import { HowItWorks } from '@/features/landing/components/HowItWorks'
import { StatsSection } from '@/features/landing/components/StatsSection'
import { Testimonials } from '@/features/landing/components/Testimonials'
import { FaqSection } from '@/features/landing/components/FaqSection'
import { FinalCta } from '@/features/landing/components/FinalCta'

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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
          <div className="hidden items-center gap-3 sm:flex">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:scale-[1.02] hover:bg-blue-700 hover:shadow-lg"
            >
              Start Free
            </Link>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="sm:hidden rounded-lg p-2 text-gray-600 hover:text-gray-900"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="border-t border-gray-100 bg-white sm:hidden">
            <div className="flex flex-col px-4 py-4">
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="py-3 text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                Features
              </a>
              <Link
                href="/pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="py-3 text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                Pricing
              </Link>
              <a
                href="#faq"
                onClick={() => setMobileMenuOpen(false)}
                className="py-3 text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                FAQ
              </a>
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="mt-4 py-3 text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                onClick={() => setMobileMenuOpen(false)}
                className="mt-2 rounded-lg bg-blue-600 px-4 py-3 text-center text-sm font-medium text-white transition-all duration-200 hover:scale-[1.02] hover:bg-blue-700 hover:shadow-lg"
              >
                Start Free
              </Link>
            </div>
          </div>
        )}
      </nav>

      <main>
        <HeroSection />
        <LogoBanner />
        <FeaturesShowcase />
        <CostSavingsDemo />
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
