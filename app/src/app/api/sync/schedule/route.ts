import { NextRequest, NextResponse } from 'next/server'
import { bkend } from '@/lib/bkend'
import { syncProviderUsage } from '@/services/usage-sync.service'
import { checkBudgetThresholds } from '@/services/budget.service'
import type { Organization } from '@/types'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const orgs = await bkend.get<Organization[]>('/organizations', {
      params: { isActive: 'true' },
    })

    const results: Array<{ orgId: string; syncCount: number; alertCount: number; errors: string[] }> = []

    for (const org of orgs) {
      const errors: string[] = []

      try {
        const syncResults = await syncProviderUsage({
          orgId: org.id,
          token: process.env.BKEND_SERVICE_TOKEN || '',
          syncType: 'scheduled',
        })

        const failedSyncs = syncResults.filter((r) => r.status === 'failed')
        for (const f of failedSyncs) {
          errors.push(`${f.providerType}: ${f.error}`)
        }

        const alerts = await checkBudgetThresholds(org.id, process.env.BKEND_SERVICE_TOKEN || '')

        results.push({
          orgId: org.id,
          syncCount: syncResults.filter((r) => r.status === 'success').length,
          alertCount: alerts.length,
          errors,
        })
      } catch (err) {
        results.push({
          orgId: org.id,
          syncCount: 0,
          alertCount: 0,
          errors: [err instanceof Error ? err.message : 'Unknown error'],
        })
      }
    }

    return NextResponse.json({
      scheduledAt: new Date().toISOString(),
      orgsProcessed: results.length,
      results,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Scheduled sync failed' },
      { status: 500 },
    )
  }
}
