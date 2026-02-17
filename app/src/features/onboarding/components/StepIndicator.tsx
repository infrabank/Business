'use client'

import React from 'react'
import { Check } from 'lucide-react'

interface StepIndicatorProps {
  currentStep: number
  totalSteps: number
}

const STEP_LABELS = ['환영', '프로바이더', 'API 키', '동기화', '완료']

export function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-between">
      {STEP_LABELS.slice(0, totalSteps).map((label, i) => {
        const stepNum = i + 1
        const isCompleted = stepNum < currentStep
        const isCurrent = stepNum === currentStep

        return (
          <React.Fragment key={stepNum}>
            <div className="flex flex-col items-center gap-1">
              <div
                className={[
                  'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-all',
                  isCompleted ? 'bg-blue-600 text-white' : '',
                  isCurrent ? 'bg-blue-600 text-white ring-4 ring-blue-100' : '',
                  !isCompleted && !isCurrent ? 'bg-slate-200 text-slate-500' : '',
                ].join(' ')}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : stepNum}
              </div>
              <span
                className={[
                  'text-xs font-medium',
                  isCompleted || isCurrent ? 'text-blue-600' : 'text-slate-400',
                ].join(' ')}
              >
                {label}
              </span>
            </div>

            {stepNum < totalSteps && (
              <div
                className={[
                  'mx-2 h-0.5 flex-1',
                  stepNum < currentStep ? 'bg-blue-600' : 'bg-slate-200',
                ].join(' ')}
              />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}
