import Link from 'next/link'
import { ArrowRight, CheckCircle, Zap } from 'lucide-react'

function SavingsMockup() {
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
          app.llmcost.io/proxy/savings
        </div>
      </div>

      <div className="p-4 lg:p-6">
        {/* Before vs After Hero */}
        <div className="grid grid-cols-3 gap-3 rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
          <div className="rounded-lg bg-gray-50 p-4 text-center">
            <p className="text-[10px] font-medium text-gray-400 uppercase">LCM 없이</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">$8,247</p>
            <p className="mt-1 text-[10px] text-gray-400">원래 지불했을 금액</p>
          </div>
          <div className="flex flex-col items-center justify-center rounded-lg bg-emerald-50 p-4">
            <p className="text-[10px] font-medium text-emerald-600 uppercase">절감액</p>
            <p className="mt-2 text-2xl font-bold text-emerald-600">$3,412</p>
            <span className="mt-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
              41.4% 감소
            </span>
          </div>
          <div className="rounded-lg bg-blue-50 p-4 text-center">
            <p className="text-[10px] font-medium text-blue-500 uppercase">LCM 사용</p>
            <p className="mt-2 text-2xl font-bold text-blue-700">$4,835</p>
            <p className="mt-1 text-[10px] text-blue-400">실제 지불 금액</p>
          </div>
        </div>

        {/* Savings breakdown */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
            <p className="mb-2 text-xs font-semibold text-gray-700">절감 내역</p>
            <div className="space-y-2">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-gray-600">응답 캐싱</span>
                  <span className="text-[11px] font-semibold text-emerald-600">-$2,180</span>
                </div>
                <div className="mt-1 h-1.5 w-full rounded-full bg-gray-100">
                  <div className="h-1.5 rounded-full bg-blue-500" style={{ width: '64%' }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-gray-600">스마트 모델 라우팅</span>
                  <span className="text-[11px] font-semibold text-emerald-600">-$1,232</span>
                </div>
                <div className="mt-1 h-1.5 w-full rounded-full bg-gray-100">
                  <div className="h-1.5 rounded-full bg-purple-500" style={{ width: '36%' }} />
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
            <p className="mb-2 text-xs font-semibold text-gray-700">최근 최적화</p>
            <div className="space-y-1.5">
              <div className="rounded bg-emerald-50 px-2 py-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-medium text-emerald-800">GPT-4o → GPT-4o-mini</p>
                  <p className="text-[10px] font-bold text-emerald-600">-94%</p>
                </div>
                <p className="text-[10px] text-emerald-600">512개 단순 질문 및 인사 요청</p>
              </div>
              <div className="rounded bg-blue-50 px-2 py-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-medium text-blue-800">캐시 적중률</p>
                  <p className="text-[10px] font-bold text-blue-600">38.2%</p>
                </div>
                <p className="text-[10px] text-blue-600">1,847개 중복 호출 제거</p>
              </div>
            </div>
          </div>
        </div>

        {/* Live request log preview */}
        <div className="mt-4 rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
          <p className="mb-2 text-xs font-semibold text-gray-700">실시간 요청 로그</p>
          <div className="space-y-1">
            {[
              { model: 'gpt-4o-mini', from: 'gpt-4o', intent: 'simple-qa', cost: '$0.0003', original: '$0.0052', badge: 'ROUTED', badgeColor: 'purple' },
              { model: 'claude-sonnet', intent: 'coding', cost: '$0.0000', original: '$0.0180', badge: 'CACHED', badgeColor: 'blue' },
              { model: 'gpt-4o', intent: 'reasoning', cost: '$0.0847', original: '$0.0847', badge: null, badgeColor: '' },
              { model: 'gemini-flash', from: 'gemini-pro', intent: 'greeting', cost: '$0.0001', original: '$0.0023', badge: 'ROUTED', badgeColor: 'purple' },
            ].map((row, i) => (
              <div key={i} className="flex items-center gap-2 rounded bg-gray-50 px-2 py-1">
                <code className="w-24 text-[10px] text-gray-600 truncate">{row.model}</code>
                {row.from && <span className="text-[9px] text-gray-400">from {row.from}</span>}
                <span className={`rounded px-1 py-0.5 text-[9px] font-medium ${
                  row.intent === 'coding' || row.intent === 'reasoning' ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-500'
                }`}>{row.intent}</span>
                <span className="flex-1" />
                {row.badge && (
                  <span className={`rounded px-1 py-0.5 text-[9px] font-medium ${
                    row.badgeColor === 'blue' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                  }`}>{row.badge}</span>
                )}
                <span className="text-[10px] text-gray-400 line-through">{row.original}</span>
                <span className="text-[10px] font-semibold text-gray-900">{row.cost}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function HeroSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 text-center">
      <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-700">
        <Zap className="h-4 w-4" /> 절약해드릴 때까지 무료 — 그 후 절감액의 20%만
      </div>

      <h1 className="mx-auto max-w-4xl text-5xl font-bold leading-tight tracking-tight text-gray-900 lg:text-6xl">
        LLM 비용을{' '}
        <span className="text-emerald-600">40%+</span>
        {' '}절감하세요
        <br />
        <span className="text-gray-400">단 한 줄의 코드로</span>
      </h1>

      <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
        API 엔드포인트를 프록시로 변경하세요. 중복 요청은 자동으로 캐싱하고
        AI가 단순 쿼리를 저렴한 모델로 라우팅합니다.{' '}
        <span className="font-semibold text-gray-900">동일한 결과, 비용은 절반 이하.</span>
      </p>

      <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-base font-medium text-white transition-all duration-200 hover:scale-[1.02] hover:bg-emerald-700 hover:shadow-lg"
        >
          무료로 절감 시작 <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href="/pricing"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-6 py-3 text-base font-medium text-gray-700 transition-all duration-200 hover:bg-gray-50 hover:shadow-md"
        >
          요금제 보기
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
        <span className="inline-flex items-center gap-1.5">
          <CheckCircle className="h-4 w-4 text-green-500" /> 신용카드 불필요
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CheckCircle className="h-4 w-4 text-green-500" /> 1줄 통합
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CheckCircle className="h-4 w-4 text-green-500" /> OpenAI, Anthropic, Google 지원
        </span>
      </div>

      <div className="mx-auto mt-12 max-w-4xl">
        <SavingsMockup />
      </div>
    </section>
  )
}
