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
    <section className="py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">
            See how much you could save
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Adjust the sliders to match your usage. The savings are calculated in real-time.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Controls */}
          <div className="space-y-8 rounded-xl border border-gray-200 bg-white p-8">
            <div>
              <label className="flex items-center justify-between text-sm font-medium text-gray-700">
                <span>Monthly API Requests</span>
                <span className="rounded-lg bg-gray-100 px-3 py-1 font-mono text-sm font-bold text-gray-900">
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
                className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-blue-600"
              />
              <div className="mt-1 flex justify-between text-xs text-gray-400">
                <span>1K</span>
                <span>500K</span>
              </div>
            </div>

            <div>
              <label className="mb-3 block text-sm font-medium text-gray-700">Primary Model</label>
              <div className="grid grid-cols-3 gap-2">
                {MODELS.map((m, i) => (
                  <button
                    key={m.name}
                    onClick={() => setSelectedModel(i)}
                    className={`rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all ${
                      selectedModel === i
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="flex items-center justify-between text-sm font-medium text-gray-700">
                <span>Expected Cache Hit Rate</span>
                <span className="rounded-lg bg-gray-100 px-3 py-1 font-mono text-sm font-bold text-gray-900">
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
                className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-blue-600"
              />
              <div className="mt-1 flex justify-between text-xs text-gray-400">
                <span>0% (no caching)</span>
                <span>80% (high repetition)</span>
              </div>
              <p className="mt-2 text-xs text-gray-400">
                Embedding calls and template prompts typically see 30-60% cache hit rates
              </p>
            </div>
          </div>

          {/* Results */}
          <div className="flex flex-col gap-4">
            {/* Before vs After */}
            <div className="grid grid-cols-3 gap-3 rounded-xl border border-gray-200 bg-white p-6">
              <div className="rounded-lg bg-red-50 p-4 text-center">
                <p className="text-xs font-medium text-red-500">Without LCM</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">
                  ${withoutLCM.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
                <p className="mt-1 text-[10px] text-gray-400">/month</p>
              </div>
              <div className="flex flex-col items-center justify-center rounded-lg bg-emerald-50 p-4">
                <p className="text-xs font-medium text-emerald-600">You Save</p>
                <p className="mt-2 text-2xl font-bold text-emerald-600">
                  ${totalSaved.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
                <span className="mt-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                  {savingsPercent}%
                </span>
              </div>
              <div className="rounded-lg bg-blue-50 p-4 text-center">
                <p className="text-xs font-medium text-blue-500">With LCM</p>
                <p className="mt-2 text-2xl font-bold text-blue-700">
                  ${withLCM.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
                <p className="mt-1 text-[10px] text-blue-400">/month</p>
              </div>
            </div>

            {/* Breakdown */}
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h4 className="text-sm font-semibold text-gray-700">Savings Breakdown</h4>
              <div className="mt-4 space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Response Caching</span>
                    <span className="font-semibold text-emerald-600">
                      -${cacheSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all duration-500"
                      style={{ width: `${withoutLCM > 0 ? (cacheSavings / withoutLCM) * 100 : 0}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-400">
                    {cachedRequests.toLocaleString(undefined, { maximumFractionDigits: 0 })} duplicate requests eliminated
                  </p>
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Smart Model Routing</span>
                    <span className="font-semibold text-emerald-600">
                      -${routingSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-purple-500 transition-all duration-500"
                      style={{ width: `${withoutLCM > 0 ? (routingSavings / withoutLCM) * 100 : 0}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-400">
                    {routableRequests.toLocaleString(undefined, { maximumFractionDigits: 0 })} simple requests → {model.routedTo}
                  </p>
                </div>
              </div>
            </div>

            {/* Annual projection */}
            <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-6 text-center">
              <p className="text-sm font-medium text-emerald-700">Projected Annual Savings</p>
              <p className="mt-2 text-4xl font-bold text-emerald-600">
                ${(totalSaved * 12).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
              <p className="mt-1 text-sm text-emerald-600">
                That&apos;s {model.name} → {model.routedTo} routing + {cacheHitRate}% cache hits
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
