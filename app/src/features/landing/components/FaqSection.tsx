'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { faqItems } from '../data/landing-data'

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  function toggle(index: number) {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <section id="faq" className="py-24 bg-white dark:bg-slate-900">
      <div className="mx-auto max-w-3xl px-4">
        <h2 className="text-center text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          자주 묻는 질문
        </h2>

        <div className="mt-12 space-y-3">
          {faqItems.map((item, index) => {
            const isOpen = openIndex === index
            return (
              <details
                key={index}
                className="group rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all"
                open={isOpen}
              >
                <summary
                  onClick={(e) => {
                    e.preventDefault()
                    toggle(index)
                  }}
                  className="cursor-pointer px-6 py-5 font-semibold text-slate-900 dark:text-slate-100 flex items-center justify-between"
                >
                  <span>{item.question}</span>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </summary>
                <div
                  className={`grid overflow-hidden transition-[grid-template-rows] duration-300 ${
                    isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                  }`}
                >
                  <div className="min-h-0">
                    <p className="px-6 pb-5 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{item.answer}</p>
                  </div>
                </div>
              </details>
            )
          })}
        </div>
      </div>
    </section>
  )
}
