'use client'

import { Button } from '@/components/ui/Button'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useOnboarding } from '@/features/onboarding/hooks/useOnboarding'
import { StepIndicator } from './StepIndicator'
import { WelcomeStep } from './WelcomeStep'
import { ProviderStep } from './ProviderStep'
import { ApiKeyStep } from './ApiKeyStep'
import { SyncStep } from './SyncStep'
import { CompleteStep } from './CompleteStep'

interface OnboardingWizardProps {
  onComplete: () => void
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const {
    state,
    nextStep,
    prevStep,
    selectProvider,
    setApiKey,
    validateKey,
    registerProvider,
    startSync,
    skipOnboarding,
    completeOnboarding,
    canProceed,
  } = useOnboarding()

  if (state.isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="flex items-center justify-between">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className="h-8 w-8 animate-pulse rounded-full bg-slate-200" />
              <div className="h-3 w-12 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
            </div>
          ))}
        </div>
        <div className="mt-8 h-64 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
      </div>
    )
  }

  if (state.isCompleted) {
    onComplete()
    return null
  }

  const handleComplete = async () => {
    await completeOnboarding()
    onComplete()
  }

  const handleSkip = async () => {
    await skipOnboarding()
    onComplete()
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <StepIndicator currentStep={state.step} totalSteps={5} />

      <div className="mt-8 rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900 p-6 shadow-sm">
        {state.step === 1 && <WelcomeStep />}
        {state.step === 2 && (
          <ProviderStep
            selectedProvider={state.selectedProvider}
            onSelect={selectProvider}
          />
        )}
        {state.step === 3 && state.selectedProvider && (
          <ApiKeyStep
            provider={state.selectedProvider}
            apiKey={state.apiKey}
            onKeyChange={setApiKey}
            keyStatus={state.keyStatus}
            keyError={state.keyError}
            keyModels={state.keyModels}
            providerRegistered={state.providerRegistered}
            onValidate={validateKey}
            onRegister={registerProvider}
          />
        )}
        {state.step === 4 && (
          <SyncStep
            syncStatus={state.syncStatus}
            syncSummary={state.syncSummary}
            onStartSync={startSync}
          />
        )}
        {state.step === 5 && <CompleteStep />}
      </div>

      <div className="mt-6 flex items-center justify-between">
        {state.step > 1 ? (
          <Button variant="ghost" onClick={prevStep}>
            <ArrowLeft className="mr-2 h-4 w-4" /> 이전
          </Button>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-3">
          {state.step < 5 && (
            <button
              onClick={handleSkip}
              className="text-sm text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-400 dark:text-slate-500"
            >
              건너뛰기
            </button>
          )}
          {state.step < 5 ? (
            <Button onClick={nextStep} disabled={!canProceed}>
              다음 <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleComplete}>
              대시보드로 이동 <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
