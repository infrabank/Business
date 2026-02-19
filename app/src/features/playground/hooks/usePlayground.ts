'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAppStore } from '@/lib/store'
import { useProviders } from '@/features/providers/hooks/useProviders'
import { createAdapter } from '@/services/providers'
import type { ProviderType } from '@/types'
import { substituteVariables } from '@/features/templates/utils/variables'
import type {
  PlaygroundMode,
  PlaygroundExecuteResponse,
  PlaygroundEstimateResponse,
  PlaygroundHistory,
  ComparisonResult,
} from '@/types/playground'
import type { PromptTemplate, VariableValues, CreateTemplateRequest } from '@/types/template'

export function usePlayground() {
  const { currentUser, currentOrgId } = useAppStore()
  const { providers } = useProviders(currentOrgId)
  const activeProviders = providers.filter((p) => p.isActive)

  // Mode
  const [mode, setMode] = useState<PlaygroundMode>('single')

  // Model selection
  const [providerId, setProviderId] = useState('')
  const [model, setModel] = useState('')
  const [compareProviderId, setCompareProviderId] = useState('')
  const [compareModel, setCompareModel] = useState('')

  // Prompt
  const [systemPrompt, setSystemPrompt] = useState('')
  const [userPrompt, setUserPrompt] = useState('')
  const [temperature, setTemperature] = useState(1.0)
  const [maxTokens, setMaxTokens] = useState(1024)

  // Results
  const [result, setResult] = useState<PlaygroundExecuteResponse | null>(null)
  const [comparison, setComparison] = useState<ComparisonResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Estimate
  const [estimate, setEstimate] = useState<PlaygroundEstimateResponse | null>(null)
  const estimateTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // History
  const [history, setHistory] = useState<PlaygroundHistory[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyTotal, setHistoryTotal] = useState(0)

  // Limits
  const [todayCount, setTodayCount] = useState(0)
  const plan = currentUser?.plan || 'free'
  const dailyLimit = plan === 'growth' ? -1 : 10
  const limitReached = dailyLimit !== -1 && todayCount >= dailyLimit

  // Init defaults when providers load
  useEffect(() => {
    if (activeProviders.length > 0 && !providerId) {
      const first = activeProviders[0]
      setProviderId(first.id)
      try {
        const adapter = createAdapter(first.type as ProviderType)
        const models = adapter.getAvailableModels()
        if (models.length > 0) setModel(models[0])
      } catch { /* ignore */ }

      if (activeProviders.length > 1) {
        const second = activeProviders[1]
        setCompareProviderId(second.id)
        try {
          const adapter = createAdapter(second.type as ProviderType)
          const models = adapter.getAvailableModels()
          if (models.length > 0) setCompareModel(models[0])
        } catch { /* ignore */ }
      } else {
        setCompareProviderId(first.id)
        try {
          const adapter = createAdapter(first.type as ProviderType)
          const models = adapter.getAvailableModels()
          if (models.length > 1) setCompareModel(models[1])
          else if (models.length > 0) setCompareModel(models[0])
        } catch { /* ignore */ }
      }
    }
  }, [activeProviders, providerId])

  // Handle provider change → update model
  const handleProviderChange = useCallback((id: string) => {
    setProviderId(id)
    const p = activeProviders.find((p) => p.id === id)
    if (p) {
      try {
        const adapter = createAdapter(p.type as ProviderType)
        const models = adapter.getAvailableModels()
        if (models.length > 0) setModel(models[0])
      } catch { /* ignore */ }
    }
  }, [activeProviders])

  const handleCompareProviderChange = useCallback((id: string) => {
    setCompareProviderId(id)
    const p = activeProviders.find((p) => p.id === id)
    if (p) {
      try {
        const adapter = createAdapter(p.type as ProviderType)
        const models = adapter.getAvailableModels()
        if (models.length > 0) setCompareModel(models[0])
      } catch { /* ignore */ }
    }
  }, [activeProviders])

  // Estimate on prompt change (debounced)
  const refreshEstimate = useCallback(() => {
    if (!userPrompt.trim() || !providerId) {
      setEstimate(null)
      return
    }
    const p = activeProviders.find((p) => p.id === providerId)
    if (!p) return

    if (estimateTimer.current) clearTimeout(estimateTimer.current)
    estimateTimer.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/playground/estimate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: p.type,
            model,
            systemPrompt: systemPrompt || undefined,
            userPrompt,
          }),
        })
        if (res.ok) {
          setEstimate(await res.json())
        }
      } catch { /* ignore */ }
    }, 500)
  }, [userPrompt, systemPrompt, model, providerId, activeProviders])

  useEffect(() => {
    refreshEstimate()
  }, [refreshEstimate])

  // Load history
  const loadHistory = useCallback(async (offset = 0) => {
    setHistoryLoading(true)
    try {
      const res = await fetch(`/api/playground/history?limit=20&offset=${offset}`)
      if (res.ok) {
        const data = await res.json()
        if (offset === 0) {
          setHistory(data.data)
        } else {
          setHistory((prev) => [...prev, ...data.data])
        }
        setHistoryTotal(data.total)

        // Count today's executions
        if (offset === 0) {
          const today = new Date().toISOString().split('T')[0]
          const todayItems = (data.data as PlaygroundHistory[]).filter(
            (h) => h.createdAt.startsWith(today)
          )
          setTodayCount(todayItems.length)
        }
      }
    } catch { /* ignore */ }
    setHistoryLoading(false)
  }, [])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const loadMoreHistory = useCallback(() => {
    loadHistory(history.length)
  }, [loadHistory, history.length])

  // Execute
  const execute = useCallback(async () => {
    if (!userPrompt.trim() || !providerId || !model) return
    setLoading(true)
    setError(null)

    if (mode === 'compare') {
      setComparison({
        left: null, right: null,
        leftModel: model, rightModel: compareModel,
        leftLoading: true, rightLoading: true,
      })

      const makeRequest = async (pid: string, m: string) => {
        const res = await fetch('/api/playground/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            providerId: pid,
            model: m,
            systemPrompt: systemPrompt || undefined,
            userPrompt,
            temperature,
            maxTokens,
          }),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Execution failed')
        }
        return res.json() as Promise<PlaygroundExecuteResponse>
      }

      try {
        const [leftResult, rightResult] = await Promise.allSettled([
          makeRequest(providerId, model),
          makeRequest(compareProviderId, compareModel),
        ])

        setComparison({
          left: leftResult.status === 'fulfilled' ? leftResult.value : null,
          right: rightResult.status === 'fulfilled' ? rightResult.value : null,
          leftModel: model,
          rightModel: compareModel,
          leftLoading: false,
          rightLoading: false,
        })

        if (leftResult.status === 'rejected' && rightResult.status === 'rejected') {
          setError((leftResult.reason as Error).message)
        }

        setTodayCount((c) => c + 2)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Comparison failed')
      }
    } else {
      // Single mode
      try {
        const res = await fetch('/api/playground/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            providerId,
            model,
            systemPrompt: systemPrompt || undefined,
            userPrompt,
            temperature,
            maxTokens,
          }),
        })

        if (!res.ok) {
          const data = await res.json()
          setError(data.error || '실행에 실패했습니다.')
          setResult(null)
        } else {
          const data = await res.json()
          setResult(data)
          setError(null)
          setTodayCount((c) => c + 1)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '실행에 실패했습니다.')
        setResult(null)
      }
    }

    setLoading(false)
    loadHistory(0)
  }, [userPrompt, systemPrompt, providerId, model, compareProviderId, compareModel, temperature, maxTokens, mode, loadHistory])

  // Template sidebar
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Load template into playground
  const loadTemplate = useCallback((template: PromptTemplate, variableValues: VariableValues) => {
    const finalSystem = template.systemPrompt
      ? substituteVariables(template.systemPrompt, variableValues)
      : ''
    const finalUser = substituteVariables(template.userPrompt, variableValues)

    setSystemPrompt(finalSystem)
    setUserPrompt(finalUser)

    if (template.defaultTemperature !== undefined && template.defaultTemperature !== null) {
      setTemperature(template.defaultTemperature)
    }
    if (template.defaultMaxTokens !== undefined && template.defaultMaxTokens !== null) {
      setMaxTokens(template.defaultMaxTokens)
    }

    if (template.defaultProvider) {
      const matchingProvider = activeProviders.find((p) => p.type === template.defaultProvider)
      if (matchingProvider) {
        handleProviderChange(matchingProvider.id)
        if (template.defaultModel) {
          setModel(template.defaultModel)
        }
      }
    }

    setSidebarOpen(false)
    setMode('single')
    setResult(null)
    setError(null)
  }, [activeProviders, handleProviderChange])

  // Get current prompt data for saving as template
  const getTemplateData = useCallback((): Partial<CreateTemplateRequest> => {
    const selectedProvider = activeProviders.find((p) => p.id === providerId)
    return {
      systemPrompt: systemPrompt || undefined,
      userPrompt,
      defaultModel: model || undefined,
      defaultProvider: selectedProvider?.type || undefined,
      defaultTemperature: temperature,
      defaultMaxTokens: maxTokens,
    }
  }, [systemPrompt, userPrompt, model, providerId, temperature, maxTokens, activeProviders])

  // Select history item
  const selectHistory = useCallback((item: PlaygroundHistory) => {
    setUserPrompt(item.userPrompt)
    setSystemPrompt(item.systemPrompt || '')
    setTemperature(item.temperature)
    setMaxTokens(item.maxTokens)
    setResult({
      response: item.response,
      inputTokens: item.inputTokens,
      outputTokens: item.outputTokens,
      cost: item.cost,
      responseTimeMs: item.responseTimeMs,
      model: item.model,
      provider: item.provider,
    })
    setError(null)
    setMode('single')

    // Try to select the matching provider
    const matchingProvider = activeProviders.find((p) => p.type === item.provider)
    if (matchingProvider) {
      setProviderId(matchingProvider.id)
      setModel(item.model)
    }
  }, [activeProviders])

  return {
    // State
    mode, setMode,
    providerId, model, compareProviderId, compareModel,
    systemPrompt, userPrompt, temperature, maxTokens,
    result, comparison, error, loading, estimate,

    // History
    history, historyLoading,
    hasMoreHistory: history.length < historyTotal,

    // Limits
    todayCount, dailyLimit, limitReached,

    // Actions
    setProvider: handleProviderChange,
    setModel,
    setCompareProvider: handleCompareProviderChange,
    setCompareModel,
    setSystemPrompt, setUserPrompt,
    setTemperature, setMaxTokens,
    execute,
    loadMoreHistory,
    selectHistory,

    // Template integration
    sidebarOpen, setSidebarOpen,
    loadTemplate, getTemplateData,

    // Data
    providers: activeProviders,
  }
}
