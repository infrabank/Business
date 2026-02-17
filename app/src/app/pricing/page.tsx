'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Check, ArrowRight, Calculator, Zap, Shield, BarChart3 } from 'lucide-react'
import Link from 'next/link'
import { Footer } from '@/components/layout/Footer'
import { useAppStore } from '@/lib/store'
import { useBilling } from '@/features/billing/hooks/useBilling'
import type { UserPlan } from '@/types'

function SavingsCalculator() {
  const [monthlySpend, setMonthlySpend] = useState(5000)
  const savingsRate = 0.42 // average 42% savings
  const commissionRate = 0.20

  const estimatedSavings = monthlySpend * savingsRate
  const commission = estimatedSavings * commissionRate
  const netSavings = estimatedSavings - commission
  const actualCost = monthlySpend - estimatedSavings

  return (
    <div className="rounded-3xl border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-900 p-8 shadow-xl lg:p-10">
      <div className="mb-6 flex items-center gap-2">
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/50 p-2">
          <Calculator className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">절약 계산기</h3>
      </div>

      <div className="mb-6">
        <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
          월간 LLM 지출: <span className="text-emerald-600 dark:text-emerald-400 font-bold">${monthlySpend.toLocaleString()}</span>
        </label>
        <input
          type="range"
          min={500}
          max={50000}
          step={500}
          value={monthlySpend}
          onChange={(e) => setMonthlySpend(Number(e.target.value))}
          className="w-full accent-emerald-600"
        />
        <div className="mt-1 flex justify-between text-xs text-slate-400 dark:text-slate-500">
          <span>$500</span>
          <span>$50,000</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-4 text-center">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">LCM 사용 전</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">${monthlySpend.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl bg-emerald-50 p-4 text-center">
          <p className="text-xs font-medium text-emerald-600">예상 절감액</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">${Math.round(estimatedSavings).toLocaleString()}</p>
        </div>
        <div className="rounded-2xl bg-indigo-50 p-4 text-center">
          <p className="text-xs font-medium text-indigo-600">수수료 (20%)</p>
          <p className="mt-1 text-2xl font-bold text-indigo-600">${Math.round(commission).toLocaleString()}</p>
        </div>
        <div className="rounded-2xl bg-emerald-100 p-4 text-center">
          <p className="text-xs font-medium text-emerald-700">순 절감액</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">${Math.round(netSavings).toLocaleString()}</p>
        </div>
      </div>

      <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
        ${monthlySpend.toLocaleString()}/월 대신 <span className="font-semibold text-slate-900 dark:text-slate-100">${Math.round(actualCost + commission).toLocaleString()}/월</span>만 지불 — 순 <span className="font-semibold text-emerald-600 dark:text-emerald-400">{Math.round((netSavings / monthlySpend) * 100)}%</span> 절약
      </p>
    </div>
  )
}

const faqItems = [
  {
    question: '수수료 모델은 어떻게 작동하나요?',
    answer: '절약해드릴 때만 비용을 청구합니다. 우리 프록시는 캐싱과 스마트 모델 라우팅을 통해 LLM 비용을 최적화합니다. 매월 말에 총 절감액을 계산하여 그 금액의 20%를 청구합니다. 절감액이 없으면 비용도 없습니다.',
  },
  {
    question: '언제 청구되나요?',
    answer: '수수료는 Stripe를 통해 매월 계산 및 청구됩니다. 매월 1일에 프록시 로그에서 전월 절감액을 집계하고 Stripe에 사용량을 보고합니다. 총 절감액의 20%에 대한 청구서를 받게 됩니다.',
  },
  {
    question: '"절감액"은 무엇으로 계산되나요?',
    answer: '절감액 = LCM 없이 지불했을 금액 - 실제 지불한 금액. 여기에는 응답 캐싱(중복 요청 비용 $0)과 스마트 모델 라우팅(간단한 쿼리를 저렴한 모델로 자동 라우팅)을 통한 절감액이 포함됩니다.',
  },
  {
    question: '무료 플랜의 제한사항은 무엇인가요?',
    answer: '무료 플랜은 월 1,000건 요청, 1개 프로바이더, 7일 히스토리를 포함합니다. 성장 플랜으로 업그레이드하면 무제한 요청, 모든 프로바이더, 365일 히스토리를 이용할 수 있습니다.',
  },
  {
    question: '무료 플랜으로 다운그레이드할 수 있나요?',
    answer: '네, 청구 포털을 통해 언제든지 성장 플랜을 취소할 수 있습니다. 현재 청구 기간이 끝나면 무료 플랜 제한으로 되돌아갑니다.',
  },
]

export default function PricingPage() {
  const currentUser = useAppStore((s) => s.currentUser)
  const { subscription, createCheckout, openPortal } = useBilling()
  const isLoggedIn = !!currentUser
  const currentPlan = (subscription?.plan || currentUser?.plan || 'free') as UserPlan

  function handleUpgrade() {
    if (!isLoggedIn) return
    createCheckout()
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      <header className="border-b border-slate-200/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-xl font-bold text-gradient">LLM Cost Manager</Link>
          <div className="flex items-center gap-4">
            {isLoggedIn ? (
              <Link href="/dashboard">
                <Button size="sm" variant="outline">대시보드</Button>
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">로그인</Link>
                <Link href="/signup">
                  <Button size="sm">회원가입</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-16">
        {/* Hero */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 dark:text-slate-100">절약해드릴 때만 비용을 지불하세요</h1>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            월 구독료 없음. 절감액의 20%만 받습니다 — 절감액이 없으면 비용도 없습니다.
          </p>
        </div>

        {/* Two-tier cards */}
        <div className="mx-auto mb-16 grid max-w-3xl grid-cols-1 gap-6 md:grid-cols-2">
          {/* Free */}
          <Card className="rounded-3xl border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-900 shadow-sm transition-all duration-300 hover:shadow-md">
            <CardHeader>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">무료</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">부담 없이 시작하기</p>
              <div className="mt-4">
                <span className="text-5xl font-bold text-slate-900 dark:text-slate-100">$0</span>
                <span className="text-slate-500 dark:text-slate-400">/영구 무료</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {['월 1,000건 요청', '1개 프로바이더', '7일 히스토리', '기본 대시보드', '응답 캐싱', '스마트 라우팅'].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <Check className="h-4 w-4 text-emerald-500 dark:text-emerald-400" /> {f}
                  </li>
                ))}
              </ul>
              {isLoggedIn ? (
                <Button
                  variant="outline"
                  className="mt-6 w-full rounded-xl"
                  disabled={currentPlan === 'free'}
                >
                  {currentPlan === 'free' ? '현재 플랜' : '다운그레이드'}
                </Button>
              ) : (
                <Link href="/signup" className="mt-6 block">
                  <Button variant="outline" className="w-full rounded-xl">시작하기</Button>
                </Link>
              )}
            </CardContent>
          </Card>

          {/* Growth */}
          <Card className="rounded-3xl border-2 border-indigo-500 bg-white dark:bg-slate-900 shadow-xl ring-1 ring-indigo-500/20">
            <CardHeader>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">성장</h3>
                <span className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-2.5 py-0.5 rounded-full text-xs font-semibold">추천</span>
              </div>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">결과에 대해서만 지불</p>
              <div className="mt-4">
                <span className="text-5xl font-bold text-gradient">20%</span>
                <span className="text-slate-500 dark:text-slate-400"> 절감액 기준</span>
              </div>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">$0 기본료 — 수수료만</p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {[
                  '무제한 요청',
                  '모든 프로바이더 (OpenAI, Anthropic, Google)',
                  '365일 히스토리',
                  '고급 분석',
                  '예산 알림 및 가드레일',
                  '팀 멤버',
                  '최적화 추천',
                  '우선 지원',
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <Check className="h-4 w-4 text-indigo-500 dark:text-indigo-400" /> {f}
                  </li>
                ))}
              </ul>
              {isLoggedIn ? (
                currentPlan === 'growth' ? (
                  <Button variant="outline" className="mt-6 w-full rounded-xl" onClick={openPortal}>
                    구독 관리
                  </Button>
                ) : (
                  <Button variant="primary" className="mt-6 w-full rounded-xl" onClick={handleUpgrade}>
                    절약 시작하기 <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )
              ) : (
                <Link href="/signup" className="mt-6 block">
                  <Button variant="primary" className="w-full rounded-xl">
                    절약 시작하기 <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Savings Calculator */}
        <div className="mb-16">
          <SavingsCalculator />
        </div>

        {/* How it works */}
        <div className="mb-16">
          <h2 className="mb-8 text-center text-2xl font-bold text-slate-900 dark:text-slate-100">수수료 청구 방식</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              { icon: Zap, title: '요청 최적화', desc: '캐싱, 스마트 라우팅, 예산 가드레일이 LLM 비용을 자동으로 절감합니다.' },
              { icon: BarChart3, title: '요청별 절감액 추적', desc: '모든 프록시 요청은 원래 비용 대비 실제 비용을 기록합니다. 대시보드에서 실시간 절감액을 확인하세요.' },
              { icon: Shield, title: '월간 수수료 청구', desc: '매월 1일, Stripe가 전월 총 절감액의 20%를 청구합니다. 절감액이 없으면 청구도 없습니다.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-900 p-8 text-center shadow-sm transition-all duration-300 hover:shadow-md">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/50">
                  <Icon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="mb-2 font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="mb-16">
          <h2 className="mb-8 text-center text-2xl font-bold text-slate-900 dark:text-slate-100">자주 묻는 질문</h2>
          <div className="mx-auto max-w-3xl space-y-4">
            {faqItems.map(({ question, answer }) => (
              <details key={question} className="group rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-900 shadow-sm">
                <summary className="cursor-pointer px-6 py-5 font-semibold text-slate-900 dark:text-slate-100">
                  {question}
                </summary>
                <p className="px-6 pb-5 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
