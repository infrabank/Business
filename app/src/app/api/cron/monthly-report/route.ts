import { NextRequest, NextResponse } from 'next/server'
import { bkend } from '@/lib/bkend'
import { getReportSummary } from '@/services/report.service'
import type { User, Organization } from '@/types'
import type { NotificationChannel, EmailConfig } from '@/types/notification'

const CRON_SECRET = process.env.CRON_SECRET || ''
const RESEND_API_KEY = process.env.RESEND_API_KEY || ''
const FROM_EMAIL = process.env.NOTIFICATION_FROM_EMAIL || 'LLM Cost Manager <noreply@llmcost.app>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://llmcost.app'

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (!CRON_SECRET || secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!RESEND_API_KEY) {
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })
  }

  try {
    // Get all growth plan users
    const users = await bkend.get<User[]>('/users', { params: { plan: 'growth' } }).catch(() => [] as User[])

    let sent = 0
    let skipped = 0
    let failed = 0

    // Previous month range
    const now = new Date()
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0).getDate()
    const from = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}-01`
    const to = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    const monthLabel = `${prevMonth.getFullYear()}년 ${prevMonth.getMonth() + 1}월`

    for (const user of users) {
      try {
        // Find user's org
        const orgs = await bkend.get<Organization[]>('/organizations', {
          params: { ownerId: user.id },
        })
        if (orgs.length === 0) { skipped++; continue }
        const org = orgs[0]

        // Find email notification channel
        const channels = await bkend.get<NotificationChannel[]>('/notification-channels', {
          params: { orgId: org.id, type: 'email', enabled: 'true' },
        }).catch(() => [] as NotificationChannel[])

        const emailChannel = channels[0]
        const emailConfig = emailChannel?.config as EmailConfig | undefined
        if (!emailChannel || !emailConfig?.recipients?.length) { skipped++; continue }

        // Generate summary
        const token = ''
        const summary = await getReportSummary(org.id, from, to, token)

        // Build email HTML
        const html = buildMonthlyReportHtml(summary, org.name, monthLabel)

        // Send via Resend
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: emailConfig.recipients,
            subject: `[LLM Cost] ${monthLabel} 월간 비용 리포트`,
            html,
          }),
        })

        if (res.ok) { sent++ } else { failed++ }
      } catch {
        failed++
      }
    }

    return NextResponse.json({ ok: true, sent, skipped, failed })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Cron failed' },
      { status: 500 },
    )
  }
}

function buildMonthlyReportHtml(
  summary: { overview: { totalCost: number; totalTokens: number; totalRequests: number; dailyAverage: number; changePercent: number }; byProvider: Array<{ type: string; cost: number; percentage: number }> },
  orgName: string,
  monthLabel: string,
): string {
  const changeColor = summary.overview.changePercent > 0 ? '#EF4444' : '#10B981'
  const changeSign = summary.overview.changePercent >= 0 ? '+' : ''

  const providerRows = summary.byProvider
    .slice(0, 5)
    .map((p) => `<tr><td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;">${p.type}</td><td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;text-align:right;">$${p.cost.toFixed(2)}</td><td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;text-align:right;">${p.percentage.toFixed(1)}%</td></tr>`)
    .join('')

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
      <div style="background:#1e293b;padding:20px 24px;">
        <h1 style="margin:0;color:#fff;font-size:16px;font-weight:600;">${orgName} — ${monthLabel} 월간 리포트</h1>
      </div>
      <div style="padding:24px;">
        <div style="display:flex;gap:16px;margin-bottom:24px;">
          <div style="flex:1;background:#f8fafc;border-radius:8px;padding:16px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#6b7280;">총 비용</p>
            <p style="margin:4px 0 0;font-size:24px;font-weight:700;color:#111827;">$${summary.overview.totalCost.toFixed(2)}</p>
            <p style="margin:4px 0 0;font-size:12px;color:${changeColor};">${changeSign}${summary.overview.changePercent.toFixed(1)}% vs 전월</p>
          </div>
        </div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
          <tr style="background:#f8fafc;"><td style="padding:8px 12px;font-size:13px;color:#6b7280;">총 토큰</td><td style="padding:8px 12px;text-align:right;font-weight:600;">${summary.overview.totalTokens.toLocaleString()}</td></tr>
          <tr><td style="padding:8px 12px;font-size:13px;color:#6b7280;">총 요청</td><td style="padding:8px 12px;text-align:right;font-weight:600;">${summary.overview.totalRequests.toLocaleString()}</td></tr>
          <tr style="background:#f8fafc;"><td style="padding:8px 12px;font-size:13px;color:#6b7280;">일 평균</td><td style="padding:8px 12px;text-align:right;font-weight:600;">$${summary.overview.dailyAverage.toFixed(2)}</td></tr>
        </table>
        ${providerRows ? `<h3 style="margin:20px 0 8px;font-size:14px;color:#111827;">프로바이더별 비용</h3><table style="width:100%;border-collapse:collapse;"><thead><tr style="background:#f8fafc;"><th style="padding:8px 12px;text-align:left;font-size:12px;color:#6b7280;">Provider</th><th style="padding:8px 12px;text-align:right;font-size:12px;color:#6b7280;">Cost</th><th style="padding:8px 12px;text-align:right;font-size:12px;color:#6b7280;">Share</th></tr></thead><tbody>${providerRows}</tbody></table>` : ''}
        <div style="margin-top:24px;">
          <a href="${APP_URL}/reports" style="display:inline-block;background:#1e293b;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:500;">상세 리포트 보기</a>
        </div>
      </div>
      <div style="padding:16px 24px;border-top:1px solid #f3f4f6;font-size:12px;color:#9ca3af;">
        <p style="margin:0;">LLM Cost Manager &middot; <a href="${APP_URL}/settings" style="color:#9ca3af;">수신 설정 변경</a></p>
      </div>
    </div>
  </div>
</body>
</html>`
}
