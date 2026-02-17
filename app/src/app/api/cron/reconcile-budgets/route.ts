import { NextRequest, NextResponse } from 'next/server'
import { bkendService } from '@/lib/bkend'
import { reconcileBudgetCounter } from '@/services/proxy/budget-check.service'

interface ProxyKey {
  id: string
  orgId: string
  isActive: boolean
}

/**
 * GET /api/cron/reconcile-budgets?secret=CRON_SECRET
 * Daily cron: recalculates Redis budget counters from proxy_logs for all active keys.
 */
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const keys = await bkendService.get<ProxyKey[]>('/proxy-keys', {
      params: { isActive: 'true' },
    })

    let reconciled = 0
    let failed = 0

    for (const key of keys) {
      try {
        await reconcileBudgetCounter(key.id, key.orgId)
        reconciled++
      } catch {
        failed++
      }
    }

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
