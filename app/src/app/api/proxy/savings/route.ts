import { NextRequest, NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { bkendService } from '@/lib/bkend'
import { getCacheStats } from '@/services/proxy/cache.service'
import type { SavingsSummary, OptimizationRecommendation } from '@/types/proxy'

// GET /api/proxy/savings?orgId=xxx&period=30d - get savings summary and recommendations
export async function GET(req: NextRequest) {
  try {
    await getMeServer()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const orgId = req.nextUrl.searchParams.get('orgId')
  if (!orgId) {
    return NextResponse.json({ error: 'orgId is required' }, { status: 400 })
  }

  try {
    const searchParams = req.nextUrl.searchParams
    const period = searchParams.get('period') || '30d'

    // Calculate period start date
    const now = new Date()
    const periodStart = new Date(now)
    switch (period) {
      case '7d':
        periodStart.setDate(now.getDate() - 7)
        break
      case '30d':
        periodStart.setDate(now.getDate() - 30)
        break
      case '90d':
        periodStart.setDate(now.getDate() - 90)
        break
      default:
        periodStart.setDate(now.getDate() - 30) // default to 30 days
    }

    // Query proxy logs for savings data
    const logs = await bkendService.get<
      Array<{
        cacheHit: boolean
        savedAmount: number
        originalModel: string | null
        cost: number
        model: string
        originalCost: number
      }>
    >('/proxy-logs', {
      params: {
        orgId,
        createdAt_gte: periodStart.toISOString(),
        _limit: '10000',
      },
    })

    // Calculate savings metrics
    const totalSaved = logs.reduce((sum, log) => sum + log.savedAmount, 0)
    const cacheHits = logs.filter((log) => log.cacheHit).length
    const totalRequests = logs.length
    const cacheHitRate = totalRequests > 0 ? (cacheHits / totalRequests) * 100 : 0
    const modelRoutings = logs.filter((log) => log.originalModel !== null).length
    const cacheSavings = logs
      .filter((log) => log.cacheHit)
      .reduce((sum, log) => sum + log.savedAmount, 0)
    const routingSavings = logs
      .filter((log) => log.originalModel !== null && !log.cacheHit)
      .reduce((sum, log) => sum + log.savedAmount, 0)

    const totalOriginalCost = logs.reduce((sum, log) => sum + (log.originalCost || (log.cost + log.savedAmount)), 0)
    const totalActualCost = logs.reduce((sum, log) => sum + log.cost, 0)

    const summary: SavingsSummary = {
      totalSaved,
      cacheHits,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      modelRoutings,
      cacheSavings,
      routingSavings,
      totalOriginalCost,
      totalActualCost,
      periodStart: periodStart.toISOString(),
      periodEnd: now.toISOString(),
    }

    // Get live cache stats
    const cacheStats = getCacheStats()

    // Generate optimization recommendations
    const recommendations: OptimizationRecommendation[] = []

    // Cache recommendation
    if (cacheHitRate < 20 && totalRequests > 0) {
      recommendations.push({
        type: 'cache',
        title: 'Enable Response Caching',
        description:
          'Your cache hit rate is low. Enable caching for similar requests to reduce costs.',
        potentialSavings: Math.round(totalRequests * 0.3 * 0.001 * 100) / 100, // estimate 30% cacheable at $0.001/req
        confidence: 'high',
      })
    }

    // Model routing recommendation
    if (modelRoutings === 0 && totalRequests > 0) {
      const totalCost = logs.reduce((sum, log) => sum + log.cost, 0)
      const avgCost = totalCost / totalRequests

      recommendations.push({
        type: 'routing',
        title: 'Enable Smart Model Routing',
        description:
          'Automatically route simple requests to cheaper models while maintaining quality.',
        potentialSavings: Math.round(totalCost * 0.4 * 100) / 100, // estimate 40% routing savings
        confidence: avgCost > 0.01 ? 'high' : 'medium',
      })
    }

    // Expensive model recommendation
    const expensiveModelLogs = logs.filter(
      (log) =>
        (log.model.includes('opus') || log.model.includes('gpt-4') || log.model.includes('gemini-pro')) &&
        !log.cacheHit &&
        log.originalModel === null
    )
    if (expensiveModelLogs.length > totalRequests * 0.5 && totalRequests > 10) {
      const expensiveCost = expensiveModelLogs.reduce((sum, log) => sum + log.cost, 0)

      recommendations.push({
        type: 'routing',
        title: 'High Usage of Expensive Models',
        description:
          'Over 50% of your requests use premium models. Consider routing simple queries to cost-effective alternatives.',
        potentialSavings: Math.round(expensiveCost * 0.6 * 100) / 100, // estimate 60% could be routed
        confidence: 'medium',
      })
    }

    return NextResponse.json({
      summary,
      recommendations,
      cacheStats,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load savings data' },
      { status: err instanceof Error && err.message === 'Not authenticated' ? 401 : 500 }
    )
  }
}
