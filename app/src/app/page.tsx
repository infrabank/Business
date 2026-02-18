'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Zap, Menu, X } from 'lucide-react'
import { useT, useLocale } from '@/lib/i18n'
import { Footer } from '@/components/layout/Footer'
import { HeroSection } from '@/features/landing/components/HeroSection'
import { LogoBanner } from '@/features/landing/components/LogoBanner'
import { FeaturesShowcase } from '@/features/landing/components/FeaturesShowcase'
import { CostSavingsDemo } from '@/features/landing/components/CostSavingsDemo'
import { CodeSnippet } from '@/features/landing/components/CodeSnippet'
import { CompetitorComparison } from '@/features/landing/components/CompetitorComparison'
import { HowItWorks } from '@/features/landing/components/HowItWorks'
import { StatsSection } from '@/features/landing/components/StatsSection'
import { Testimonials } from '@/features/landing/components/Testimonials'
import { FaqSection } from '@/features/landing/components/FaqSection'
import { FinalCta } from '@/features/landing/components/FinalCta'

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const t = useT()
  const { locale, setLocale } = useLocale()

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      <nav className="sticky top-0 z-50 border-b border-slate-200/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2 font-bold">
            <Zap className="h-6 w-6 text-indigo-600" />
            <span className="text-lg text-gradient">LLM Cost Manager</span>
          </div>
          <div className="hidden items-center gap-6 sm:flex">
            <a href="#features" className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
              {t('nav.features')}
            </a>
            <a href="#compare" className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
              {t('nav.compare')}
            </a>
            <Link href="/pricing" className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
              {t('nav.pricing')}
            </Link>
            <a href="#faq" className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
              {t('nav.faq')}
            </a>
          </div>
          <div className="hidden items-center gap-3 sm:flex">
            <button
              onClick={() => setLocale(locale === 'ko' ? 'en' : 'ko')}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {locale === 'ko' ? 'EN' : '한국어'}
            </button>
            <Link
              href="/login"
              className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
            >
              {t('nav.login')}
            </Link>
            <Link
              href="/signup"
              className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:shadow-lg hover:brightness-110"
            >
              {t('nav.getStarted')}
            </Link>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="sm:hidden rounded-lg p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="border-t border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl sm:hidden">
            <div className="flex flex-col px-4 py-4">
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="py-3 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              >
                {t('nav.features')}
              </a>
              <a
                href="#compare"
                onClick={() => setMobileMenuOpen(false)}
                className="py-3 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              >
                {t('nav.compare')}
              </a>
              <Link
                href="/pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="py-3 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              >
                {t('nav.pricing')}
              </Link>
              <a
                href="#faq"
                onClick={() => setMobileMenuOpen(false)}
                className="py-3 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              >
                {t('nav.faq')}
              </a>
              <button
                onClick={() => { setLocale(locale === 'ko' ? 'en' : 'ko'); setMobileMenuOpen(false) }}
                className="mt-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              >
                {locale === 'ko' ? 'EN' : '한국어'}
              </button>
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="py-3 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              >
                {t('nav.login')}
              </Link>
              <Link
                href="/signup"
                onClick={() => setMobileMenuOpen(false)}
                className="mt-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3 text-center text-sm font-semibold text-white shadow-md transition-all duration-200 hover:shadow-lg hover:brightness-110"
              >
                {t('nav.getStarted')}
              </Link>
            </div>
          </div>
        )}
      </nav>

      <main>
        <HeroSection />
        <LogoBanner />
        <FeaturesShowcase />
        <CodeSnippet />
        <CostSavingsDemo />
        <CompetitorComparison />
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
