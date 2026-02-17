# Design: notifications

> 외부 알림 채널 - 이메일, Slack, Webhook을 통해 예산 경고, 이상 감지, 최적화 알림을 실시간 전달

## 1. Architecture Overview

```
Alert 생성 (budget.service / anomaly.service)
  ↓
notification.service.ts (라우팅 오케스트레이터)
  ├── 채널 조회 (notification-channels 컬렉션)
  ├── 알림 유형 + 심각도 필터링
  ├── DND / deliveryMode 확인
  └── 채널별 전송
       ├── notification-email.service.ts → Resend API
       ├── notification-slack.service.ts → Slack Incoming Webhook
       └── notification-webhook.service.ts → Custom HTTP POST
  ↓
notification-logs 컬렉션에 전송 결과 기록
```

### 핵심 설계 원칙
- **Adapter Pattern**: 각 채널(email, slack, webhook)은 동일 인터페이스의 어댑터로 구현
- **Fire-and-forget**: 알림 전송 실패가 원래 로직(budget/anomaly)을 blocking하지 않음
- **기존 패턴 일관성**: anomaly.service.ts, budget.service.ts와 동일한 bkend CRUD + Cron 패턴

## 2. Type Definitions

### 2.1 `src/types/notification.ts`

```typescript
import type { AlertType } from './alert'

// ---- Channel Types ----

export type ChannelType = 'email' | 'slack' | 'webhook'
export type DeliveryStatus = 'pending' | 'sent' | 'failed' | 'retrying'
export type DeliveryMode = 'instant' | 'digest' | 'both'

export interface EmailConfig {
  recipients: string[]
}

export interface SlackConfig {
  webhookUrl: string       // 암호화 저장 (encryption.service)
  channel?: string         // 표시용 채널명
}

export interface WebhookConfig {
  url: string
  headers?: Record<string, string>
  secret?: string          // HMAC-SHA256 서명용, 암호화 저장
}

export interface NotificationChannel {
  id: string
  orgId: string
  type: ChannelType
  name: string
  enabled: boolean
  config: EmailConfig | SlackConfig | WebhookConfig
  alertTypes: AlertType[]
  severityFilter?: ('warning' | 'critical')[]
  createdAt: string
  updatedAt: string
}

// ---- Preferences ----

export interface NotificationPreferences {
  id: string
  orgId: string
  enabled: boolean           // 전체 알림 on/off (DND)
  digestEnabled: boolean
  digestTime: string         // "09:00"
  timezone: string           // "Asia/Seoul"
  deliveryMode: DeliveryMode
  createdAt: string
  updatedAt: string
}

export const DEFAULT_NOTIFICATION_PREFERENCES: Omit<NotificationPreferences, 'id' | 'orgId'> = {
  enabled: true,
  digestEnabled: false,
  digestTime: '09:00',
  timezone: 'Asia/Seoul',
  deliveryMode: 'instant',
  createdAt: '',
  updatedAt: '',
}

// ---- Notification Log ----

export interface NotificationLog {
  id: string
  orgId: string
  alertId: string
  channelId: string
  channelType: ChannelType
  status: DeliveryStatus
  attempts: number
  lastAttemptAt: string
  error?: string
  sentAt?: string
  createdAt: string
}

// ---- Channel Adapter Interface ----

export interface ChannelSendPayload {
  alert: {
    id: string
    type: AlertType
    title: string
    message: string
    metadata?: Record<string, unknown>
    sentAt: string
  }
  orgName: string
  dashboardUrl: string
}

export interface ChannelSendResult {
  success: boolean
  error?: string
}
```

### 2.2 `src/types/index.ts` 수정

```typescript
// 기존 export에 추가
export type {
  NotificationChannel,
  NotificationPreferences,
  NotificationLog,
  ChannelType,
  DeliveryStatus,
  DeliveryMode,
  EmailConfig,
  SlackConfig,
  WebhookConfig,
  ChannelSendPayload,
  ChannelSendResult,
} from './notification'
```

## 3. Service Layer

### 3.1 `src/services/notification.service.ts` (핵심 오케스트레이터)

```typescript
import { bkend } from '@/lib/bkend'
import type { Alert, AlertType } from '@/types'
import type {
  NotificationChannel,
  NotificationPreferences,
  NotificationLog,
  ChannelSendPayload,
} from '@/types/notification'
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@/types/notification'
import { sendEmail } from './notification-email.service'
import { sendSlack } from './notification-slack.service'
import { sendWebhook } from './notification-webhook.service'

// ---- Preferences CRUD ----
// getPreferences(orgId, token): 기존 anomaly settings 패턴과 동일
// - bkend.get<NotificationPreferences[]>('/notification-preferences', {token, params: {orgId}})
// - 없으면 DEFAULT로 생성 (bkend.post)
// updatePreferences(prefsId, updates, token): bkend.patch

// ---- Channel CRUD ----
// getChannels(orgId, token): bkend.get<NotificationChannel[]>
// createChannel(orgId, channelData, token): bkend.post
//   - slack/webhook config의 url/secret은 encrypt() 후 저장
// updateChannel(channelId, updates, token): bkend.patch
// deleteChannel(channelId, token): bkend.delete
// testChannel(channel, token): 테스트 payload 전송

// ---- Core: 알림 전송 ----
export async function dispatchNotification(
  alert: Alert,
  orgId: string,
  token: string,
): Promise<void> {
  // 1. preferences 확인 → enabled=false면 중단
  // 2. deliveryMode='digest'면 즉시전송 스킵 (다이제스트에서 처리)
  // 3. getChannels → enabled=true 필터
  // 4. 각 채널의 alertTypes에 alert.type 포함 여부 확인
  // 5. severityFilter 확인 (alert.metadata?.severity)
  // 6. 채널 타입별 어댑터 호출:
  //    - 'email' → sendEmail(config, payload)
  //    - 'slack' → sendSlack(config, payload)
  //    - 'webhook' → sendWebhook(config, payload)
  // 7. NotificationLog 생성 (성공/실패)
  // 8. 실패 시 재시도: 최대 3회, 지수 백오프 (1s, 4s, 16s)
}

// ---- Log 조회 ----
// getLogs(orgId, token, days=30): bkend.get<NotificationLog[]>
// retryNotification(logId, token): 실패 건 재전송
```

**dispatchNotification 상세 흐름:**

```
dispatchNotification(alert, orgId, token)
  │
  ├── getPreferences(orgId) → enabled? deliveryMode?
  │   └── !enabled || deliveryMode === 'digest' → return
  │
  ├── getChannels(orgId) → filter(enabled && alertTypes.includes(alert.type))
  │
  └── for each channel:
      ├── check severityFilter (if set)
      ├── build ChannelSendPayload
      ├── decrypt config secrets
      ├── channel.type === 'email' → sendEmail()
      │   channel.type === 'slack' → sendSlack()
      │   channel.type === 'webhook' → sendWebhook()
      └── bkend.post('/notification-logs', { status, attempts, error? })
```

### 3.2 `src/services/notification-email.service.ts`

```typescript
import type { EmailConfig, ChannelSendPayload, ChannelSendResult } from '@/types/notification'

const RESEND_API_KEY = process.env.RESEND_API_KEY || ''
const FROM_EMAIL = process.env.NOTIFICATION_FROM_EMAIL || 'noreply@llmcost.app'

export async function sendEmail(
  config: EmailConfig,
  payload: ChannelSendPayload,
): Promise<ChannelSendResult> {
  // Resend API: POST https://api.resend.com/emails
  // Headers: Authorization: Bearer RESEND_API_KEY
  // Body: { from, to: config.recipients, subject, html }
  //
  // HTML 템플릿:
  //   - 알림 유형별 배경 색상 (budget=amber, anomaly=red, optimization=blue)
  //   - 제목, 메시지, 금액 정보
  //   - "대시보드에서 확인" CTA 버튼 → payload.dashboardUrl
  //   - 하단: 수신 거부 링크
  //
  // fetch('https://api.resend.com/emails', { method: 'POST', ... })
  // 200 → { success: true }
  // 그 외 → { success: false, error: response.statusText }
}

function buildEmailHtml(payload: ChannelSendPayload): string {
  // 인라인 CSS HTML 템플릿 반환
  // 알림 유형별 색상: budget_warning=#F59E0B, budget_exceeded=#EF4444,
  //                   anomaly=#DC2626, optimization=#3B82F6
}
```

### 3.3 `src/services/notification-slack.service.ts`

```typescript
import type { SlackConfig, ChannelSendPayload, ChannelSendResult } from '@/types/notification'
import { decrypt } from './encryption.service'

export async function sendSlack(
  config: SlackConfig,
  payload: ChannelSendPayload,
): Promise<ChannelSendResult> {
  // Slack Incoming Webhook: POST config.webhookUrl
  // Body: Block Kit JSON
  //
  // blocks:
  //   - header: 알림 유형 이모지 + 제목
  //   - section: 메시지 내용 (mrkdwn)
  //   - context: 조직명, 시각
  //   - actions: "대시보드에서 확인" 버튼 → payload.dashboardUrl
  //
  // attachments.color:
  //   budget_warning="#F59E0B", budget_exceeded="#EF4444",
  //   anomaly="#DC2626", optimization="#3B82F6"
  //
  // webhookUrl은 decrypt() 후 사용
}

const ALERT_EMOJI: Record<string, string> = {
  budget_warning: '⚠️',
  budget_exceeded: '🚨',
  anomaly: '📊',
  optimization: '💡',
}
```

### 3.4 `src/services/notification-webhook.service.ts`

```typescript
import type { WebhookConfig, ChannelSendPayload, ChannelSendResult } from '@/types/notification'
import { decrypt } from './encryption.service'
import { createHmac } from 'crypto'

export async function sendWebhook(
  config: WebhookConfig,
  payload: ChannelSendPayload,
): Promise<ChannelSendResult> {
  // POST config.url
  // Headers:
  //   - Content-Type: application/json
  //   - config.headers (decrypt values)
  //   - X-LLMCost-Signature: HMAC-SHA256(body, config.secret) (if secret)
  //
  // Body: JSON
  //   {
  //     event: "alert.created",
  //     alert: payload.alert,
  //     org: payload.orgName,
  //     timestamp: new Date().toISOString()
  //   }
  //
  // 타임아웃: 5초 (AbortController)
  // 응답 2xx → success
  // 그 외 → failure
}

function signPayload(body: string, secret: string): string {
  return createHmac('sha256', secret).update(body).digest('hex')
}
```

### 3.5 `src/services/notification-digest.service.ts`

```typescript
import { bkend, bkendService } from '@/lib/bkend'
import type { Alert } from '@/types'
import type { NotificationPreferences, NotificationChannel, EmailConfig } from '@/types/notification'
import { sendEmail } from './notification-email.service'

export async function sendDigestForOrg(
  orgId: string,
  token: string,
): Promise<{ sent: boolean; alertCount: number }> {
  // 1. getPreferences → digestEnabled? deliveryMode in ['digest','both']?
  // 2. 전일 24시간 알림 조회: bkend.get<Alert[]>('/alerts', { orgId, sentAt_gte })
  // 3. alertCount === 0 → skip
  // 4. 다이제스트 이메일 빌드:
  //    - 유형별 그룹핑 (budget: N건, anomaly: M건 ...)
  //    - 상위 3건 하이라이트
  //    - 총 비용 변화 요약
  // 5. 이메일 채널에서 recipients 가져오기
  // 6. sendEmail(emailConfig, digestPayload)
  // 7. NotificationLog 생성
}

function buildDigestHtml(
  alerts: Alert[],
  orgName: string,
  dashboardUrl: string,
): string {
  // 다이제스트 전용 HTML 템플릿
  // - 헤더: "{orgName} 일별 알림 요약"
  // - 유형별 카운트 표
  // - 상위 3건 상세
  // - CTA: "대시보드에서 전체 확인"
}
```

## 4. API Routes

### 4.1 `src/app/api/notifications/channels/route.ts`

```typescript
// GET: 채널 목록 조회
//   - getMeServer() → orgId from query
//   - getChannels(orgId, token)
//   - config 내 민감 정보 마스킹 (webhookUrl → "https://hooks...****")

// POST: 채널 등록
//   - getMeServer() → orgId from body
//   - Free 플랜: isFeatureAvailable(plan, 'notifications') 체크
//     - Free는 email 1개만 허용
//   - slack/webhook config 내 url/secret → encrypt() 후 저장
//   - bkend.post<NotificationChannel>('/notification-channels', ...)
```

### 4.2 `src/app/api/notifications/channels/[id]/route.ts`

```typescript
// PATCH: 채널 수정
//   - getMeServer()
//   - config 변경 시 encrypt() 적용
//   - bkend.patch('/notification-channels/{id}', ...)

// DELETE: 채널 삭제
//   - getMeServer()
//   - bkend.delete('/notification-channels/{id}', ...)
```

### 4.3 `src/app/api/notifications/channels/[id]/test/route.ts`

```typescript
// POST: 테스트 메시지 전송
//   - getMeServer()
//   - 채널 조회 → config decrypt
//   - 테스트 payload 생성 (type: 'budget_warning', title: '테스트 알림')
//   - 채널 타입별 전송 함수 호출
//   - 결과 반환 { success, error? }
```

### 4.4 `src/app/api/notifications/preferences/route.ts`

```typescript
// GET: 알림 설정 조회
//   - getMeServer() → orgId
//   - getPreferences(orgId, token)

// PATCH: 알림 설정 수정
//   - getMeServer()
//   - updatePreferences(prefsId, updates, token)
```

### 4.5 `src/app/api/notifications/logs/route.ts`

```typescript
// GET: 전송 이력 조회
//   - getMeServer() → orgId
//   - query params: days (default 30)
//   - getLogs(orgId, token, days)
```

### 4.6 `src/app/api/cron/send-digest/route.ts`

```typescript
// GET /api/cron/send-digest?secret=CRON_SECRET
//   - CRON_SECRET 인증 (기존 detect-anomalies 패턴)
//   - bkendService.get<OrgRecord[]>('/organizations')
//   - for each org: sendDigestForOrg(orgId, '')
//   - 결과 집계: { ok, sent, skipped, failed }
```

## 5. Alert Integration (기존 서비스 수정)

### 5.1 `src/services/budget.service.ts` 수정

```typescript
// checkBudgetThresholds() 내 알림 생성 후:
import { dispatchNotification } from './notification.service'

// 기존 코드: const alert = await bkend.post<Alert>('/alerts', {...}, {token})
// 추가:
try {
  await dispatchNotification(alert, orgId, token)
} catch {
  // 전송 실패해도 alert 생성은 유지 (fire-and-forget)
}
```

### 5.2 `src/services/anomaly.service.ts` 수정

```typescript
// detectAnomalies() 내 알림 생성 후:
import { dispatchNotification } from './notification.service'

// 기존 코드: const alert = await bkend.post<Alert>('/alerts', {...}, {token})
// 추가:
try {
  await dispatchNotification(alert, orgId, token)
} catch {
  // fire-and-forget
}
```

## 6. UI Components

### 6.1 `src/features/notifications/components/ChannelManager.tsx`

```
┌─────────────────────────────────────────────────────┐
│ 알림 채널                                    [+ 추가] │
├─────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────┐ │
│ │ 📧 팀 이메일              [활성]  [테스트] [삭제] │ │
│ │    admin@company.com, dev@company.com            │ │
│ │    수신: 예산경고, 이상감지  │  심각도: 전체       │ │
│ └─────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 💬 개발팀 Slack            [활성]  [테스트] [삭제] │ │
│ │    #cost-alerts                                  │ │
│ │    수신: 전체  │  심각도: critical만               │ │
│ └─────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 🔗 PagerDuty Webhook      [비활성] [테스트] [삭제]│ │
│ │    https://events.pagerduty.com/...              │ │
│ │    수신: 예산초과, 이상감지  │  심각도: critical만 │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ⚡ Free 플랜: 이메일 1채널만 사용 가능               │
│    Growth로 업그레이드하면 무제한 채널 [업그레이드]    │
└─────────────────────────────────────────────────────┘
```

**구현 세부:**
- `'use client'` 컴포넌트
- `useNotificationChannels(orgId)` hook 사용
- 채널 추가 시 모달: 타입 선택 → 설정 입력 → 알림 유형 선택 → 생성
- 테스트 버튼: POST `/api/notifications/channels/[id]/test` 호출, Toast로 결과 표시
- Free 플랜 게이트: `isFeatureAvailable(plan, 'notifications')` → 업그레이드 유도
- lucide-react 아이콘: Mail, MessageSquare, Webhook, Plus, Trash2, Send

### 6.2 `src/features/notifications/components/NotificationSettings.tsx`

```
┌─────────────────────────────────────────────────────┐
│ 알림 설정                                           │
├─────────────────────────────────────────────────────┤
│                                                     │
│ 알림 수신          [━━━━━━●] ON                     │
│                                                     │
│ 전송 모드                                           │
│ ○ 즉시 전송   ○ 다이제스트만   ● 즉시 + 다이제스트   │
│                                                     │
│ 일별 다이제스트    [━━━━━━●] ON         (Growth)     │
│ 발송 시간          [09:00]                          │
│ 타임존            [Asia/Seoul     ▼]                │
│                                                     │
│                                    [설정 저장]       │
├─────────────────────────────────────────────────────┤
│ 최근 전송 이력                                      │
├─────────────────────────────────────────────────────┤
│ 📧 팀 이메일  │ Budget at 80%    │ ✅ 성공 │ 10분 전 │
│ 💬 Slack     │ 일별 비용 이상    │ ✅ 성공 │ 1시간 전│
│ 🔗 Webhook   │ Budget exceeded  │ ❌ 실패 │ 2시간 전│
│                                          [재전송]   │
│                                                     │
│                        [전체 이력 보기 (최근 30일)]   │
└─────────────────────────────────────────────────────┘
```

**구현 세부:**
- `'use client'` 컴포넌트
- `useNotificationSettings(orgId)` hook: preferences + logs 통합
- deliveryMode 라디오 버튼 그룹
- digestEnabled, digestTime, timezone 필드
- Growth 플랜 게이트: 다이제스트 관련 설정은 Growth만
- 전송 이력 목록: 최근 10건, 실패 건에 재전송 버튼
- Badge 컴포넌트: success='성공', danger='실패', warning='재시도 중'

### 6.3 Settings 페이지 통합

`src/app/(dashboard)/settings/page.tsx`에 새 Card 섹션 추가:

```typescript
// 기존 "팀 관리" Card 아래, "구독" Card 위에 삽입
<Card>
  <CardHeader>
    <h2 className="text-lg font-semibold text-gray-900">알림 채널</h2>
  </CardHeader>
  <CardContent>
    <ChannelManager orgId={orgId} plan={plan} />
    <NotificationSettings orgId={orgId} plan={plan} />
  </CardContent>
</Card>
```

## 7. Hooks

### 7.1 `src/features/notifications/hooks/useNotificationChannels.ts`

```typescript
'use client'
import { useState, useEffect, useCallback } from 'react'
import type { NotificationChannel } from '@/types/notification'

export function useNotificationChannels(orgId?: string | null) {
  // channels: NotificationChannel[]
  // isLoading: boolean
  // createChannel(data): POST /api/notifications/channels
  // updateChannel(id, data): PATCH /api/notifications/channels/[id]
  // deleteChannel(id): DELETE /api/notifications/channels/[id]
  // testChannel(id): POST /api/notifications/channels/[id]/test
  // refetch()
}
```

### 7.2 `src/features/notifications/hooks/useNotificationSettings.ts`

```typescript
'use client'
import { useState, useEffect, useCallback } from 'react'
import type { NotificationPreferences, NotificationLog } from '@/types/notification'

export function useNotificationSettings(orgId?: string | null) {
  // preferences: NotificationPreferences | null
  // logs: NotificationLog[]
  // isLoading: boolean
  // updatePreferences(updates): PATCH /api/notifications/preferences
  // retryLog(logId): POST /api/notifications/send (재전송)
  // refetch()
}
```

## 8. Environment Variables

```env
# Resend API (이메일 발송)
RESEND_API_KEY=re_xxxxxxxxxx
NOTIFICATION_FROM_EMAIL=noreply@llmcost.app

# App URL (이메일 내 CTA 링크)
NEXT_PUBLIC_APP_URL=https://app.llmcost.app
```

## 9. Plan Limits 수정

### 9.1 `src/lib/plan-limits.ts` 수정

```typescript
// isFeatureAvailable에 'notifications' 추가
feature: 'optimization' | 'analytics' | 'export' | 'team' | 'budget_alerts' | 'anomaly_detection' | 'notifications'

// Free: email 1채널만, 다이제스트 불가
// Growth: 무제한 채널, 다이제스트 가능
```

## 10. Vercel Cron 수정

### 10.1 `vercel.json` 수정

```json
{
  "crons": [
    { "path": "/api/sync/schedule", "schedule": "0 3 * * *" },
    { "path": "/api/cron/report-usage", "schedule": "0 0 1 * *" },
    { "path": "/api/cron/detect-anomalies", "schedule": "0 * * * *" },
    { "path": "/api/cron/send-digest", "schedule": "0 0 * * *" }
  ]
}
```

## 11. Security Considerations

| 항목 | 대응 |
|------|------|
| Slack Webhook URL 보호 | encrypt() 후 DB 저장, API 응답 시 마스킹 |
| Custom Webhook secret | encrypt() 후 DB 저장 |
| Custom Webhook headers | encrypt() 후 DB 저장 (Bearer token 등) |
| HMAC 서명 | X-LLMCost-Signature 헤더로 payload 무결성 보장 |
| Resend API Key | 환경변수 (RESEND_API_KEY), 서버 사이드 only |
| 수신거부 | 이메일에 unsubscribe 링크 필수 포함 |
| Rate limiting | 동일 alertId 24시간 내 중복 전송 방지 |

## 12. Implementation Order

```
Phase 1: Data Layer
  1. src/types/notification.ts (타입 + 상수 정의)
  2. src/types/index.ts (export 추가)
  3. src/services/notification-email.service.ts (Resend API)
  4. src/services/notification-slack.service.ts (Slack Webhook)
  5. src/services/notification-webhook.service.ts (Custom Webhook)
  6. src/services/notification.service.ts (오케스트레이터)

Phase 2: APIs
  7. src/app/api/notifications/channels/route.ts (GET/POST)
  8. src/app/api/notifications/channels/[id]/route.ts (PATCH/DELETE)
  9. src/app/api/notifications/channels/[id]/test/route.ts (POST)
  10. src/app/api/notifications/preferences/route.ts (GET/PATCH)
  11. src/app/api/notifications/logs/route.ts (GET)

Phase 3: Alert Integration
  12. src/services/budget.service.ts (dispatchNotification 추가)
  13. src/services/anomaly.service.ts (dispatchNotification 추가)
  14. src/lib/plan-limits.ts ('notifications' 추가)

Phase 4: Digest + Cron
  15. src/services/notification-digest.service.ts
  16. src/app/api/cron/send-digest/route.ts
  17. vercel.json (cron 추가)

Phase 5: UI
  18. src/features/notifications/hooks/useNotificationChannels.ts
  19. src/features/notifications/hooks/useNotificationSettings.ts
  20. src/features/notifications/components/ChannelManager.tsx
  21. src/features/notifications/components/NotificationSettings.tsx
  22. src/app/(dashboard)/settings/page.tsx (통합)
```

## 13. File Summary

### New Files (16)
| # | File | LOC est. |
|---|------|----------|
| 1 | `src/types/notification.ts` | ~80 |
| 2 | `src/services/notification.service.ts` | ~180 |
| 3 | `src/services/notification-email.service.ts` | ~100 |
| 4 | `src/services/notification-slack.service.ts` | ~80 |
| 5 | `src/services/notification-webhook.service.ts` | ~70 |
| 6 | `src/services/notification-digest.service.ts` | ~120 |
| 7 | `src/app/api/notifications/channels/route.ts` | ~80 |
| 8 | `src/app/api/notifications/channels/[id]/route.ts` | ~60 |
| 9 | `src/app/api/notifications/channels/[id]/test/route.ts` | ~50 |
| 10 | `src/app/api/notifications/preferences/route.ts` | ~60 |
| 11 | `src/app/api/notifications/logs/route.ts` | ~40 |
| 12 | `src/app/api/cron/send-digest/route.ts` | ~50 |
| 13 | `src/features/notifications/hooks/useNotificationChannels.ts` | ~80 |
| 14 | `src/features/notifications/hooks/useNotificationSettings.ts` | ~70 |
| 15 | `src/features/notifications/components/ChannelManager.tsx` | ~250 |
| 16 | `src/features/notifications/components/NotificationSettings.tsx` | ~200 |

### Modified Files (5)
| # | File | Change |
|---|------|--------|
| 1 | `src/types/index.ts` | notification 타입 export 추가 |
| 2 | `src/services/budget.service.ts` | dispatchNotification 호출 추가 |
| 3 | `src/services/anomaly.service.ts` | dispatchNotification 호출 추가 |
| 4 | `src/lib/plan-limits.ts` | 'notifications' feature 추가 |
| 5 | `vercel.json` | send-digest cron 추가 |
| 6 | `src/app/(dashboard)/settings/page.tsx` | 알림 채널 섹션 추가 |

**Total: 16 new + 6 modified = 22 files, ~1,570 LOC estimated**
