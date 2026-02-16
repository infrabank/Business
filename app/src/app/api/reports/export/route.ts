import { NextRequest, NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { bkend } from '@/lib/bkend'
import type { UsageRecord } from '@/types'

export async function GET(req: NextRequest) {
  try {
    await getMeServer()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const orgId = req.nextUrl.searchParams.get('orgId')
  const format = req.nextUrl.searchParams.get('format') || 'csv'
  const from = req.nextUrl.searchParams.get('from')
  const to = req.nextUrl.searchParams.get('to')

  if (!orgId) {
    return NextResponse.json({ error: 'orgId is required' }, { status: 400 })
  }

  try {
    const params: Record<string, string> = { orgId }
    if (from) params.date_gte = from
    if (to) params.date_lte = to

    const records = await bkend.get<UsageRecord[]>('/usage-records', { params })

    if (format === 'csv') {
      const header = 'Date,Provider,Model,Input Tokens,Output Tokens,Total Tokens,Cost,Requests'
      const rows = records.map((r) =>
        `${r.date},${r.providerType},${r.model},${r.inputTokens},${r.outputTokens},${r.totalTokens},${r.cost.toFixed(4)},${r.requestCount}`
      )
      const csv = [header, ...rows].join('\n')

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="usage-report-${orgId}.csv"`,
        },
      })
    }

    return NextResponse.json(records)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Export failed' },
      { status: 500 },
    )
  }
}
