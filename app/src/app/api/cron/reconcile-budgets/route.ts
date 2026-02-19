import { NextRequest, NextResponse } from 'next/server'
import { bkendService } from '@/lib/bkend'
import { processBatch } from '@/lib/utils'
import { reconcileBudgetCounter } from '@/services/proxy/budget-check.service'

interface ProxyKey {
  id: string
  orgId: string
  isActive: boolean
}

/**
 * GET /api/cron/reconcile-budgets
 * Authorization: Bearer CRON_SECRET
 * Daily cron: recalculates Redis budget counters from proxy_logs for all active keys.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const keys = await bkendService.get<ProxyKey[]>('/proxy-keys', {
      params: { isActive: 'true' },
    })

    const results = await processBatch(
      keys,
      (key) => reconcileBudgetCounter(key.id, key.orgId),
      10,
    )

    const reconciled = results.filter((r) => r.status === 'fulfilled').length
    const failed = results.filter((r) => r.status === 'rejected').length

    return NextResponse.json({
      ok: true,
      reconciled,
      failed,
      total: keys.length,
    })
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to reconcile budgets', detail: String(err) },
      { status: 500 },
    )
  }
}
