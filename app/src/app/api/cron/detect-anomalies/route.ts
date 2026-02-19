import { NextRequest, NextResponse } from 'next/server'
import { bkendService } from '@/lib/bkend'
import { processBatch } from '@/lib/utils'
import { detectAnomalies } from '@/services/anomaly.service'

interface OrgRecord {
  id: string
}

/**
 * GET /api/cron/detect-anomalies
 * Authorization: Bearer CRON_SECRET
 * Hourly cron: runs anomaly detection for all organizations.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const orgs = await bkendService.get<OrgRecord[]>('/organizations')

    const results = await processBatch(
      orgs,
      async (org) => {
        const events = await detectAnomalies(org.id, '')
        return events.length
      },
      5,
    )

    let detected = 0
    let failed = 0
    for (const r of results) {
      if (r.status === 'fulfilled') detected += r.value
      else failed++
    }

    return NextResponse.json({ ok: true, detected, failed, orgs: orgs.length })
  } catch (err) {
    return NextResponse.json(
      { error: 'Anomaly detection failed', detail: String(err) },
      { status: 500 },
    )
  }
}
