import { NextRequest, NextResponse } from 'next/server'
import { bkendService } from '@/lib/bkend'
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
    let sent = 0
    let skipped = 0
    let failed = 0

    for (const org of orgs) {
      try {
        const result = await sendDigestForOrg(org.id, '')
        if (result.sent) {
          sent++
        } else {
          skipped++
        }
      } catch {
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
