import { bkendService } from '@/lib/bkend'
import type { ProxyLog } from '@/types/proxy'

export interface RoutingQualityScore {
  modelPair: string
  totalRouted: number
  positiveFeedback: number
  negativeFeedback: number
  qualityScore: number
}

/**
 * Aggregate routing quality scores from proxy logs with feedback.
 */
export async function getRoutingQualityScores(orgId: string): Promise<RoutingQualityScore[]> {
  const logs = await bkendService.get<ProxyLog[]>('/proxy-logs', {
    params: {
      orgId,
      _limit: '5000',
    },
  })

  // Filter routed requests only
  const routedLogs = logs.filter((l) => l.originalModel)

  const map = new Map<string, { total: number; positive: number; negative: number }>()

  for (const log of routedLogs) {
    const pair = `${log.originalModel}\u2192${log.model}`
    let entry = map.get(pair)
    if (!entry) {
      entry = { total: 0, positive: 0, negative: 0 }
      map.set(pair, entry)
    }
    entry.total++
    if (log.userFeedback === 'positive') entry.positive++
    if (log.userFeedback === 'negative') entry.negative++
  }

  return Array.from(map.entries()).map(([modelPair, v]) => {
    const feedbackTotal = v.positive + v.negative
    return {
      modelPair,
      totalRouted: v.total,
      positiveFeedback: v.positive,
      negativeFeedback: v.negative,
      qualityScore: feedbackTotal > 0 ? v.positive / feedbackTotal : 1.0,
    }
  }).sort((a, b) => b.totalRouted - a.totalRouted)
}

/**
 * Check if routing should be disabled for a model pair based on negative feedback.
 * Returns true if quality score drops below 0.5 with at least 5 feedback entries.
 */
export async function shouldDisableRouting(
  originalModel: string,
  routedModel: string,
  orgId: string,
): Promise<boolean> {
  const scores = await getRoutingQualityScores(orgId)
  const pair = `${originalModel}\u2192${routedModel}`
  const score = scores.find((s) => s.modelPair === pair)
  if (!score) return false

  const feedbackTotal = score.positiveFeedback + score.negativeFeedback
  return feedbackTotal >= 5 && score.qualityScore < 0.5
}
