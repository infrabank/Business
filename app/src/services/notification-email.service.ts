import type { EmailConfig, ChannelSendPayload, ChannelSendResult } from '@/types/notification'

const RESEND_API_KEY = process.env.RESEND_API_KEY || ''
const FROM_EMAIL = process.env.NOTIFICATION_FROM_EMAIL || 'LLM Cost Manager <noreply@llmcost.app>'

const ALERT_COLORS: Record<string, string> = {
  budget_warning: '#F59E0B',
  budget_exceeded: '#EF4444',
  anomaly: '#DC2626',
  optimization: '#3B82F6',
}

export async function sendEmail(
  config: EmailConfig,
  payload: ChannelSendPayload,
): Promise<ChannelSendResult> {
  if (!RESEND_API_KEY) {
    return { success: false, error: 'RESEND_API_KEY not configured' }
  }

  try {
    const html = buildEmailHtml(payload)
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: config.recipients,
        subject: `[LLM Cost] ${payload.alert.title}`,
        html,
      }),
    })

    if (res.ok) {
      return { success: true }
    }

    const body = await res.text()
    return { success: false, error: `Resend API ${res.status}: ${body}` }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

function buildEmailHtml(payload: ChannelSendPayload): string {
  const color = ALERT_COLORS[payload.alert.type] || '#6B7280'
  const typeLabel = payload.alert.type.replace(/_/g, ' ').toUpperCase()

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
      <div style="background:${color};padding:16px 24px;">
        <span style="color:#fff;font-size:12px;font-weight:600;letter-spacing:0.5px;">${typeLabel}</span>
      </div>
      <div style="padding:24px;">
        <h2 style="margin:0 0 8px;font-size:18px;color:#111827;">${payload.alert.title}</h2>
        <p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.6;">${payload.alert.message}</p>
        <a href="${payload.dashboardUrl}" style="display:inline-block;background:${color};color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:500;">
          대시보드에서 확인
        </a>
      </div>
      <div style="padding:16px 24px;border-top:1px solid #f3f4f6;font-size:12px;color:#9ca3af;">
        <p style="margin:0;">${payload.orgName} &middot; ${new Date(payload.alert.sentAt).toLocaleString('ko-KR')}</p>
        <p style="margin:8px 0 0;"><a href="${payload.dashboardUrl}/settings" style="color:#9ca3af;">알림 설정 변경 / 수신 거부</a></p>
      </div>
    </div>
  </div>
</body>
</html>`
}

export function buildDigestEmailHtml(
  alerts: Array<{ type: string; title: string; message: string; sentAt: string }>,
  orgName: string,
  dashboardUrl: string,
): string {
  const grouped: Record<string, number> = {}
  for (const a of alerts) {
    grouped[a.type] = (grouped[a.type] || 0) + 1
  }

  const summaryRows = Object.entries(grouped)
    .map(([type, count]) => {
      const color = ALERT_COLORS[type] || '#6B7280'
      return `<tr><td style="padding:6px 12px;"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};margin-right:8px;"></span>${type.replace(/_/g, ' ')}</td><td style="padding:6px 12px;text-align:right;font-weight:600;">${count}건</td></tr>`
    })
    .join('')

  const topAlerts = alerts.slice(0, 3).map((a) => {
    const color = ALERT_COLORS[a.type] || '#6B7280'
    return `<div style="padding:12px;border-left:3px solid ${color};background:#f9fafb;border-radius:0 8px 8px 0;margin-bottom:8px;">
      <p style="margin:0;font-size:14px;font-weight:500;color:#111827;">${a.title}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#6b7280;">${a.message}</p>
    </div>`
  }).join('')

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
      <div style="background:#1e293b;padding:16px 24px;">
        <span style="color:#fff;font-size:14px;font-weight:600;">${orgName} — 일별 알림 요약</span>
      </div>
      <div style="padding:24px;">
        <p style="margin:0 0 16px;font-size:14px;color:#6b7280;">어제 총 <strong>${alerts.length}건</strong>의 알림이 발생했습니다.</p>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">${summaryRows}</table>
        <h3 style="margin:0 0 12px;font-size:15px;color:#111827;">주요 알림</h3>
        ${topAlerts}
        <div style="margin-top:20px;">
          <a href="${dashboardUrl}/alerts" style="display:inline-block;background:#1e293b;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:500;">
            전체 알림 확인
          </a>
        </div>
      </div>
      <div style="padding:16px 24px;border-top:1px solid #f3f4f6;font-size:12px;color:#9ca3af;">
        <p style="margin:0;"><a href="${dashboardUrl}/settings" style="color:#9ca3af;">알림 설정 변경 / 수신 거부</a></p>
      </div>
    </div>
  </div>
</body>
</html>`
}
