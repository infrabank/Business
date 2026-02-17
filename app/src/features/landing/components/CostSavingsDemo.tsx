'use client'

import { useState } from 'react'

const MODELS = [
  { name: 'GPT-4o', pricePerReq: 0.03, routedTo: 'GPT-4o-mini', routedPrice: 0.002 },
  { name: 'Claude Opus', pricePerReq: 0.045, routedTo: 'Claude Sonnet', routedPrice: 0.009 },
  { name: 'Gemini Pro', pricePerReq: 0.007, routedTo: 'Gemini Flash', routedPrice: 0.0005 },
]

export function CostSavingsDemo() {
  const [monthlyRequests, setMonthlyRequests] = useState(50000)
  const [selectedModel, setSelectedModel] = useState(0)
  const [cacheHitRate, setCacheHitRate] = useState(35)

  const model = MODELS[selectedModel]
  const withoutLCM = monthlyRequests * model.pricePerReq
  const cachedRequests = monthlyRequests * (cacheHitRate / 100)
  const nonCachedRequests = monthlyRequests - cachedRequests
  // 40% of non-cached are simple enough to route
  const routableRequests = nonCachedRequests * 0.4
  const fullPriceRequests = nonCachedRequests - routableRequests

  const cacheSavings = cachedRequests * model.pricePerReq
  const routingSavings = routableRequests * (model.pricePerReq - model.routedPrice)
  const withLCM = fullPriceRequests * model.pricePerReq + routableRequests * model.routedPrice
  const totalSaved = withoutLCM - withLCM
  const savingsPercent = withoutLCM > 0 ? ((totalSaved / withoutLCM) * 100).toFixed(1) : '0'

  return (
    <section className="py-24 bg-slate-50 dark:bg-slate-800/50">
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center">
          <h2 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            얼마나 절감할 수 있는지 확인하세요
          </h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
            사용량에 맞게 슬라이더를 조정하세요. 절감액은 실시간으로 계산됩니다.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Controls */}
          <div className="space-y-8 rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900 p-8 shadow-sm">
            <div>
              <label className="flex items-center justify-between text-sm font-medium text-slate-700 dark:text-slate-300">
                <span>월간 API 요청 수</span>
                <span className="rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-1 font-mono text-sm font-bold text-slate-900 dark:text-slate-100">
                  {monthlyRequests.toLocaleString()}
                </span>
              </label>
              <input
                type="range"
                min={1000}
                max={500000}
                step={1000}
                value={monthlyRequests}
                onChange={(e) => setMonthlyRequests(Number(e.target.value))}
                className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-indigo-600"
              />
              <div className="mt-1 flex justify-between text-xs text-slate-400">
                <span>1K</span>
                <span>500K</span>
              </div>
            </div>

            <div>
              <label className="mb-3 block text-sm font-medium text-slate-700 dark:text-slate-300">주요 모델</label>
              <div className="grid grid-cols-3 gap-2">
                {MODELS.map((m, i) => (
                  <button
                    key={m.name}
                    onClick={() => setSelectedModel(i)}
                    className={`rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all ${
                      selectedModel === i
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="flex items-center justify-between text-sm font-medium text-slate-700 dark:text-slate-300">
                <span>예상 캐시 적중률</span>
                <span className="rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-1 font-mono text-sm font-bold text-slate-900 dark:text-slate-100">
                  {cacheHitRate}%
                </span>
              </label>
              <input
                type="range"
                min={0}
                max={80}
                step={5}
                value={cacheHitRate}
                onChange={(e) => setCacheHitRate(Number(e.target.value))}
                className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-indigo-600"
              />
              <div className="mt-1 flex justify-between text-xs text-slate-400">
                <span>0% (캐싱 없음)</span>
                <span>80% (높은 반복)</span>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                임베딩 호출과 템플릿 프롬프트는 일반적으로 30-60% 캐시 적중률을 보입니다
              </p>
            </div>
          </div>

          {/* Results */}
          <div className="flex flex-col gap-4">
            {/* Before vs After */}
            <div className="grid grid-cols-3 gap-3 rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900 p-6 shadow-sm">
              <div className="rounded-lg bg-red-50 p-4 text-center">
                <p className="text-xs font-medium text-red-500">LCM 없이</p>
                <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
                  ${withoutLCM.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
                <p className="mt-1 text-[10px] text-slate-400">/월</p>
              </div>
              <div className="flex flex-col items-center justify-center rounded-lg bg-emerald-50 p-4">
                <p className="text-xs font-medium text-emerald-600">절감액</p>
                <p className="mt-2 text-2xl font-bold text-emerald-600">
                  ${totalSaved.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
                <span className="mt-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                  {savingsPercent}%
                </span>
              </div>
              <div className="rounded-lg bg-indigo-50 dark:bg-indigo-950/50 p-4 text-center">
                <p className="text-xs font-medium text-indigo-500">LCM 사용</p>
                <p className="mt-2 text-2xl font-bold text-indigo-700">
                  ${withLCM.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
                <p className="mt-1 text-[10px] text-indigo-400">/월</p>
              </div>
            </div>

            {/* Breakdown */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900 p-6 shadow-sm">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">절감 내역</h4>
              <div className="mt-4 space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">응답 캐싱</span>
                    <span className="font-semibold text-emerald-600">
                      -${cacheSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                      style={{ width: `${withoutLCM > 0 ? (cacheSavings / withoutLCM) * 100 : 0}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    {cachedRequests.toLocaleString(undefined, { maximumFractionDigits: 0 })}개 중복 요청 제거
                  </p>
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">스마트 모델 라우팅</span>
                    <span className="font-semibold text-emerald-600">
                      -${routingSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-violet-500 transition-all duration-500"
                      style={{ width: `${withoutLCM > 0 ? (routingSavings / withoutLCM) * 100 : 0}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    {routableRequests.toLocaleString(undefined, { maximumFractionDigits: 0 })}개 단순 요청 → {model.routedTo}
                  </p>
                </div>
              </div>
            </div>

            {/* Annual projection */}
            <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-6 text-center shadow-sm">
              <p className="text-sm font-medium text-emerald-700">연간 절감 예상액</p>
              <p className="mt-2 text-4xl font-bold text-emerald-600">
                ${(totalSaved * 12).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
              <p className="mt-1 text-sm text-emerald-600">
                {model.name} → {model.routedTo} 라우팅 + {cacheHitRate}% 캐시 적중률 기준
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
