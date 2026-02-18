'use client'

import Link from 'next/link'
import { ArrowRight, CheckCircle, Clock } from 'lucide-react'
import { useT } from '@/lib/i18n'

export function FinalCta() {
  const t = useT()
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 py-24">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.08),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.05),transparent_40%)]" />

      <div className="relative mx-auto max-w-4xl px-4 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm">
          <Clock className="h-4 w-4" />
          {t('cta.badge')}
        </div>

        <h2 className="text-4xl lg:text-5xl font-bold tracking-tight text-white">
          {t('cta.titlePrefix')}
          <br />
          <span className="text-emerald-300">{t('cta.titleHighlight')}</span>{t('cta.titleSuffix')}
        </h2>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-indigo-100 leading-relaxed">
          {t('cta.description')}
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-bold text-indigo-700 shadow-xl transition-all duration-200 hover:shadow-2xl hover:scale-[1.02]"
          >
            {t('cta.ctaPrimary')} <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 rounded-xl border-2 border-white/30 px-8 py-4 text-base font-semibold text-white transition-all duration-200 hover:bg-white/10 hover:border-white/50"
          >
            {t('cta.ctaSecondary')}
          </Link>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-indigo-200">
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle className="h-4 w-4 text-emerald-400" /> {t('cta.trust1')}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle className="h-4 w-4 text-emerald-400" /> {t('cta.trust2')}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle className="h-4 w-4 text-emerald-400" /> {t('cta.trust3')}
          </span>
        </div>
      </div>
    </section>
  )
}
