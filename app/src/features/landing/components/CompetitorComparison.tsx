'use client'

import { Check, X, Crown } from 'lucide-react'
import { useT } from '@/lib/i18n'

const competitors = ['LCM (우리)', 'LiteLLM', 'Helicone', 'Portkey'] as const

type Competitor = (typeof competitors)[number]

type RowValue = string | boolean

interface ComparisonRow {
  label: string
  values: Record<Competitor, RowValue>
}

const rows: ComparisonRow[] = [
  {
    label: '설치 방법',
    values: {
      'LCM (우리)': 'URL 1줄 변경',
      LiteLLM: 'Python SDK 설치',
      Helicone: '프록시 배포',
      Portkey: 'SDK 설치',
    },
  },
  {
    label: '자체 인프라',
    values: {
      'LCM (우리)': '불필요 (SaaS)',
      LiteLLM: '필요 (셀프 호스팅)',
      Helicone: '불필요',
      Portkey: '불필요',
    },
  },
  {
    label: '가격 모델',
    values: {
      'LCM (우리)': '절감액의 20% (성과 기반)',
      LiteLLM: '무료 (셀프호스팅) / 엔터프라이즈',
      Helicone: '$20/월~',
      Portkey: '$25/월~',
    },
  },
  {
    label: '응답 캐싱',
    values: {
      'LCM (우리)': '3단계 (정확/정규화/시맨틱)',
      LiteLLM: '기본',
      Helicone: false,
      Portkey: '기본',
    },
  },
  {
    label: 'AI 모델 라우팅',
    values: {
      'LCM (우리)': '의도 기반 자동',
      LiteLLM: '수동 폴백',
      Helicone: false,
      Portkey: '수동',
    },
  },
  {
    label: '예산 가드레일',
    values: {
      'LCM (우리)': '키/팀/조직별',
      LiteLLM: '기본',
      Helicone: false,
      Portkey: '기본',
    },
  },
  {
    label: '실시간 절감 대시보드',
    values: {
      'LCM (우리)': true,
      LiteLLM: false,
      Helicone: '비용만',
      Portkey: '비용만',
    },
  },
  {
    label: '다크 모드',
    values: {
      'LCM (우리)': true,
      LiteLLM: true,
      Helicone: true,
      Portkey: true,
    },
  },
]

const highlights = [
  { titleKey: 'compare.highlights.item1Title', descKey: 'compare.highlights.item1Desc' },
  { titleKey: 'compare.highlights.item2Title', descKey: 'compare.highlights.item2Desc' },
  { titleKey: 'compare.highlights.item3Title', descKey: 'compare.highlights.item3Desc' },
]

function CellValue({ value, isLcm }: { value: RowValue; isLcm: boolean }) {
  if (value === true) {
    return (
      <Check
        className={`mx-auto h-5 w-5 ${isLcm ? 'text-emerald-500' : 'text-emerald-500'}`}
      />
    )
  }
  if (value === false) {
    return <X className="mx-auto h-5 w-5 text-red-400" />
  }
  return (
    <span
      className={`text-sm leading-snug ${isLcm ? 'font-semibold text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400'}`}
    >
      {value}
    </span>
  )
}

export function CompetitorComparison() {
  const t = useT()

  return (
    <section id="compare" className="py-24 bg-slate-50 dark:bg-slate-800/50">
      <div className="mx-auto max-w-6xl px-4">
        {/* Heading */}
        <div className="text-center">
          <h2 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t('compare.title')}
          </h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            {t('compare.subtitle')}
          </p>
        </div>

        {/* Comparison table */}
        <div className="mt-14 overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm">
          <table className="w-full min-w-[640px] border-collapse bg-white dark:bg-slate-900 text-center">
            <thead>
              <tr>
                <th className="w-44 py-5 px-6 text-left text-sm font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700/60">
                  {t('compare.headers.feature')}
                </th>
                {competitors.map((col) => {
                  const isLcm = col === 'LCM (우리)'
                  return (
                    <th
                      key={col}
                      className={`py-5 px-4 text-sm font-bold border-b ${
                        isLcm
                          ? 'bg-indigo-50 dark:bg-indigo-950/50 border-b-indigo-300 dark:border-b-indigo-700 text-indigo-700 dark:text-indigo-300'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-b-slate-200 dark:border-b-slate-700/60 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span className="flex items-center justify-center gap-1.5">
                        {isLcm && (
                          <Crown className="h-4 w-4 text-indigo-500 dark:text-indigo-400 flex-shrink-0" />
                        )}
                        {isLcm ? t('compare.headers.lcm') : col}
                      </span>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.label}
                  className={
                    i % 2 === 0
                      ? 'bg-white dark:bg-slate-900'
                      : 'bg-slate-50/60 dark:bg-slate-800/30'
                  }
                >
                  <td className="py-4 px-6 text-left text-sm font-medium text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800">
                    {row.label}
                  </td>
                  {competitors.map((col) => {
                    const isLcm = col === 'LCM (우리)'
                    return (
                      <td
                        key={col}
                        className={`py-4 px-4 text-sm ${
                          isLcm
                            ? 'bg-indigo-50/60 dark:bg-indigo-950/30 border-x border-indigo-100 dark:border-indigo-900/50'
                            : ''
                        }`}
                      >
                        <CellValue value={row.values[col]} isLcm={isLcm} />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Highlight cards */}
        <div className="mt-16">
          <h3 className="text-center text-2xl font-bold text-slate-900 dark:text-slate-100 mb-8">
            {t('compare.highlights.title')}
          </h3>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {highlights.map((item) => (
              <div
                key={item.titleKey}
                className="rounded-2xl border border-indigo-200 dark:border-indigo-800/50 bg-white dark:bg-slate-900 p-8 shadow-sm"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/50">
                  <Check className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {t(item.titleKey)}
                </h4>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {t(item.descKey)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
