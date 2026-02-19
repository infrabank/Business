import { NextRequest, NextResponse } from 'next/server'
import { bkendService } from '@/lib/bkend'
import { processBatch } from '@/lib/utils'
import { sendDigestForOrg } from '@/services/notification-digest.service'

interface OrgRecord {
  id: string
}

/**
 * GET /api/cron/send-digest?secret=CRON_SECRET
 * Daily cron (0 0 * * *): sends digest emails for all organizations.
 */
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const orgs = await bkendService.get<OrgRecord[]>('/organizations')

    const results = await processBatch(
      orgs,
      async (org) => {
        const result = await sendDigestForOrg(org.id, '')
        return result.sent
      },
      5,
    )

    let sent = 0
    let skipped = 0
    let failed = 0
    for (const r of results) {
      if (r.status === 'fulfilled') {
        if (r.value) sent++; else skipped++
      } else {
        failed++
      }
    }

    return NextResponse.json({ ok: true, sent, skipped, failed, orgs: orgs.length })
  } catch (err) {
    return NextResponse.json(
      { error: 'Digest send failed', detail: String(err) },
      { status: 500 },
    )
  }
}
