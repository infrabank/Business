import { NextRequest, NextResponse } from 'next/server'
import { bkendService } from '@/lib/bkend'
import { detectAnomalies } from '@/services/anomaly.service'

interface OrgRecord {
  id: string
}

/**
 * GET /api/cron/detect-anomalies?secret=CRON_SECRET
 * Hourly cron: runs anomaly detection for all organizations.
 */
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const orgs = await bkendService.get<OrgRecord[]>('/organizations')
    let detected = 0
    let failed = 0

    for (const org of orgs) {
      try {
        const events = await detectAnomalies(org.id, '')
        detected += events.length
      } catch {
        failed++
      }
    }

    return NextResponse.json({ ok: true, detected, failed, orgs: orgs.length })
  } catch (err) {
    return NextResponse.json(
      { error: 'Anomaly detection failed', detail: String(err) },
      { status: 500 },
    )
  }
}
