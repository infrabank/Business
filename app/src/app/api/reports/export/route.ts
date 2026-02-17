import { NextRequest, NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { bkend } from '@/lib/bkend'
import { checkHistoryLimit, isFeatureAvailable } from '@/lib/plan-limits'
import { generateCsv, generateJson, getReportSummary } from '@/services/report.service'
import { buildPdfReport } from '@/services/report-pdf.service'
import type { UsageRecord, User, UserPlan, Organization } from '@/types'
import type { ReportFormat } from '@/types/report'

export async function GET(req: NextRequest) {
  let authUser
  try {
    authUser = await getMeServer()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const orgId = req.nextUrl.searchParams.get('orgId')
  const format = (req.nextUrl.searchParams.get('format') || 'csv') as ReportFormat
  const from = req.nextUrl.searchParams.get('from')
  const to = req.nextUrl.searchParams.get('to')
  // Legacy support: period param (e.g., "2026-01")
  const period = req.nextUrl.searchParams.get('period')

  if (!orgId) {
    return NextResponse.json({ error: 'orgId is required' }, { status: 400 })
  }

  try {
    const user = await bkend.get<User>(`/users/${authUser.id}`)
    const rawPlan = user.plan || 'free'
    const plan: UserPlan = rawPlan === 'free' ? 'free' : 'growth'
    const { maxDays } = checkHistoryLimit(plan)

    // Free plan: CSV only
    if (!isFeatureAvailable(plan, 'export') && format !== 'csv') {
      return NextResponse.json(
        { error: 'JSON and PDF export requires Growth plan', planRequired: 'growth' },
        { status: 403 },
      )
    }

    // Resolve date range
    let dateFrom: string
    let dateTo: string

    if (from && to) {
      dateFrom = from
      dateTo = to
    } else if (period) {
      // Legacy: "2026-01" → first/last day of month
      const [y, m] = period.split('-').map(Number)
      dateFrom = `${period}-01`
      const lastDay = new Date(y, m, 0).getDate()
      dateTo = `${period}-${String(lastDay).padStart(2, '0')}`
    } else {
      // Default: last N days based on plan
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - Math.min(maxDays, 30))
      dateFrom = start.toISOString().split('T')[0]
      dateTo = end.toISOString().split('T')[0]
    }

    // Validate range against plan limits
    const daysDiff = Math.ceil(
      (new Date(dateTo).getTime() - new Date(dateFrom).getTime()) / (1000 * 60 * 60 * 24),
    ) + 1
    if (daysDiff > maxDays) {
      return NextResponse.json(
        { error: `Your plan allows up to ${maxDays} days. Upgrade for more.`, planRequired: 'growth' },
        { status: 403 },
      )
    }

    const params: Record<string, string> = { orgId, date_gte: dateFrom, date_lte: dateTo }
    const records = await bkend.get<UsageRecord[]>('/usage-records', { params })
    const filename = `report-${dateFrom}-${dateTo}`

    if (format === 'csv') {
      const csv = generateCsv(records)
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}.csv"`,
        },
      })
    }

    const token = ''
    const summary = await getReportSummary(orgId, dateFrom, dateTo, token)

    if (format === 'json') {
      const json = generateJson(summary, records)
      return new NextResponse(json, {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}.json"`,
        },
      })
    }

    if (format === 'pdf') {
      const orgs = await bkend.get<Organization[]>('/organizations', { params: { id: orgId } }).catch(() => [])
      const orgName = orgs[0]?.name || 'Organization'
      const pdfBytes = await buildPdfReport(summary, orgName)
      return new Response(pdfBytes.buffer as ArrayBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}.pdf"`,
        },
      })
    }

    return NextResponse.json({ error: 'Unsupported format' }, { status: 400 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Export failed' },
      { status: 500 },
    )
  }
}
